// Integrated Transaction Processing Pipeline
import { tagCategorizationBrain, Transaction as TagTransaction, CategorizationResult } from './TagCategorizationBrain';
import { crystalAnalysisBrain, Transaction as CrystalTransaction, AnalysisResult } from './CrystalAnalysisBrain';

export interface ProcessedTransaction {
  id: string;
  merchant: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory: string;
  confidence: number;
  source: 'receipt' | 'statement' | 'manual' | 'bank_feed';
  rawData?: any;
  analysis?: AnalysisResult;
  categorization?: CategorizationResult;
}

export interface ProcessingResult {
  success: boolean;
  transaction?: ProcessedTransaction;
  error?: string;
  insights?: string[];
  warnings?: string[];
}

export interface BatchProcessingResult {
  successful: ProcessedTransaction[];
  failed: Array<{error: string; data: any}>;
  insights: string[];
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalAmount: number;
    categories: Record<string, number>;
  };
}

export interface ProcessingContext {
  userId: string;
  source: 'receipt' | 'statement' | 'manual' | 'bank_feed';
  batchId?: string;
  metadata?: Record<string, any>;
}

export class TransactionPipeline {
  private processingQueue: Array<{data: any; context: ProcessingContext; resolve: Function; reject: Function}> = [];
  private isProcessing = false;
  private processingStats = {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    averageProcessingTime: 0
  };

  constructor() {
    console.log('🔄 TransactionPipeline: Initialized');
  }

