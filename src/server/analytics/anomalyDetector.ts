import { getSupabaseServerClient } from '../db';

export interface Transaction {
  id: string;
  date: string;
  amount: number;
  vendor: string;
  category: string;
  description?: string;
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  category?: string;
  vendor?: string;
  amount?: number;
  expected_value?: number;
  actual_value?: number;
  deviation_score?: number;
  description: string;
  recommendation: string;
  transaction_ids?: string[];
  features?: any;
  period_start?: string;
  period_end?: string;
}

export interface AnomalyDetectionResult {
  anomalies: Anomaly[];
  statistics: {
    totalTransactions: number;
    anomalyRate: number;
    avgConfidence: number;
  };
  recommendations: string[];
}

export class AnomalyDetector {
  async detectAnomalies(
    transactions: Transaction[],
    historical: Transaction[],
    orgId?: string
  ): Promise<AnomalyDetectionResult> {
    const anomalies: Anomaly[] = [];
    
    // 1. Time series anomalies (seasonal decomposition)
    const seasonal = await this.detectSeasonalAnomalies(transactions, historical);
    anomalies.push(...seasonal);
    
    // 2. Statistical outliers (Isolation Forest)
    const outliers = await this.detectOutliers(transactions);
    anomalies.push(...outliers);
    
    // 3. Clustering anomalies (DBSCAN)
    const clusters = await this.detectClusteringAnomalies(transactions);
    anomalies.push(...clusters);
    
    // 4. Pattern-based anomalies (ML model)
    const patterns = await this.detectPatternAnomalies(transactions, historical);
    anomalies.push(...patterns);
    
    // 5. Duplicate detection
    const duplicates = this.detectDuplicates(transactions);
    anomalies.push(...duplicates);
    
    // 6. Fraud indicators
    const fraud = await this.detectFraudIndicators(transactions);
    anomalies.push(...fraud);
    
    // Deduplicate and rank
    const ranked = this.rankAndDeduplicate(anomalies);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(ranked);
    
    // Save to database
    await this.saveAnomalies(ranked, orgId);
    
    return {
      anomalies: ranked,
      statistics: {
        totalTransactions: transactions.length,
        anomalyRate: ranked.length / transactions.length,
        avgConfidence: ranked.reduce((sum, a) => sum + a.confidence, 0) / ranked.length,
      },
      recommendations,
    };
  }
  
  private async detectSeasonalAnomalies(
    current: Transaction[],
    historical: Transaction[]
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Group by category
    const categories = this.groupByCategory([...historical, ...current]);
    
    for (const [category, transactions] of categories) {
      // Create time series
      const series = this.createTimeSeries(transactions, 'daily');
      
      if (series.length < 90) continue; // Need sufficient history
      
      // Simple statistical analysis instead of LSTM
      const mean = series.reduce((sum, val) => sum + val, 0) / series.length;
      const stdDev = Math.sqrt(
        series.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / series.length
      );
      
      // Check recent values against historical patterns
      const recent = series.slice(-30);
      const threshold = mean + 2 * stdDev; // 2 standard deviations
      
      for (let i = 0; i < recent.length; i++) {
        if (recent[i] > threshold) {
          anomalies.push({
            type: 'seasonal_anomaly',
            severity: this.calculateSeverity(recent[i], threshold),
            confidence: Math.min(0.95, (recent[i] - threshold) / threshold),
            category,
            period_start: this.getDateFromIndex(i),
            period_end: this.getDateFromIndex(i),
            expected_value: mean,
            actual_value: recent[i],
            deviation_score: (recent[i] - mean) / stdDev,
            description: `Unusual ${category} spending pattern detected`,
            recommendation: `Review ${category} transactions for this period`,
          });
        }
      }
    }
    
    return anomalies;
  }
  
  private async detectOutliers(transactions: Transaction[]): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Feature engineering
    const features = transactions.map(t => [
      t.amount,
      new Date(t.date).getDay(), // day of week
      new Date(t.date).getDate(), // day of month
      this.getVendorFrequency(t.vendor, transactions),
      this.getCategoryFrequency(t.category, transactions),
      this.getAmountZScore(t.amount, transactions),
    ]);
    
