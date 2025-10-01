/**
 * Complete Document Processing Pipeline
 * Orchestrates the entire document processing workflow with progress tracking and error handling
 */

import { documentHandler, DocumentProcessingResult, ProcessingOptions } from './documentHandler';
import { advancedOCRService, OCRResult, OCROptions } from './advancedOCRService';
import { multiLayerCategorizationEngine, CategorizationResult, TransactionData } from './multiLayerCategorizationEngine';
import { categoryLearningSystem, CategorySuggestion } from './categoryLearningSystem';
import { aiEmployeeDocumentProcessor, AIEmployeeResponse, DocumentProcessingContext } from './aiEmployeeDocumentProcessor';

export interface PipelineProgress {
  stage: 'upload' | 'validation' | 'ocr' | 'parsing' | 'categorization' | 'learning' | 'ai-response' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  details?: any;
  timestamp: string;
}

export interface PipelineResult {
  success: boolean;
  data: any[];
  aiResponse: AIEmployeeResponse;
  processingTime: number;
  metadata: {
    fileType: string;
    fileName: string;
    fileSize: number;
    totalTransactions: number;
    categoriesFound: number;
    averageConfidence: number;
    flaggedForReview: number;
  };
  errors?: string[];
  warnings?: string[];
  progress: PipelineProgress[];
}

export interface PipelineOptions {
  enableOCR?: boolean;
  enableAI?: boolean;
  enableLearning?: boolean;
  enableBytePersonality?: boolean;
  userPreferences?: any;
  bankSpecific?: boolean;
  customCategories?: string[];
  onProgress?: (progress: PipelineProgress) => void;
  onError?: (error: Error, stage: string) => void;
}

/**
 * Document Processing Pipeline
 */
export class DocumentProcessingPipeline {
  private progressCallbacks: Set<(progress: PipelineProgress) => void> = new Set();
  private errorCallbacks: Set<(error: Error, stage: string) => void> = new Set();
  private isProcessing: boolean = false;
  private currentProgress: PipelineProgress[] = [];

  constructor() {
    this.initializePipeline();
  }