  // Main processing method
  async processNewTransaction(data: any, context: ProcessingContext): Promise<ProcessingResult> {
    const startTime = Date.now();
    console.log(`🔄 Pipeline: Processing transaction from ${context.source} for user ${context.userId}`);
    
    try {
      let transaction: ProcessedTransaction;
      
      // Step 1: Extract data based on source
      if (context.source === 'receipt' || context.source === 'statement') {
        const extracted = await this.extractFromDocument(data, context);
        if (!extracted.success) {
          return { success: false, error: extracted.error };
        }
        transaction = extracted.transaction!;
      } else {
        transaction = await this.processManualEntry(data, context);
      }
      
      // Step 2: Tag categorizes
      console.log(`🔄 Pipeline: Categorizing transaction`);
      const categorization = await tagCategorizationBrain.categorizeTransaction(
        {
          merchant: transaction.merchant,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date
        },
        context.userId
      );
      
      transaction.category = categorization.category;
      transaction.subcategory = categorization.subcategory;
      transaction.categorization = categorization;
      
      // Step 3: Crystal analyzes
      console.log(`🔄 Pipeline: Analyzing transaction`);
      const analysis = await crystalAnalysisBrain.analyzeTransaction(
        {
          merchant: transaction.merchant,
          amount: transaction.amount,
          description: transaction.description,
          date: transaction.date,
          category: transaction.category,
          subcategory: transaction.subcategory
        },
        context.userId
      );
      
      transaction.analysis = analysis;
      
      // Step 4: Generate insights
      const insights = this.generateInsights(transaction, analysis);
      
      // Step 5: Store in database (simulated)
      await this.storeTransaction(transaction, context.userId);
      
      // Step 6: Trigger automations
      await this.triggerAutomations(transaction, context);
      
      const processingTime = Date.now() - startTime;
      this.updateStats(true, processingTime);
      
      console.log(`🔄 Pipeline: Transaction processed successfully in ${processingTime}ms`);
      
      return {
        success: true,
        transaction,
        insights,
        warnings: analysis.alerts.map(alert => alert.message)
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(false, processingTime);
      
      console.error(`🔄 Pipeline: Processing failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Document extraction (simplified - would integrate with actual OCR)
  private async extractFromDocument(data: any, context: ProcessingContext): Promise<ProcessingResult> {
    console.log(`🔄 Pipeline: Extracting data from ${context.source}`);
    
    try {
      // Simulate OCR processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock extracted data - in real implementation, this would come from OCR
      const extractedData = {
        merchant: data.merchant || 'Unknown Merchant',
        amount: data.amount || 0,
        description: data.description || 'Document processing',
        date: data.date || new Date().toISOString().split('T')[0],
        confidence: data.confidence || 0.8
      };
      
      const transaction: ProcessedTransaction = {
        id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        merchant: extractedData.merchant,
        amount: extractedData.amount,
        description: extractedData.description,
        date: extractedData.date,
        category: '', // Will be filled by Tag
        subcategory: '', // Will be filled by Tag
        confidence: extractedData.confidence,
        source: context.source,
        rawData: data
      };
      
      return {
        success: true,
        transaction
      };
      
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract data from ${context.source}: ${error}`
      };
    }
  }

  // Manual entry processing
  private async processManualEntry(data: any, context: ProcessingContext): Promise<ProcessedTransaction> {
    console.log(`🔄 Pipeline: Processing manual entry`);
    
    return {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      merchant: data.merchant || 'Manual Entry',
      amount: data.amount || 0,
      description: data.description || 'Manual transaction entry',
      date: data.date || new Date().toISOString().split('T')[0],
      category: '', // Will be filled by Tag
      subcategory: '', // Will be filled by Tag
      confidence: 1.0, // Manual entries are 100% confident
      source: 'manual'
    };
  }

  // Generate insights from analysis
  private generateInsights(transaction: ProcessedTransaction, analysis: AnalysisResult): string[] {
    const insights: string[] = [];
    
    // Spending velocity insights
    if (analysis.velocity.isUnusual) {
      insights.push(`This ${transaction.category} purchase is ${analysis.velocity.percentageAboveNormal.toFixed(0)}% above your normal spending`);
    }
    
    // Category insights
    if (analysis.categoryInsights.trend === 'increasing') {
      insights.push(`Your ${transaction.category} spending is trending upward`);
    }
    
    // Budget insights
    if (analysis.budgetImpact.projectedOverspend) {
      insights.push(`You're projected to overspend your ${transaction.category} budget`);
    }
    
    // Merchant insights
    if (analysis.merchantPatterns.frequency > 5) {
      insights.push(`You frequently shop at ${transaction.merchant} (${analysis.merchantPatterns.frequency} times)`);
    }
    
    // Predictive insights
    if (analysis.predictions.recommendations.length > 0) {
      insights.push(...analysis.predictions.recommendations);
    }
    
    return insights;
  }

  // Store transaction (simulated)
  private async storeTransaction(transaction: ProcessedTransaction, userId: string): Promise<void> {
    console.log(`🔄 Pipeline: Storing transaction ${transaction.id}`);
    
    // In real implementation, this would save to database
    const storedTransactions = JSON.parse(localStorage.getItem(`transactions_${userId}`) || '[]');
    storedTransactions.push(transaction);
    localStorage.setItem(`transactions_${userId}`, JSON.stringify(storedTransactions));
    
    // Simulate database delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Trigger automations
  private async triggerAutomations(transaction: ProcessedTransaction, context: ProcessingContext): Promise<void> {
    console.log(`🔄 Pipeline: Triggering automations for transaction ${transaction.id}`);
    
    // Simulate automation triggers
    const automations = [];
    
    // Budget alerts
    if (transaction.analysis?.budgetImpact.projectedOverspend) {
      automations.push('budget_alert');
    }
    
    // Recurring transaction detection
    if (transaction.analysis?.merchantPatterns.frequency > 3) {
      automations.push('recurring_detection');
    }
    
    // High-value transaction alert
    if (transaction.amount > 500) {
      automations.push('high_value_alert');
    }
    
    // Execute automations
    for (const automation of automations) {
      await this.executeAutomation(automation, transaction, context);
    }
  }

  private async executeAutomation(automation: string, transaction: ProcessedTransaction, context: ProcessingContext): Promise<void> {
    console.log(`🔄 Pipeline: Executing automation ${automation}`);
    
    switch (automation) {
      case 'budget_alert':
        // Send budget alert notification
        break;
      case 'recurring_detection':
        // Create recurring transaction rule
        break;
      case 'high_value_alert':
        // Send high-value transaction notification
        break;
    }
  }

  // Bulk processing with optimization
  async processBatch(files: any[], context: ProcessingContext): Promise<BatchProcessingResult> {
    console.log(`🔄 Pipeline: Processing batch of ${files.length} files`);
    
    const results: BatchProcessingResult = {
      successful: [],
      failed: [],
      insights: [],
      summary: {
        total: files.length,
        successful: 0,
        failed: 0,
        totalAmount: 0,
        categories: {}
      }
    };
    
    // Process in parallel with rate limiting
    const chunks = this.chunkArray(files, 5); // Process 5 at a time
    
    for (const chunk of chunks) {
      const chunkResults = await Promise.all(
        chunk.map(file => this.processNewTransaction(file, context))
      );
      
      chunkResults.forEach(result => {
        if (result.success && result.transaction) {
          results.successful.push(result.transaction);
          results.summary.totalAmount += result.transaction.amount;
          
          // Update category totals
          const category = result.transaction.category;
          results.summary.categories[category] = (results.summary.categories[category] || 0) + 1;
          
          // Collect insights
          if (result.insights) {
            results.insights.push(...result.insights);
          }
        } else {
          results.failed.push({
            error: result.error || 'Unknown error',
            data: file
          });
        }
      });
    }
    
    results.summary.successful = results.successful.length;
    results.summary.failed = results.failed.length;
    
    // Generate batch insights
    const batchInsights = await this.generateBatchInsights(results.successful, context.userId);
    results.insights.push(...batchInsights);
    
    console.log(`🔄 Pipeline: Batch processing complete - ${results.summary.successful}/${results.summary.total} successful`);
    
    return results;
  }

  private async generateBatchInsights(transactions: ProcessedTransaction[], userId: string): Promise<string[]> {
    const insights: string[] = [];
    
    if (transactions.length === 0) return insights;
    
    // Calculate batch statistics
    const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
    const categoryTotals = new Map<string, number>();
    
    transactions.forEach(t => {
      const current = categoryTotals.get(t.category) || 0;
      categoryTotals.set(t.category, current + t.amount);
    });
    
    // Generate insights
    insights.push(`Processed ${transactions.length} transactions totaling $${totalAmount.toFixed(2)}`);
    
    const topCategory = Array.from(categoryTotals.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topCategory) {
      insights.push(`Top spending category: ${topCategory[0]} ($${topCategory[1].toFixed(2)})`);
    }
    
    // Check for patterns
    const merchantFrequency = new Map<string, number>();
    transactions.forEach(t => {
      const count = merchantFrequency.get(t.merchant) || 0;
      merchantFrequency.set(t.merchant, count + 1);
    });
    
    const frequentMerchant = Array.from(merchantFrequency.entries())
      .find(([_, count]) => count > 1);
    
    if (frequentMerchant) {
      insights.push(`Multiple transactions at ${frequentMerchant[0]} (${frequentMerchant[1]} times)`);
    }
    
    return insights;
  }

  // Utility methods
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private updateStats(success: boolean, processingTime: number): void {
    this.processingStats.totalProcessed++;
    
    if (success) {
      this.processingStats.successful++;
    } else {
      this.processingStats.failed++;
    }
    
    // Update average processing time
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime * (this.processingStats.totalProcessed - 1) + processingTime) / 
      this.processingStats.totalProcessed;
  }

  // Get processing statistics
  getProcessingStats(): typeof this.processingStats {
    return { ...this.processingStats };
  }

  // Queue management
  async queueTransaction(data: any, context: ProcessingContext): Promise<ProcessingResult> {
    return new Promise((resolve, reject) => {
      this.processingQueue.push({ data, context, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.processingQueue.length > 0) {
      const { data, context, resolve, reject } = this.processingQueue.shift()!;
      
      try {
        const result = await this.processNewTransaction(data, context);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    }
    
    this.isProcessing = false;
  }

  // Load user data
  loadUserData(userId: string): void {
    console.log(`🔄 Pipeline: Loading user data for ${userId}`);
    
    // Load Tag's data
    tagCategorizationBrain.loadUserData(userId);
    
    // Load Crystal's data
    crystalAnalysisBrain.loadUserData(userId);
  }

  // Get user summary
  getUserSummary(userId: string): {
    totalTransactions: number;
    totalSpending: number;
    topCategories: Array<{category: string; amount: number; count: number}>;
    recentInsights: string[];
    processingStats: typeof this.processingStats;
  } {
    const transactions = JSON.parse(localStorage.getItem(`transactions_${userId}`) || '[]');
    const totalSpending = transactions.reduce((sum: number, t: ProcessedTransaction) => sum + t.amount, 0);
    
    const categoryTotals = new Map<string, {amount: number; count: number}>();
    transactions.forEach((t: ProcessedTransaction) => {
      const current = categoryTotals.get(t.category) || {amount: 0, count: 0};
      categoryTotals.set(t.category, {
        amount: current.amount + t.amount,
        count: current.count + 1
      });
    });
    
    const topCategories = Array.from(categoryTotals.entries())
      .map(([category, data]) => ({category, ...data}))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
    
    return {
      totalTransactions: transactions.length,
      totalSpending,
      topCategories,
      recentInsights: [], // Would be populated from recent analysis
      processingStats: this.getProcessingStats()
    };
  }
}

// Export singleton instance
export const transactionPipeline = new TransactionPipeline();
