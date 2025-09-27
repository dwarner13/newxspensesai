// Enhanced Crystal Transaction Analysis System
export interface Transaction {
  id?: string;
  merchant: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory: string;
  confidence?: number;
}

export interface AnalysisResult {
  velocity: {
    isUnusual: boolean;
    percentageAboveNormal: number;
    normalRange: {min: number; max: number};
  };
  categoryInsights: {
    category: string;
    monthlySpending: number;
    averageTransaction: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    percentageOfTotal: number;
  };
  merchantPatterns: {
    merchant: string;
    frequency: number;
    averageAmount: number;
    lastSeen: string;
    trend: 'increasing' | 'decreasing' | 'stable';
  };
  budgetImpact: {
    category: string;
    remainingBudget: number;
    percentageUsed: number;
    projectedOverspend: boolean;
    daysUntilBudgetReset: number;
  };
  predictions: {
    nextMonthSpending: number;
    confidence: number;
    factors: string[];
    recommendations: string[];
  };
  alerts: Array<{
    type: 'spending_velocity' | 'budget_overspend' | 'unusual_transaction' | 'recurring_pattern';
    severity: 'low' | 'medium' | 'high';
    message: string;
    action?: string;
  }>;
}

export interface UserProfile {
  userId: string;
  monthlyIncome: number;
  spendingCategories: Record<string, number>;
  averageMonthlySpending: number;
  spendingPatterns: {
    dayOfWeek: Record<string, number>;
    timeOfDay: Record<string, number>;
    merchantFrequency: Record<string, number>;
  };
  budgetLimits: Record<string, number>;
  financialGoals: Array<{
    id: string;
    name: string;
    target: number;
    current: number;
    deadline: string;
  }>;
}

export interface Pattern {
  type: 'recurring' | 'unusual' | 'trend' | 'opportunity';
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
}

export class CrystalAnalysisBrain {
  private userProfiles: Map<string, UserProfile>;
  private transactionHistory: Map<string, Transaction[]>;
  private spendingPatterns: Map<string, any>;

  constructor() {
    this.userProfiles = new Map();
    this.transactionHistory = new Map();
    this.spendingPatterns = new Map();
  }

  // Main analysis method
  async analyzeTransaction(transaction: Transaction, userId: string): Promise<AnalysisResult> {
    console.log(`🔮 Crystal: Analyzing transaction - ${transaction.merchant} ($${transaction.amount})`);
    
    const userProfile = await this.getUserProfile(userId);
    const analysis: AnalysisResult = {
      velocity: { isUnusual: false, percentageAboveNormal: 0, normalRange: {min: 0, max: 0} },
      categoryInsights: { category: '', monthlySpending: 0, averageTransaction: 0, trend: 'stable', percentageOfTotal: 0 },
      merchantPatterns: { merchant: '', frequency: 0, averageAmount: 0, lastSeen: '', trend: 'stable' },
      budgetImpact: { category: '', remainingBudget: 0, percentageUsed: 0, projectedOverspend: false, daysUntilBudgetReset: 0 },
      predictions: { nextMonthSpending: 0, confidence: 0, factors: [], recommendations: [] },
      alerts: []
    };

    // Spending velocity check
    analysis.velocity = await this.checkSpendingVelocity(transaction, userId);
    if (analysis.velocity.isUnusual) {
      analysis.alerts.push({
        type: 'spending_velocity',
        severity: analysis.velocity.percentageAboveNormal > 200 ? 'high' : 'medium',
        message: `Spending ${analysis.velocity.percentageAboveNormal}% above normal for this category`,
        action: 'Review recent transactions'
      });
    }

    // Category analysis
    analysis.categoryInsights = await this.analyzeCategorySpending(transaction.category, transaction.amount, userId);

    // Merchant patterns
    analysis.merchantPatterns = await this.analyzeMerchantPatterns(transaction.merchant, userId);

    // Budget impact
    analysis.budgetImpact = await this.calculateBudgetImpact(transaction, userId);

    // Predictive insights
    analysis.predictions = await this.generatePredictions(transaction, userId);

    // Store transaction for future analysis
    await this.storeTransaction(transaction, userId);

    console.log(`🔮 Crystal: Analysis complete - ${analysis.alerts.length} alerts generated`);
    return analysis;
  }

