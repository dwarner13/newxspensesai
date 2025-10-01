// Batch Processing Optimizer with Complexity Grouping and Streaming Results
import { enhancedOCRSystem, PreprocessedImage } from './EnhancedOCRSystem';
import { enhancedLearningSystem } from './EnhancedLearningSystem';

export interface BatchFile {
  id: string;
  file: File;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedProcessingTime: number;
  priority: number;
  metadata: {
    size: number;
    type: string;
    lastModified: number;
  };
}

export interface BatchResult {
  id: string;
  success: boolean;
  data?: any;
  error?: string;
  processingTime: number;
  cost: number;
  confidence: number;
}

export interface StreamingBatchResult {
  completed: BatchResult[];
  failed: BatchResult[];
  inProgress: string[];
  total: number;
  progress: number;
  estimatedTimeRemaining: number;
  insights: string[];
  summary: {
    totalAmount: number;
    categories: Record<string, number>;
    merchants: Record<string, number>;
  };
}

export interface BatchProcessingConfig {
  maxConcurrent: number;
  timeoutMs: number;
  retryAttempts: number;
  enableStreaming: boolean;
  costLimit: number;
  qualityThreshold: number;
}

export class BatchProcessingOptimizer {
  private processingQueue: BatchFile[] = [];
  private activeProcessing: Map<string, Promise<BatchResult>> = new Map();
  private completedResults: BatchResult[] = [];
  private failedResults: BatchResult[] = [];
  private processingStats = {
    totalProcessed: 0,
    averageTime: 0,
    successRate: 0,
    totalCost: 0,
    throughput: 0
  };

  constructor() {
    console.log('🔄 Batch Processing Optimizer: Initialized');
  }

  // Main batch processing method
  async processBatch(
    files: File[], 
    userId: string, 
    config: Partial<BatchProcessingConfig> = {}
  ): Promise<StreamingBatchResult> {
    const startTime = Date.now();
    console.log(`🔄 Batch Processing: Starting batch of ${files.length} files for user ${userId}`);
    
    // Set default configuration
    const finalConfig: BatchProcessingConfig = {
      maxConcurrent: 5,
      timeoutMs: 30000,
      retryAttempts: 2,
      enableStreaming: true,
      costLimit: 1.0,
      qualityThreshold: 0.7,
      ...config
    };
    
    // Step 1: Analyze and group files by complexity
    const batchFiles = await this.analyzeAndGroupFiles(files, userId);
    console.log(`🔄 Batch Processing: Grouped files - Simple: ${batchFiles.simple.length}, Medium: ${batchFiles.medium.length}, Complex: ${batchFiles.complex.length}`);
    
    // Step 2: Process simple files first (fast wins)
    const simpleResults = await this.processSimpleFiles(batchFiles.simple, userId, finalConfig);
    
    // Step 3: Process medium complexity files
    const mediumResults = await this.processMediumFiles(batchFiles.medium, userId, finalConfig);
    
    // Step 4: Process complex files with higher timeout
    const complexResults = await this.processComplexFiles(batchFiles.complex, userId, finalConfig);
    
    // Step 5: Combine all results
    const allResults = [...simpleResults, ...mediumResults, ...complexResults];
    
    // Step 6: Generate insights and summary
    const insights = await this.generateBatchInsights(allResults, userId);
    const summary = this.generateSummary(allResults);
    
    const totalTime = Date.now() - startTime;
    this.updateStats(allResults, totalTime);
    
    console.log(`🔄 Batch Processing: Completed ${allResults.length} files in ${totalTime}ms`);
    
    return {
      completed: allResults.filter(r => r.success),
      failed: allResults.filter(r => !r.success),
      inProgress: [],
      total: files.length,
      progress: 100,
      estimatedTimeRemaining: 0,
      insights,
      summary
    };
  }