  /**
   * Main pipeline entry point
   */
  async processDocument(
    file: File,
    options: PipelineOptions = {}
  ): Promise<PipelineResult> {
    if (this.isProcessing) {
      throw new Error('Pipeline is already processing a document');
    }

    this.isProcessing = true;
    this.currentProgress = [];
    const startTime = Date.now();

    try {
      // Stage 1: Upload and Validation
      await this.updateProgress('upload', 10, 'Uploading and validating file...', { fileName: file.name});
      const validationResult = await this.validateFile(file);
      if (!validationResult.valid) {
        throw new Error(`File validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Stage 2: OCR Processing (if needed)
      let ocrResult: OCRResult | null = null;
      if (options.enableOCR && this.needsOCR(file)) {
        await this.updateProgress('ocr', 25, 'Extracting text with OCR...', { fileType: file.type});
        ocrResult = await this.processOCR(file, options);
      }

      // Stage 3: Document Parsing
      await this.updateProgress('parsing', 50, 'Parsing document structure...', { fileType: file.type});
      const parsingResult = await this.parseDocument(file, options, ocrResult);

      // Stage 4: Categorization
      await this.updateProgress('categorization', 75, 'Categorizing transactions...', { 
        transactionCount: parsingResult.data.length});
      const categorizationResult = await this.categorizeTransactions(parsingResult, options);

      // Stage 5: Learning System
      await this.updateProgress('learning', 85, 'Applying learning algorithms...');
      await this.applyLearning(categorizationResult, options);

      // Stage 6: AI Employee Response
      let aiResponse: AIEmployeeResponse | null = null;
      if (options.enableBytePersonality !== false) {
        await this.updateProgress('ai-response', 95, 'Generating AI employee response...');
        aiResponse = await this.generateAIResponse(file, parsingResult, categorizationResult, options);
      }

      // Stage 7: Complete
      await this.updateProgress('complete', 100, 'Processing complete!', {
        totalTransactions: parsingResult.data.length,
        categoriesFound: new Set(categorizationResult.map(r => r.category)).size});

      const result: PipelineResult = {
        success: true,
        data: parsingResult.data,
        aiResponse: aiResponse || this.getDefaultAIResponse(),
        processingTime: Date.now() - startTime,
        metadata: {
          fileType: parsingResult.metadata.fileType,
          fileName: parsingResult.metadata.fileName,
          fileSize: parsingResult.metadata.fileSize,
          totalTransactions: parsingResult.data.length,
          categoriesFound: new Set(categorizationResult.map(r => r.category)).size,
          averageConfidence: categorizationResult.reduce((sum, r) => sum + r.confidence, 0) / categorizationResult.length,
          flaggedForReview: categorizationResult.filter(r => r.flagForReview).length
        },
        warnings: parsingResult.warnings,
        progress: this.currentProgress
      };

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      await this.updateProgress('error', 0, `Error: ${errorMessage}`, { error: errorMessage});
      
      if (options.onError) {
        options.onError(error instanceof Error ? error : new Error(errorMessage), 'pipeline');
      }

      return {
        success: false,
        data: [],
        aiResponse: this.getErrorAIResponse(errorMessage),
        processingTime: Date.now() - startTime,
        metadata: {
          fileType: file.type || 'unknown',
          fileName: file.name,
          fileSize: file.size,
          totalTransactions: 0,
          categoriesFound: 0,
          averageConfidence: 0,
          flaggedForReview: 0
        },
        errors: [errorMessage],
        progress: this.currentProgress
      };

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Validate file before processing
   */
  private async validateFile(file: File): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (file.size > maxSize) {
      errors.push(`File size (${(file.size / 1024 / 1024).toFixed(1)}MB) exceeds maximum allowed size (10MB)`);
    }

    if (file.size === 0) {
      errors.push('File is empty');
    }

    const supportedTypes = ['application/pdf', 'text/csv', 'image/jpeg', 'image/png', 'image/gif', 'text/plain'];
    if (!supportedTypes.includes(file.type) && !file.name.match(/\.(pdf|csv|jpg|jpeg|png|gif|txt)$/i)) {
      errors.push(`Unsupported file format. Supported formats: PDF, CSV, JPG, PNG, GIF, TXT`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if file needs OCR processing
   */
  private needsOCR(file: File): boolean {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif'];
    return imageTypes.includes(file.type) || file.name.match(/\.(jpg|jpeg|png|gif)$/i) !== null;
  }

  /**
   * Process OCR for image files
   */
  private async processOCR(file: File, options: PipelineOptions): Promise<OCRResult> {
    const ocrOptions: OCROptions = {
      language: 'eng',
      orientation: true,
      scale: true,
      provider: 'auto',
      fallback: true,
      confidence: 0.7
    };

    return await advancedOCRService.extractText(file, ocrOptions);
  }

  /**
   * Parse document structure
   */
  private async parseDocument(
    file: File,
    options: PipelineOptions,
    ocrResult: OCRResult | null
  ): Promise<DocumentProcessingResult> {
    const processingOptions: ProcessingOptions = {
      enableOCR: options.enableOCR,
      enableAI: options.enableAI,
      enableLearning: options.enableLearning,
      userPreferences: options.userPreferences,
      bankSpecific: options.bankSpecific,
      customCategories: options.customCategories
    };

    return await documentHandler.processDocument(file, processingOptions);
  }

  /**
   * Categorize transactions
   */
  private async categorizeTransactions(
    parsingResult: DocumentProcessingResult,
    options: PipelineOptions
  ): Promise<CategorizationResult[]> {
    const categorizationResults: CategorizationResult[] = [];

    for (const transaction of parsingResult.data) {
      const transactionData: TransactionData = {
        description: transaction.description || '',
        amount: transaction.amount,
        date: transaction.date,
        vendor: transaction.vendor,
        type: transaction.type,
        metadata: transaction
      };

      const userPreferences = {
        userId: options.userPreferences?.userId,
        customCategories: options.customCategories,
        spendingPatterns: options.userPreferences?.spendingPatterns,
        goals: options.userPreferences?.goals
      };

      const result = await multiLayerCategorizationEngine.categorize(transactionData, userPreferences);
      categorizationResults.push(result);
    }

    return categorizationResults;
  }

  /**
   * Apply learning algorithms
   */
  private async applyLearning(
    categorizationResults: CategorizationResult[],
    options: PipelineOptions
  ): Promise<void> {
    if (!options.enableLearning || !options.userPreferences?.userId) {
      return;
    }

    // Update learning patterns based on categorization results
    for (const result of categorizationResults) {
      if (result.confidence > 0.8) {
        // High confidence results can be used for learning
        await categoryLearningSystem.processFeedback({
          transactionId: result.reasoning, // This should be transaction ID
          originalCategory: 'Uncategorized',
          correctedCategory: result.category,
          correctedSubcategory: result.subcategory,
          userId: options.userPreferences.userId,
          timestamp: new Date().toISOString(),
          confidence: result.confidence,
          reasoning: result.reasoning});
      }
    }
  }

  /**
   * Generate AI employee response
   */
  private async generateAIResponse(
    file: File,
    parsingResult: DocumentProcessingResult,
    categorizationResults: CategorizationResult[],
    options: PipelineOptions
  ): Promise<AIEmployeeResponse> {
    const context: DocumentProcessingContext = {
      userId: options.userPreferences?.userId,
      userPreferences: options.userPreferences,
      processingHistory: this.currentProgress,
      currentGoals: options.userPreferences?.goals,
      spendingLimits: options.userPreferences?.spendingLimits
    };

    return await aiEmployeeDocumentProcessor.processDocumentWithAIEmployee(file, context);
  }

  /**
   * Update progress and notify callbacks
   */
  private async updateProgress(
    stage: PipelineProgress['stage'],
    progress: number,
    message: string,
    details?: any
  ): Promise<void> {
    const progressUpdate: PipelineProgress = {
      stage,
      progress,
      message,
      details,
      timestamp: new Date().toISOString()
    };

    this.currentProgress.push(progressUpdate);

    // Notify all progress callbacks
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progressUpdate);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }

  /**
   * Get default AI response
   */
  private getDefaultAIResponse(): AIEmployeeResponse {
    return {
      employee: 'Byte',
      personality: 'Energetic, detail-oriented, and enthusiastic about data organization',
      response: 'Document processed successfully! All transactions have been categorized and organized.',
      technicalAnalysis: {
        processingTime: 0,
        confidence: 0.8,
        dataExtracted: 0,
        categoriesAssigned: 0,
        learningApplied: false
      },
      insights: {
        spendingPatterns: [],
        anomalies: [],
        recommendations: [],
        questions: []
      },
      categorizationSummary: {
        totalTransactions: 0,
        categoriesFound: 0,
        confidence: 0.8,
        flaggedForReview: 0
      }
    };
  }

  /**
   * Get error AI response
   */
  private getErrorAIResponse(errorMessage: string): AIEmployeeResponse {
    return {
      employee: 'Byte',
      personality: 'Energetic, detail-oriented, and enthusiastic about data organization',
      response: `Oops! I encountered an error while processing your document: ${errorMessage}. Let's try again!`,
      technicalAnalysis: {
        processingTime: 0,
        confidence: 0,
        dataExtracted: 0,
        categoriesAssigned: 0,
        learningApplied: false
      },
      insights: {
        anomalies: [errorMessage],
        recommendations: ['Try uploading a different file format', 'Check file size and format'],
        questions: ['Would you like to try uploading a different file?']
      },
      categorizationSummary: {
        totalTransactions: 0,
        categoriesFound: 0,
        confidence: 0,
        flaggedForReview: 0
      }
    };
  }

  /**
   * Add progress callback
   */
  addProgressCallback(callback: (progress: PipelineProgress) => void): void {
    this.progressCallbacks.add(callback);
  }

  /**
   * Remove progress callback
   */
  removeProgressCallback(callback: (progress: PipelineProgress) => void): void {
    this.progressCallbacks.delete(callback);
  }

  /**
   * Add error callback
   */
  addErrorCallback(callback: (error: Error, stage: string) => void): void {
    this.errorCallbacks.add(callback);
  }

  /**
   * Remove error callback
   */
  removeErrorCallback(callback: (error: Error, stage: string) => void): void {
    this.errorCallbacks.delete(callback);
  }

  /**
   * Get current processing status
   */
  getProcessingStatus(): { isProcessing: boolean; progress: PipelineProgress[] } {
    return {
      isProcessing: this.isProcessing,
      progress: [...this.currentProgress]
    };
  }

  /**
   * Cancel current processing
   */
  cancelProcessing(): void {
    if (this.isProcessing) {
      this.isProcessing = false;
      this.updateProgress('error', 0, 'Processing cancelled by user');
    }
  }

  /**
   * Initialize pipeline
   */
  private initializePipeline(): void {
    console.log('Document Processing Pipeline initialized');
  }

  /**
   * Get pipeline statistics
   */
  async getPipelineStatistics(): Promise<{
    totalProcessed: number;
    averageProcessingTime: number;
    successRate: number;
    mostCommonFileTypes: Array<{ type: string; count: number }>;
  }> {
    // This would typically query a database for statistics
    // For now, return mock data
    return {
      totalProcessed: 0,
      averageProcessingTime: 0,
      successRate: 0,
      mostCommonFileTypes: []
    };
  }
}

// Export singleton instance
export const documentProcessingPipeline = new DocumentProcessingPipeline();