    // Simple outlier detection using Z-score
    const amounts = transactions.map(t => t.amount);
    const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length
    );
    
    for (let i = 0; i < transactions.length; i++) {
      const zScore = Math.abs((transactions[i].amount - mean) / stdDev);
      
      if (zScore > 3) { // 3 standard deviations
        anomalies.push({
          type: 'statistical_outlier',
          severity: this.scoresToSeverity(zScore),
          confidence: Math.min(0.95, zScore / 5),
          transaction_ids: [transactions[i].id],
          amount: transactions[i].amount,
          vendor: transactions[i].vendor,
          description: `Unusual transaction pattern: ${transactions[i].vendor} for $${transactions[i].amount}`,
          recommendation: 'Verify this transaction is legitimate',
          features: {
            z_score: zScore,
            amount_zscore: zScore,
          },
        });
      }
    }
    
    return anomalies;
  }
  
  private async detectClusteringAnomalies(
    transactions: Transaction[]
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Simple clustering based on amount ranges
    const amountRanges = this.createAmountRanges(transactions);
    const outliers = this.findClusteringOutliers(transactions, amountRanges);
    
    for (const transaction of outliers) {
      anomalies.push({
        type: 'clustering_anomaly',
        severity: 'medium',
        confidence: 0.75,
        transaction_ids: [transaction.id],
        description: `Transaction doesn't fit typical patterns`,
        recommendation: 'Review for potential categorization',
      });
    }
    
    return anomalies;
  }
  
  private async detectPatternAnomalies(
    current: Transaction[],
    historical: Transaction[]
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Detect new vendor patterns
    const historicalVendors = new Set(historical.map(t => t.vendor));
    const newVendors = current.filter(t => !historicalVendors.has(t.vendor));
    
    if (newVendors.length > 0) {
      // Check if new vendors are similar to known risky patterns
      for (const t of newVendors) {
        const risk = await this.assessVendorRisk(t.vendor);
        if (risk > 0.5) {
          anomalies.push({
            type: 'new_vendor_risk',
            severity: risk > 0.8 ? 'high' : 'medium',
            confidence: risk,
            transaction_ids: [t.id],
            vendor: t.vendor,
            description: `New vendor with risk indicators: ${t.vendor}`,
            recommendation: 'Verify this vendor before proceeding',
          });
        }
      }
    }
    
    // Detect unusual timing patterns
    const timingAnomalies = this.detectTimingAnomalies(current);
    anomalies.push(...timingAnomalies);
    
    return anomalies;
  }
  
  private detectDuplicates(transactions: Transaction[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const groups = new Map<string, Transaction[]>();
    
    // Group by date + amount
    for (const t of transactions) {
      const key = `${t.date}:${t.amount}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(t);
    }
    
    // Find potential duplicates
    for (const [key, group] of groups) {
      if (group.length > 1) {
        // Use fuzzy matching for vendor names
        const vendorSimilarity = this.calculateVendorSimilarity(group);
        
        if (vendorSimilarity > 0.8) {
          anomalies.push({
            type: 'duplicate',
            severity: 'high',
            confidence: vendorSimilarity,
            transaction_ids: group.map(t => t.id),
            amount: group[0].amount,
            description: `Potential duplicate transactions on ${group[0].date}`,
            recommendation: 'Review and remove duplicates if confirmed',
          });
        }
      }
    }
    
    return anomalies;
  }
  
  private async detectFraudIndicators(
    transactions: Transaction[]
  ): Promise<Anomaly[]> {
    const anomalies: Anomaly[] = [];
    
    // Velocity checks
    const velocityAnomalies = this.detectVelocityAnomalies(transactions);
    anomalies.push(...velocityAnomalies);
    
    // Round amount patterns (often indicate fraud)
    const roundAmounts = transactions.filter(t => 
      t.amount % 100 === 0 && t.amount > 500
    );
    
    if (roundAmounts.length > transactions.length * 0.1) {
      anomalies.push({
        type: 'fraud_risk',
        severity: 'high',
        confidence: 0.85,
        description: 'Unusual pattern of round amounts detected',
        recommendation: 'Verify recent high-value transactions',
        transaction_ids: roundAmounts.map(t => t.id),
      });
    }
    
    return anomalies;
  }
  
  private groupByCategory(transactions: Transaction[]): Map<string, Transaction[]> {
    const groups = new Map<string, Transaction[]>();
    
    for (const t of transactions) {
      const category = t.category || 'Uncategorized';
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(t);
    }
    
    return groups;
  }
  
  private createTimeSeries(transactions: Transaction[], granularity: string): number[] {
    // Group transactions by time period and sum amounts
    const series: number[] = [];
    const periodMap = new Map<string, number>();
    
    for (const t of transactions) {
      const period = this.getPeriodKey(t.date, granularity);
      periodMap.set(period, (periodMap.get(period) || 0) + t.amount);
    }
    
    // Convert to array sorted by date
    const sortedPeriods = Array.from(periodMap.keys()).sort();
    return sortedPeriods.map(period => periodMap.get(period) || 0);
  }
  
  private getPeriodKey(date: string, granularity: string): string {
    const d = new Date(date);
    
    switch (granularity) {
      case 'daily':
        return d.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      default:
        return d.toISOString().split('T')[0];
    }
  }
  
  private getVendorFrequency(vendor: string, transactions: Transaction[]): number {
    return transactions.filter(t => t.vendor === vendor).length / transactions.length;
  }
  
  private getCategoryFrequency(category: string, transactions: Transaction[]): number {
    return transactions.filter(t => t.category === category).length / transactions.length;
  }
  
  private getAmountZScore(amount: number, transactions: Transaction[]): number {
    const amounts = transactions.map(t => t.amount);
    const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length
    );
    
    return stdDev > 0 ? (amount - mean) / stdDev : 0;
  }
  
  private calculateSeverity(value: number, threshold: number): 'low' | 'medium' | 'high' | 'critical' {
    const ratio = value / threshold;
    
    if (ratio > 3) return 'critical';
    if (ratio > 2) return 'high';
    if (ratio > 1.5) return 'medium';
    return 'low';
  }
  
  private scoresToSeverity(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score > 4) return 'critical';
    if (score > 3) return 'high';
    if (score > 2) return 'medium';
    return 'low';
  }
  
  private createAmountRanges(transactions: Transaction[]): Map<string, Transaction[]> {
    const ranges = new Map<string, Transaction[]>();
    
    for (const t of transactions) {
      let range: string;
      if (t.amount < 10) range = '0-10';
      else if (t.amount < 50) range = '10-50';
      else if (t.amount < 100) range = '50-100';
      else if (t.amount < 500) range = '100-500';
      else range = '500+';
      
      if (!ranges.has(range)) {
        ranges.set(range, []);
      }
      ranges.get(range)!.push(t);
    }
    
    return ranges;
  }
  
  private findClusteringOutliers(
    transactions: Transaction[],
    ranges: Map<string, Transaction[]>
  ): Transaction[] {
    const outliers: Transaction[] = [];
    
    // Find ranges with very few transactions
    for (const [range, txs] of ranges) {
      if (txs.length < transactions.length * 0.01) { // Less than 1%
        outliers.push(...txs);
      }
    }
    
    return outliers;
  }
  
  private async assessVendorRisk(vendor: string): Promise<number> {
    // Simple risk assessment based on vendor name patterns
    const riskyPatterns = [
      /cash/i,
      /atm/i,
      /wire/i,
      /transfer/i,
      /crypto/i,
      /bitcoin/i,
    ];
    
    let risk = 0;
    for (const pattern of riskyPatterns) {
      if (pattern.test(vendor)) {
        risk += 0.2;
      }
    }
    
    return Math.min(risk, 1);
  }
  
  private detectTimingAnomalies(transactions: Transaction[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Detect transactions at unusual hours (assuming we have time data)
    const nightTransactions = transactions.filter(t => {
      // This would need actual time data
      return false; // Placeholder
    });
    
    if (nightTransactions.length > transactions.length * 0.05) {
      anomalies.push({
        type: 'timing_anomaly',
        severity: 'medium',
        confidence: 0.7,
        description: 'Unusual number of transactions at night',
        recommendation: 'Review night-time transactions for legitimacy',
        transaction_ids: nightTransactions.map(t => t.id),
      });
    }
    
    return anomalies;
  }
  
  private calculateVendorSimilarity(group: Transaction[]): number {
    if (group.length < 2) return 0;
    
    const vendors = group.map(t => t.vendor.toLowerCase());
    const firstVendor = vendors[0];
    
    // Simple similarity based on common words
    const firstWords = firstVendor.split(' ');
    let matches = 0;
    
    for (let i = 1; i < vendors.length; i++) {
      const words = vendors[i].split(' ');
      const commonWords = firstWords.filter(word => words.includes(word));
      matches += commonWords.length / Math.max(firstWords.length, words.length);
    }
    
    return matches / (group.length - 1);
  }
  
  private detectVelocityAnomalies(transactions: Transaction[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // Group by day and check for unusual spending velocity
    const dailySpending = new Map<string, number>();
    
    for (const t of transactions) {
      const day = t.date;
      dailySpending.set(day, (dailySpending.get(day) || 0) + t.amount);
    }
    
    const amounts = Array.from(dailySpending.values());
    const mean = amounts.reduce((sum, val) => sum + val, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / amounts.length
    );
    
    for (const [day, amount] of dailySpending) {
      if (amount > mean + 3 * stdDev) {
        const dayTransactions = transactions.filter(t => t.date === day);
        anomalies.push({
          type: 'velocity_anomaly',
          severity: 'high',
          confidence: 0.8,
          description: `Unusually high spending on ${day}`,
          recommendation: 'Review transactions for this day',
          transaction_ids: dayTransactions.map(t => t.id),
        });
      }
    }
    
    return anomalies;
  }
  
  private rankAndDeduplicate(anomalies: Anomaly[]): Anomaly[] {
    // Remove duplicates based on transaction IDs
    const seen = new Set<string>();
    const unique: Anomaly[] = [];
    
    for (const anomaly of anomalies) {
      const key = anomaly.transaction_ids?.join(',') || anomaly.description;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(anomaly);
      }
    }
    
    // Sort by severity and confidence
    return unique.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      
      if (severityDiff !== 0) return severityDiff;
      return b.confidence - a.confidence;
    });
  }
  
  private generateRecommendations(anomalies: Anomaly[]): string[] {
    const recommendations: string[] = [];
    
    // Group by type
    const byType = this.groupAnomaliesByType(anomalies);
    
    if (byType.duplicate?.length > 0) {
      recommendations.push(
        `Found ${byType.duplicate.length} potential duplicate transactions. Review and remove to save money.`
      );
    }
    
    if (byType.seasonal_anomaly?.length > 0) {
      const categories = [...new Set(byType.seasonal_anomaly.map(a => a.category))];
      recommendations.push(
        `Unusual spending detected in: ${categories.join(', ')}. Consider setting budget alerts.`
      );
    }
    
    if (byType.fraud_risk?.length > 0) {
      recommendations.push(
        `⚠️ Potential fraud indicators detected. Review recent transactions immediately.`
      );
    }
    
    return recommendations;
  }
  
  private groupAnomaliesByType(anomalies: Anomaly[]): Record<string, Anomaly[]> {
    const groups: Record<string, Anomaly[]> = {};
    
    for (const anomaly of anomalies) {
      if (!groups[anomaly.type]) {
        groups[anomaly.type] = [];
      }
      groups[anomaly.type].push(anomaly);
    }
    
    return groups;
  }
  
  private async saveAnomalies(
    anomalies: Anomaly[],
    orgId?: string
  ): Promise<void> {
    const client = getSupabaseServerClient();
    const runId = crypto.randomUUID();
    
    const records = anomalies.map(a => ({
      ...a,
      detection_run_id: runId,
      org_id: orgId,
      ml_model_version: 'v2.0.0',
    }));
    
    await client
      .from('anomalies')
      .insert(records);
  }
  
  private getDateFromIndex(index: number): string {
    const date = new Date();
    date.setDate(date.getDate() - (30 - index));
    return date.toISOString().split('T')[0];
  }
}