  // Streaming batch processing for real-time updates
  async processBatchStreaming(
    files: File[], 
    userId: string, 
    onProgress: (result: StreamingBatchResult) => void,
    config: Partial<BatchProcessingConfig> = {}
  ): Promise<StreamingBatchResult> {
    const startTime = Date.now();
    console.log(`🔄 Batch Processing: Starting streaming batch of ${files.length} files`);
    
    const finalConfig: BatchProcessingConfig = {
      maxConcurrent: 3,
      timeoutMs: 30000,
      retryAttempts: 2,
      enableStreaming: true,
      costLimit: 1.0,
      qualityThreshold: 0.7,
      ...config
    };
    
    // Analyze and group files
    const batchFiles = await this.analyzeAndGroupFiles(files, userId);
    
    // Initialize streaming result
    let streamingResult: StreamingBatchResult = {
      completed: [],
      failed: [],
      inProgress: batchFiles.all.map(f => f.id),
      total: files.length,
      progress: 0,
      estimatedTimeRemaining: this.estimateTotalTime(batchFiles.all),
      insights: [],
      summary: { totalAmount: 0, categories: {}, merchants: {} }
    };
    
    // Process files in priority order with streaming updates
    const allFiles = [
      ...batchFiles.simple,
      ...batchFiles.medium,
      ...batchFiles.complex
    ].sort((a, b) => b.priority - a.priority);
    
    // Process files with concurrency control
    const semaphore = new Semaphore(finalConfig.maxConcurrent);
    const processingPromises: Promise<void>[] = [];
    
    for (const file of allFiles) {
      const promise = semaphore.acquire().then(async (release) => {
        try {
          // Update progress
          streamingResult.inProgress = streamingResult.inProgress.filter(id => id !== file.id);
          onProgress(streamingResult);
          
          // Process file
          const result = await this.processFile(file, userId, finalConfig);
          
          // Update results
          if (result.success) {
            streamingResult.completed.push(result);
          } else {
            streamingResult.failed.push(result);
          }
          
          // Update progress
          streamingResult.progress = Math.round(
            ((streamingResult.completed.length + streamingResult.failed.length) / files.length) * 100
          );
          
          // Update insights and summary
          streamingResult.insights = await this.generateBatchInsights(streamingResult.completed, userId);
          streamingResult.summary = this.generateSummary(streamingResult.completed);
          
          // Update estimated time remaining
          const elapsed = Date.now() - startTime;
          const remaining = streamingResult.inProgress.length;
          streamingResult.estimatedTimeRemaining = remaining > 0 ? 
            Math.round((elapsed / (streamingResult.completed.length + streamingResult.failed.length)) * remaining) : 0;
          
          // Send progress update
          onProgress(streamingResult);
          
        } finally {
          release();
        }
      });
      
      processingPromises.push(promise);
    }
    
    // Wait for all processing to complete
    await Promise.all(processingPromises);
    
    // Final update
    streamingResult.inProgress = [];
    streamingResult.progress = 100;
    streamingResult.estimatedTimeRemaining = 0;
    onProgress(streamingResult);
    
    return streamingResult;
  }

  // Analyze files and group by complexity
  private async analyzeAndGroupFiles(files: File[], userId: string): Promise<{
    simple: BatchFile[];
    medium: BatchFile[];
    complex: BatchFile[];
    all: BatchFile[];
  }> {
    const batchFiles: BatchFile[] = [];
    
    for (const file of files) {
      const complexity = await this.analyzeFileComplexity(file);
      const estimatedTime = this.estimateProcessingTime(complexity, file.size);
      const priority = this.calculatePriority(complexity, file.size);
      
      const batchFile: BatchFile = {
        id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        complexity,
        estimatedProcessingTime: estimatedTime,
        priority,
        metadata: {
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        }
      };
      
      batchFiles.push(batchFile);
    }
    
    return {
      simple: batchFiles.filter(f => f.complexity === 'simple'),
      medium: batchFiles.filter(f => f.complexity === 'medium'),
      complex: batchFiles.filter(f => f.complexity === 'complex'),
      all: batchFiles
    };
  }

  // Analyze file complexity
  private async analyzeFileComplexity(file: File): Promise<'simple' | 'medium' | 'complex'> {
    // Simple heuristics for complexity
    if (file.size < 500000) { // < 500KB
      return 'simple';
    } else if (file.size < 2000000) { // < 2MB
      return 'medium';
    } else {
      return 'complex';
    }
  }