  private async checkSpendingVelocity(transaction: Transaction, userId: string): Promise<AnalysisResult['velocity']> {
    const userTransactions = this.transactionHistory.get(userId) || [];
    const categoryTransactions = userTransactions.filter(t => t.category === transaction.category);
    
    if (categoryTransactions.length < 3) {
      return { isUnusual: false, percentageAboveNormal: 0, normalRange: {min: 0, max: 0} };
    }

    // Calculate average spending for this category
    const averageSpending = categoryTransactions.reduce((sum, t) => sum + t.amount, 0) / categoryTransactions.length;
    const standardDeviation = this.calculateStandardDeviation(categoryTransactions.map(t => t.amount));
    
    const normalRange = {
      min: averageSpending - (2 * standardDeviation),
      max: averageSpending + (2 * standardDeviation)
    };

    const isUnusual = transaction.amount > normalRange.max;
    const percentageAboveNormal = isUnusual ? 
      ((transaction.amount - normalRange.max) / normalRange.max) * 100 : 0;

    return {
      isUnusual,
      percentageAboveNormal,
      normalRange
    };
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  private async analyzeCategorySpending(category: string, amount: number, userId: string): Promise<AnalysisResult['categoryInsights']> {
    const userTransactions = this.transactionHistory.get(userId) || [];
    const categoryTransactions = userTransactions.filter(t => t.category === category);
    
    const monthlySpending = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averageTransaction = categoryTransactions.length > 0 ? monthlySpending / categoryTransactions.length : 0;
    
    // Calculate trend (simplified)
    const recentTransactions = categoryTransactions.slice(-10);
    const olderTransactions = categoryTransactions.slice(-20, -10);
    
    const recentAverage = recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length;
    const olderAverage = olderTransactions.reduce((sum, t) => sum + t.amount, 0) / olderTransactions.length;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAverage > olderAverage * 1.1) trend = 'increasing';
    else if (recentAverage < olderAverage * 0.9) trend = 'decreasing';
    
    const totalSpending = userTransactions.reduce((sum, t) => sum + t.amount, 0);
    const percentageOfTotal = totalSpending > 0 ? (monthlySpending / totalSpending) * 100 : 0;

    return {
      category,
      monthlySpending,
      averageTransaction,
      trend,
      percentageOfTotal
    };
  }

  private async analyzeMerchantPatterns(merchant: string, userId: string): Promise<AnalysisResult['merchantPatterns']> {
    const userTransactions = this.transactionHistory.get(userId) || [];
    const merchantTransactions = userTransactions.filter(t => t.merchant.toLowerCase() === merchant.toLowerCase());
    
    const frequency = merchantTransactions.length;
    const averageAmount = frequency > 0 ? merchantTransactions.reduce((sum, t) => sum + t.amount, 0) / frequency : 0;
    const lastSeen = frequency > 0 ? merchantTransactions[merchantTransactions.length - 1].date : '';
    
    // Calculate trend
    const recentTransactions = merchantTransactions.slice(-5);
    const olderTransactions = merchantTransactions.slice(-10, -5);
    
    const recentAverage = recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length;
    const olderAverage = olderTransactions.reduce((sum, t) => sum + t.amount, 0) / olderTransactions.length;
    
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAverage > olderAverage * 1.1) trend = 'increasing';
    else if (recentAverage < olderAverage * 0.9) trend = 'decreasing';