  // Estimate processing time
  private estimateProcessingTime(complexity: 'simple' | 'medium' | 'complex', size: number): number {
    const baseTime = {
      simple: 1000,
      medium: 3000,
      complex: 8000
    };
    
    const sizeFactor = Math.log(size / 100000) / Math.log(2); // Logarithmic scaling
    return Math.round(baseTime[complexity] * (1 + sizeFactor * 0.1));
  }

  // Calculate priority
  private calculatePriority(complexity: 'simple' | 'medium' | 'complex', size: number): number {
    const complexityPriority = {
      simple: 100,
      medium: 50,
      complex: 10
    };
    
    const sizeBonus = Math.max(0, 50 - Math.log(size / 100000)); // Smaller files get higher priority
    return complexityPriority[complexity] + sizeBonus;
  }

  // Process simple files
  private async processSimpleFiles(
    files: BatchFile[], 
    userId: string, 
    config: BatchProcessingConfig
  ): Promise<BatchResult[]> {
    console.log(`🔄 Batch Processing: Processing ${files.length} simple files`);
    
    const results: BatchResult[] = [];
    
    // Process simple files in parallel
    const promises = files.map(file => this.processFile(file, userId, config));
    const fileResults = await Promise.allSettled(promises);
    
    fileResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          id: files[index].id,
          success: false,
          error: result.reason?.message || 'Unknown error',
          processingTime: 0,
          cost: 0,
          confidence: 0});
      }
    });
    
    return results;
  }

  // Process medium complexity files
  private async processMediumFiles(
    files: BatchFile[], 
    userId: string, 
    config: BatchProcessingConfig
  ): Promise<BatchResult[]> {
    console.log(`🔄 Batch Processing: Processing ${files.length} medium files`);
    
    const results: BatchResult[] = [];
    
    // Process medium files with limited concurrency
    const semaphore = new Semaphore(Math.min(config.maxConcurrent, 3));
    const promises = files.map(file => 
      semaphore.acquire().then(async (release) => {
        try {
          return await this.processFile(file, userId, config);
        } finally {
          release();
        }
      })
    );
    
    const fileResults = await Promise.allSettled(promises);
    
    fileResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({
          id: files[index].id,
          success: false,
          error: result.reason?.message || 'Unknown error',
          processingTime: 0,
          cost: 0,
          confidence: 0});
      }
    });
    
    return results;
  }

  // Process complex files
  private async processComplexFiles(
    files: BatchFile[], 
    userId: string, 
    config: BatchProcessingConfig
  ): Promise<BatchResult[]> {
    console.log(`🔄 Batch Processing: Processing ${files.length} complex files`);
    
    const results: BatchResult[] = [];
    
    // Process complex files sequentially with higher timeout
    for (const file of files) {
      const complexConfig = {
        ...config,
        timeoutMs: config.timeoutMs * 2, // Double timeout for complex files
        maxConcurrent: 1 // Sequential processing
      };
      
      try {
        const result = await this.processFile(file, userId, complexConfig);
        results.push(result);
      } catch (error) {
        results.push({
          id: file.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          processingTime: 0,
          cost: 0,
          confidence: 0});
      }
    }
    
    return results;
  }

  // Process individual file
  private async processFile(
    file: BatchFile, 
    userId: string, 
    config: BatchProcessingConfig
  ): Promise<BatchResult> {
    const startTime = Date.now();
    
    try {
      // Check cost limit
      if (this.processingStats.totalCost >= config.costLimit) {
        throw new Error('Cost limit exceeded');
      }
      
      // Process with enhanced OCR system
      const result = await enhancedOCRSystem.processReceipt(file.file, userId);
      
      const processingTime = Date.now() - startTime;
      
      // Check quality threshold
      if (result.success && result.data && result.data.confidence < config.qualityThreshold) {
        console.log(`🔄 Batch Processing: Low quality result for ${file.id}, confidence: ${result.data.confidence}`);
      }
      
      return {
        id: file.id,
        success: result.success,
        data: result.data,
        error: result.error,
        processingTime,
        cost: result.cost,
        confidence: result.data?.confidence || 0
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      return {
        id: file.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
        cost: 0,
        confidence: 0
      };
    }
  }

  // Generate batch insights
  private async generateBatchInsights(results: BatchResult[], userId: string): Promise<string[]> {
    const insights: string[] = [];
    
    if (results.length === 0) return insights;
    
    // Calculate statistics
    const totalAmount = results
      .filter(r => r.success && r.data?.amount)
      .reduce((sum, r) => sum + (r.data?.amount || 0), 0);
    
    const successRate = (results.filter(r => r.success).length / results.length) * 100;
    const averageConfidence = results
      .filter(r => r.success && r.data?.confidence)
      .reduce((sum, r) => sum + (r.data?.confidence || 0), 0) / results.length;
    
    // Generate insights
    insights.push(`Processed ${results.length} receipts with ${successRate.toFixed(1)}% success rate`);
    insights.push(`Total amount: $${totalAmount.toFixed(2)}`);
    insights.push(`Average confidence: ${(averageConfidence * 100).toFixed(1)}%`);
    
    // Category insights
    const categories = new Map<string, number>();
    results.forEach(r => {
      if (r.success && r.data?.category) {
        const count = categories.get(r.data.category) || 0;
        categories.set(r.data.category, count + 1);
      }
    });
    
    const topCategory = Array.from(categories.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topCategory) {
      insights.push(`Most common category: ${topCategory[0]} (${topCategory[1]} receipts)`);
    }
    
    // Merchant insights
    const merchants = new Map<string, number>();
    results.forEach(r => {
      if (r.success && r.data?.merchant) {
        const count = merchants.get(r.data.merchant) || 0;
        merchants.set(r.data.merchant, count + 1);
      }
    });
    
    const topMerchant = Array.from(merchants.entries())
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topMerchant) {
      insights.push(`Most frequent merchant: ${topMerchant[0]} (${topMerchant[1]} receipts)`);
    }
    
    // Learning insights
    const learningMetrics = enhancedLearningSystem.getUserLearningMetrics(userId);
    if (learningMetrics.totalCorrections > 0) {
      insights.push(`Learning accuracy: ${(learningMetrics.accuracy * 100).toFixed(1)}%`);
    }
    
    return insights;
  }

  // Generate summary
  private generateSummary(results: BatchResult[]): {
    totalAmount: number;
    categories: Record<string, number>;
    merchants: Record<string, number>;
  } {
    const summary = {
      totalAmount: 0,
      categories: {} as Record<string, number>,
      merchants: {} as Record<string, number>
    };
    
    results.forEach(r => {
      if (r.success && r.data) {
        summary.totalAmount += r.data.amount || 0;
        
        if (r.data.category) {
          summary.categories[r.data.category] = (summary.categories[r.data.category] || 0) + 1;
        }
        
        if (r.data.merchant) {
          summary.merchants[r.data.merchant] = (summary.merchants[r.data.merchant] || 0) + 1;
        }
      }
    });
    
    return summary;
  }

  // Estimate total processing time
  private estimateTotalTime(files: BatchFile[]): number {
    return files.reduce((total, file) => total + file.estimatedProcessingTime, 0);
  }

  // Update processing statistics
  private updateStats(results: BatchResult[], totalTime: number): void {
    this.processingStats.totalProcessed += results.length;
    
    const successful = results.filter(r => r.success);
    this.processingStats.successRate = 
      (this.processingStats.successRate * (this.processingStats.totalProcessed - results.length) + 
       successful.length) / this.processingStats.totalProcessed;
    
    const totalProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0);
    this.processingStats.averageTime = 
      (this.processingStats.averageTime * (this.processingStats.totalProcessed - results.length) + 
       totalProcessingTime) / this.processingStats.totalProcessed;
    
    const totalCost = results.reduce((sum, r) => sum + r.cost, 0);
    this.processingStats.totalCost += totalCost;
    
    this.processingStats.throughput = results.length / (totalTime / 1000); // files per second
  }

  // Get processing statistics
  getProcessingStats() {
    return { ...this.processingStats };
  }

  // Clear processing queue
  clearQueue(): void {
    this.processingQueue = [];
    this.activeProcessing.clear();
    this.completedResults = [];
    this.failedResults = [];
  }
}

// Semaphore for concurrency control
class Semaphore {
  private permits: number;
  private waiting: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) next();
    }
  }
}

// Export singleton instance
export const batchProcessingOptimizer = new BatchProcessingOptimizer();