    return {
      merchant,
      frequency,
      averageAmount,
      lastSeen,
      trend
    };
  }

  private async calculateBudgetImpact(transaction: Transaction, userId: string): Promise<AnalysisResult['budgetImpact']> {
    const userProfile = await this.getUserProfile(userId);
    const budgetLimit = userProfile.budgetLimits[transaction.category] || 0;
    
    if (budgetLimit === 0) {
      return {
        category: transaction.category,
        remainingBudget: 0,
        percentageUsed: 0,
        projectedOverspend: false,
        daysUntilBudgetReset: 0
      };
    }

    const userTransactions = this.transactionHistory.get(userId) || [];
    const categoryTransactions = userTransactions.filter(t => t.category === transaction.category);
    const currentSpending = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
    
    const remainingBudget = budgetLimit - currentSpending;
    const percentageUsed = (currentSpending / budgetLimit) * 100;
    
    // Project overspend based on current rate
    const daysInMonth = new Date().getDate();
    const daysRemaining = 30 - daysInMonth;
    const dailyAverage = currentSpending / daysInMonth;
    const projectedSpending = currentSpending + (dailyAverage * daysRemaining);
    const projectedOverspend = projectedSpending > budgetLimit;

    return {
      category: transaction.category,
      remainingBudget,
      percentageUsed,
      projectedOverspend,
      daysUntilBudgetReset: daysRemaining
    };
  }

  private async generatePredictions(transaction: Transaction, userId: string): Promise<AnalysisResult['predictions']> {
    const userProfile = await this.getUserProfile(userId);
    const userTransactions = this.transactionHistory.get(userId) || [];
    
    // Simple prediction based on historical data
    const monthlySpending = userTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averageMonthlySpending = userProfile.averageMonthlySpending;
    
    // Adjust prediction based on recent trends
    const recentTransactions = userTransactions.slice(-30);
    const recentAverage = recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length;
    
    let nextMonthSpending = averageMonthlySpending;
    if (recentAverage > averageMonthlySpending * 1.1) {
      nextMonthSpending = averageMonthlySpending * 1.15; // 15% increase
    } else if (recentAverage < averageMonthlySpending * 0.9) {
      nextMonthSpending = averageMonthlySpending * 0.85; // 15% decrease
    }
    
    const confidence = userTransactions.length > 10 ? 0.8 : 0.5;
    
    const factors = [
      `Based on ${userTransactions.length} historical transactions`,
      `Recent spending trend: ${recentAverage > averageMonthlySpending ? 'increasing' : 'decreasing'}`,
      `Category distribution: ${this.getTopCategories(userTransactions).join(', ')}`
    ];
    
    const recommendations = this.generateRecommendations(transaction, userProfile, userTransactions);

    return {
      nextMonthSpending,
      confidence,
      factors,
      recommendations
    };
  }

  private getTopCategories(transactions: Transaction[]): string[] {
    const categoryTotals = new Map<string, number>();
    
    transactions.forEach(t => {
      const current = categoryTotals.get(t.category) || 0;
      categoryTotals.set(t.category, current + t.amount);
    });
    
    return Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);
  }

  private generateRecommendations(transaction: Transaction, userProfile: UserProfile, transactions: Transaction[]): string[] {
    const recommendations: string[] = [];
    
    // Budget recommendations
    if (userProfile.budgetLimits[transaction.category]) {
      const budgetLimit = userProfile.budgetLimits[transaction.category];
      const currentSpending = transactions
        .filter(t => t.category === transaction.category)
        .reduce((sum, t) => sum + t.amount, 0);
      
      if (currentSpending > budgetLimit * 0.8) {
        recommendations.push(`You're approaching your ${transaction.category} budget limit`);
      }
    }
    
    // Spending pattern recommendations
    const categoryTransactions = transactions.filter(t => t.category === transaction.category);
    if (categoryTransactions.length > 5) {
      const average = categoryTransactions.reduce((sum, t) => sum + t.amount, 0) / categoryTransactions.length;
      if (transaction.amount > average * 1.5) {
        recommendations.push(`This ${transaction.category} purchase is above your usual amount`);
      }
    }
    
    // Goal-based recommendations
    userProfile.financialGoals.forEach(goal => {
      if (goal.current < goal.target * 0.5) {
        recommendations.push(`Consider reducing ${transaction.category} spending to reach your ${goal.name} goal`);
      }
    });
    
    return recommendations;
  }

  // Pattern detection
  async detectPatterns(userId: string, timeframe = 90): Promise<Pattern[]> {
    console.log(`🔮 Crystal: Detecting patterns for user ${userId} (${timeframe} days)`);
    
    const userTransactions = this.transactionHistory.get(userId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - timeframe);
    
    const recentTransactions = userTransactions.filter(t => new Date(t.date) >= cutoffDate);
    const patterns: Pattern[] = [];
    
    // Detect recurring transactions
    const recurringPatterns = this.findRecurringTransactions(recentTransactions);
    patterns.push(...recurringPatterns);
    
    // Find unusual spending
    const unusualPatterns = this.findAnomalies(recentTransactions);
    patterns.push(...unusualPatterns);
    
    // Identify trends
    const trendPatterns = this.identifyTrends(recentTransactions);
    patterns.push(...trendPatterns);
    
    // Find savings opportunities
    const opportunityPatterns = this.findSavingsOpportunities(recentTransactions);
    patterns.push(...opportunityPatterns);
    
    console.log(`🔮 Crystal: Found ${patterns.length} patterns`);
    return patterns;
  }

  private findRecurringTransactions(transactions: Transaction[]): Pattern[] {
    const patterns: Pattern[] = [];
    const merchantFrequency = new Map<string, number>();
    
    transactions.forEach(t => {
      const count = merchantFrequency.get(t.merchant) || 0;
      merchantFrequency.set(t.merchant, count + 1);
    });
    
    merchantFrequency.forEach((frequency, merchant) => {
      if (frequency >= 3) {
        patterns.push({
          type: 'recurring',
          description: `Recurring purchases at ${merchant} (${frequency} times)`,
          confidence: 0.9,
          impact: frequency >= 5 ? 'high' : 'medium',
          recommendation: `Consider setting up automatic payments or budgeting for ${merchant}`
        });
      }
    });
    
    return patterns;
  }

  private findAnomalies(transactions: Transaction[]): Pattern[] {
    const patterns: Pattern[] = [];
    const amounts = transactions.map(t => t.amount);
    const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const standardDeviation = this.calculateStandardDeviation(amounts);
    
    transactions.forEach(t => {
      if (t.amount > average + (3 * standardDeviation)) {
        patterns.push({
          type: 'unusual',
          description: `Unusually large purchase: $${t.amount} at ${t.merchant}`,
          confidence: 0.8,
          impact: 'medium',
          recommendation: 'Review this transaction to ensure it was intentional'
        });
      }
    });
    
    return patterns;
  }

  private identifyTrends(transactions: Transaction[]): Pattern[] {
    const patterns: Pattern[] = [];
    const categoryTotals = new Map<string, number>();
    
    transactions.forEach(t => {
      const current = categoryTotals.get(t.category) || 0;
      categoryTotals.set(t.category, current + t.amount);
    });
    
    // Find categories with significant spending
    const totalSpending = Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0);
    
    categoryTotals.forEach((amount, category) => {
      const percentage = (amount / totalSpending) * 100;
      if (percentage > 30) {
        patterns.push({
          type: 'trend',
          description: `${category} represents ${percentage.toFixed(1)}% of your spending`,
          confidence: 0.9,
          impact: 'high',
          recommendation: `Consider if this ${category} spending aligns with your financial goals`
        });
      }
    });
    
    return patterns;
  }

  private findSavingsOpportunities(transactions: Transaction[]): Pattern[] {
    const patterns: Pattern[] = [];
    const merchantTotals = new Map<string, number>();
    
    transactions.forEach(t => {
      const current = merchantTotals.get(t.merchant) || 0;
      merchantTotals.set(t.merchant, current + t.amount);
    });
    
    // Find high-spending merchants
    merchantTotals.forEach((amount, merchant) => {
      if (amount > 100) {
        patterns.push({
          type: 'opportunity',
          description: `You've spent $${amount.toFixed(2)} at ${merchant}`,
          confidence: 0.8,
          impact: 'medium',
          recommendation: `Look for discounts or alternatives to ${merchant}`
        });
      }
    });
    
    return patterns;
  }

  // Predictive analytics
  async predictNextMonth(userId: string): Promise<{
    totalSpending: number;
    byCategory: Record<string, number>;
    confidence: number;
    factors: string[];
  }> {
    console.log(`🔮 Crystal: Predicting next month spending for user ${userId}`);
    
    const userProfile = await this.getUserProfile(userId);
    const userTransactions = this.transactionHistory.get(userId) || [];
    
    const prediction = {
      totalSpending: 0,
      byCategory: {} as Record<string, number>,
      confidence: 0,
      factors: [] as string[]
    };
    
    // Calculate category-based predictions
    const categoryTotals = new Map<string, number>();
    userTransactions.forEach(t => {
      const current = categoryTotals.get(t.category) || 0;
      categoryTotals.set(t.category, current + t.amount);
    });
    
    categoryTotals.forEach((amount, category) => {
      const average = amount / Math.max(1, userTransactions.filter(t => t.category === category).length);
      prediction.byCategory[category] = average * 30; // Rough monthly estimate
      prediction.totalSpending += prediction.byCategory[category];
    });
    
    // Adjust for known patterns
    const patterns = await this.detectPatterns(userId, 30);
    const increasingPatterns = patterns.filter(p => p.type === 'trend' && p.description.includes('increasing'));
    
    if (increasingPatterns.length > 0) {
      prediction.totalSpending *= 1.1; // 10% increase
      prediction.factors.push('Recent spending trend shows increase');
    }
    
    // Calculate confidence
    prediction.confidence = userTransactions.length > 20 ? 0.8 : 0.5;
    prediction.factors.push(`Based on ${userTransactions.length} historical transactions`);
    prediction.factors.push(`User profile: ${userProfile.monthlyIncome > 0 ? 'Income data available' : 'No income data'}`);
    
    console.log(`🔮 Crystal: Prediction complete - $${prediction.totalSpending.toFixed(2)} total spending`);
    return prediction;
  }

  // Helper methods
  private async getUserProfile(userId: string): Promise<UserProfile> {
    let profile = this.userProfiles.get(userId);
    
    if (!profile) {
      // Create default profile
      profile = {
        userId,
        monthlyIncome: 0,
        spendingCategories: {},
        averageMonthlySpending: 0,
        spendingPatterns: {
          dayOfWeek: {},
          timeOfDay: {},
          merchantFrequency: {}
        },
        budgetLimits: {},
        financialGoals: []
      };
      
      this.userProfiles.set(userId, profile);
    }
    
    return profile;
  }

  private async storeTransaction(transaction: Transaction, userId: string): Promise<void> {
    const userTransactions = this.transactionHistory.get(userId) || [];
    userTransactions.push(transaction);
    this.transactionHistory.set(userId, userTransactions);
    
    // Save to localStorage for now
    localStorage.setItem(`crystal_transactions_${userId}`, JSON.stringify(userTransactions));
  }

  // Load user data from localStorage
  loadUserData(userId: string): void {
    try {
      const transactionsData = localStorage.getItem(`crystal_transactions_${userId}`);
      if (transactionsData) {
        this.transactionHistory.set(userId, JSON.parse(transactionsData));
      }
      
      const profileData = localStorage.getItem(`crystal_profile_${userId}`);
      if (profileData) {
        this.userProfiles.set(userId, JSON.parse(profileData));
      }
    } catch (error) {
      console.error('🔮 Crystal: Error loading user data:', error);
    }
  }

  // Get user insights summary
  getUserInsights(userId: string): {
    totalTransactions: number;
    totalSpending: number;
    topCategories: Array<{category: string; amount: number; percentage: number}>;
    spendingTrend: 'increasing' | 'decreasing' | 'stable';
    alerts: number;
  } {
    const transactions = this.transactionHistory.get(userId) || [];
    const totalSpending = transactions.reduce((sum, t) => sum + t.amount, 0);
    
    const categoryTotals = new Map<string, number>();
    transactions.forEach(t => {
      const current = categoryTotals.get(t.category) || 0;
      categoryTotals.set(t.category, current + t.amount);
    });
    
    const topCategories = Array.from(categoryTotals.entries())
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalSpending) * 100
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    // Calculate spending trend
    const recentTransactions = transactions.slice(-10);
    const olderTransactions = transactions.slice(-20, -10);
    
    const recentAverage = recentTransactions.reduce((sum, t) => sum + t.amount, 0) / recentTransactions.length;
    const olderAverage = olderTransactions.reduce((sum, t) => sum + t.amount, 0) / olderTransactions.length;
    
    let spendingTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (recentAverage > olderAverage * 1.1) spendingTrend = 'increasing';
    else if (recentAverage < olderAverage * 0.9) spendingTrend = 'decreasing';
    
    return {
      totalTransactions: transactions.length,
      totalSpending,
      topCategories,
      spendingTrend,
      alerts: 0 // This would be calculated based on current analysis
    };
  }
}

// Export singleton instance
export const crystalAnalysisBrain = new CrystalAnalysisBrain();
