/**
 * AI Employee Document Processing Integration
 * Integrates AI employee personalities (Byte) into document processing workflow
 */

import { documentHandler, DocumentProcessingResult, ProcessingOptions } from './documentHandler';
import { advancedOCRService, OCRResult } from './advancedOCRService';
import { multiLayerCategorizationEngine, CategorizationResult, TransactionData } from './multiLayerCategorizationEngine';
import { categoryLearningSystem, CategorySuggestion } from './categoryLearningSystem';

export interface AIEmployeeResponse {
  employee: string;
  personality: string;
  response: string;
  technicalAnalysis: {
    processingTime: number;
    confidence: number;
    dataExtracted: number;
    categoriesAssigned: number;
    learningApplied: boolean;
  };
  insights: {
    spendingPatterns?: string[];
    anomalies?: string[];
    recommendations?: string[];
    questions?: string[];
  };
  categorizationSummary: {
    totalTransactions: number;
    categoriesFound: number;
    confidence: number;
    flaggedForReview: number;
  };
  nextSteps?: string[];
  userQuestions?: string[];
}

export interface DocumentProcessingContext {
  userId?: string;
  userPreferences?: any;
  processingHistory?: any[];
  currentGoals?: any[];
  spendingLimits?: any[];
}

export interface BytePersonality {
  name: string;
  role: string;
  personality: string;
  expertise: string[];
  communicationStyle: string;
  responseTemplates: {
    greeting: string;
    processing: string;
    completion: string;
    error: string;
    question: string;
  };
}

/**
 * AI Employee Document Processor
 * Specialized for Byte - Document Processing & Categorization Expert
 */
export class AIEmployeeDocumentProcessor {
  private bytePersonality: BytePersonality;

  constructor() {
    this.bytePersonality = {
      name: 'Byte',
      role: 'Document Processing & Categorization Expert',
      personality: 'Energetic, detail-oriented, and enthusiastic about data organization',
      expertise: ['OCR', 'PDF parsing', 'CSV processing', 'Receipt analysis', 'Smart categorization', 'Pattern recognition'],
      communicationStyle: 'Friendly, technical, and encouraging with emoji usage',
      responseTemplates: {
        greeting: 'Hey there! 👋 Byte here, your document processing wizard! I\'m super excited to help you organize your financial data. Let me take a look at what you\'ve got!',
        processing: '🔍 Analyzing your document... This is where the magic happens! I\'m using my advanced OCR and AI categorization powers to extract every detail.',
        completion: '🎉 Fantastic! I\'ve successfully processed your document and organized everything beautifully! Here\'s what I found:',
        error: 'Oops! 😅 I ran into a little hiccup while processing your document. But don\'t worry, I\'m here to help fix it!',
        question: '🤔 I have a quick question to make sure I categorize everything perfectly for you:'
      }
    };
  }

  /**
   * Main entry point for AI employee document processing
   */
  async processDocumentWithAIEmployee(
    file: File,
    context: DocumentProcessingContext = {}
  ): Promise<AIEmployeeResponse> {
    const startTime = Date.now();
    
    try {
      // Step 1: Byte's greeting and initial analysis
      const greeting = this.generateByteGreeting(file, context);
      
      // Step 2: Document processing with Byte's personality
      const processingResult = await this.processDocumentWithBytePersonality(file, context);
      
      // Step 3: AI-powered categorization with Byte's insights
      const categorizationResult = await this.categorizeWithByteInsights(processingResult, context);
      
      // Step 4: Generate Byte's response with personality
      const response = await this.generateByteResponse(
        file,
        processingResult,
        categorizationResult,
        context,
        Date.now() - startTime
      );

      return response;

    } catch (error) {
      return this.generateByteErrorResponse(error, file, context);
    }
  }

  /**
   * Process document with Byte's personality and expertise
   */
  private async processDocumentWithBytePersonality(
    file: File,
    context: DocumentProcessingContext
  ): Promise<DocumentProcessingResult> {
    const options: ProcessingOptions = {
      enableOCR: true,
      enableAI: true,
      enableLearning: true,
      userPreferences: context.userPreferences,
      bankSpecific: true,
      customCategories: context.userPreferences?.customCategories
    };

    return await documentHandler.processDocument(file, options);
  }

  /**
   * Categorize transactions with Byte's insights and personality
   */
  private async categorizeWithByteInsights(
    processingResult: DocumentProcessingResult,
    context: DocumentProcessingContext
  ): Promise<CategorizationResult[]> {
    const categorizationResults: CategorizationResult[] = [];

    for (const transaction of processingResult.data) {
      const transactionData: TransactionData = {
        description: transaction.description || '',
        amount: transaction.amount,
        date: transaction.date,
        vendor: transaction.vendor,
        type: transaction.type,
        metadata: transaction
      };

      const userPreferences = {
        userId: context.userId,
        customCategories: context.userPreferences?.customCategories,
        spendingPatterns: context.userPreferences?.spendingPatterns,
        goals: context.currentGoals
      };

      const result = await multiLayerCategorizationEngine.categorize(transactionData, userPreferences);
      categorizationResults.push(result);
    }

    return categorizationResults;
  }

  /**
   * Generate Byte's response with personality and insights
   */
  private async generateByteResponse(
    file: File,
    processingResult: DocumentProcessingResult,
    categorizationResults: CategorizationResult[],
    context: DocumentProcessingContext,
    processingTime: number
  ): Promise<AIEmployeeResponse> {
    const totalTransactions = processingResult.data.length;
    const categoriesFound = new Set(categorizationResults.map(r => r.category)).size;
    const avgConfidence = categorizationResults.reduce((sum, r) => sum + r.confidence, 0) / categorizationResults.length;
    const flaggedForReview = categorizationResults.filter(r => r.flagForReview).length;

    // Generate Byte's personality-driven response
    const response = await this.generatePersonalityResponse(
      file,
      processingResult,
      categorizationResults,
      context,
      processingTime
    );

    // Generate insights
    const insights = await this.generateByteInsights(categorizationResults, context);

    // Generate user questions
    const userQuestions = await this.generateByteQuestions(categorizationResults, context);

    return {
      employee: this.bytePersonality.name,
      personality: this.bytePersonality.personality,
      response,
      technicalAnalysis: {
        processingTime,
        confidence: avgConfidence,
        dataExtracted: totalTransactions,
        categoriesAssigned: categoriesFound,
        learningApplied: true
      },
      insights,
      categorizationSummary: {
        totalTransactions,
        categoriesFound,
        confidence: avgConfidence,
        flaggedForReview
      },
      userQuestions
    };
  }

  /**
   * Generate Byte's personality-driven response
   */
  private async generatePersonalityResponse(
    file: File,
    processingResult: DocumentProcessingResult,
    categorizationResults: CategorizationResult[],
    context: DocumentProcessingContext,
    processingTime: number
  ): Promise<string> {
    const fileType = processingResult.metadata.fileType;
    const totalTransactions = processingResult.data.length;
    const categoriesFound = new Set(categorizationResults.map(r => r.category)).size;
    const avgConfidence = categorizationResults.reduce((sum, r) => sum + r.confidence, 0) / categorizationResults.length;

    let response = this.bytePersonality.responseTemplates.completion + '\n\n';

    // Add file-specific insights
    response += `📄 **File Analysis:**\n`;
    response += `• File type: ${fileType.toUpperCase()}\n`;
    response += `• Processing time: ${(processingTime / 1000).toFixed(1)}s\n`;
    response += `• Transactions found: ${totalTransactions}\n`;
    response += `• Categories identified: ${categoriesFound}\n`;
    response += `• Average confidence: ${(avgConfidence * 100).toFixed(1)}%\n\n`;

    // Add categorization insights
    response += `🏷️ **Categorization Results:**\n`;
    const categoryBreakdown = this.getCategoryBreakdown(categorizationResults);
    categoryBreakdown.slice(0, 5).forEach(({ category, count, confidence }) => {
      response += `• ${category}: ${count} transactions (${(confidence * 100).toFixed(0)}% confidence)\n`;
    });

    if (categoryBreakdown.length > 5) {
      response += `• ... and ${categoryBreakdown.length - 5} more categories\n`;
    }

    response += '\n';

    // Add Byte's personality touches
    if (avgConfidence > 0.8) {
      response += `🎯 **Byte's Assessment:** I'm super confident about these categorizations! My AI brain is firing on all cylinders today! 🧠✨\n\n`;
    } else if (avgConfidence > 0.6) {
      response += `🤔 **Byte's Assessment:** Pretty good results! I'm mostly confident, but there are a few transactions I'd love to double-check with you.\n\n`;
    } else {
      response += `🔍 **Byte's Assessment:** I found some tricky transactions that need your expert eye! Let's work together to get these categorized perfectly.\n\n`;
    }

    // Add learning insights
    response += `📚 **Learning Applied:** I've learned from your previous categorizations and applied those patterns to make these suggestions even better! My memory is getting sharper every day! 🧠💪\n\n`;

    return response;
  }

  /**
   * Generate Byte's insights
   */
  private async generateByteInsights(
    categorizationResults: CategorizationResult[],
    context: DocumentProcessingContext
  ): Promise<AIEmployeeResponse['insights']> {
    const insights: AIEmployeeResponse['insights'] = {
      spendingPatterns: [],
      anomalies: [],
      recommendations: [],
      questions: []
    };

    // Analyze spending patterns
    const categoryBreakdown = this.getCategoryBreakdown(categorizationResults);
    const topCategory = categoryBreakdown[0];
    
    if (topCategory) {
      insights.spendingPatterns?.push(
        `Your top spending category is ${topCategory.category} with ${topCategory.count} transactions`
      );
    }

    // Look for anomalies
    const lowConfidenceTransactions = categorizationResults.filter(r => r.confidence < 0.6);
    if (lowConfidenceTransactions.length > 0) {
      insights.anomalies?.push(
        `${lowConfidenceTransactions.length} transactions need manual review due to low confidence`
      );
    }

    // Generate recommendations
    if (context.currentGoals) {
      insights.recommendations?.push(
        'Consider setting up spending alerts for your tracked categories'
      );
    }

    insights.recommendations?.push(
      'Review the flagged transactions to improve future categorization accuracy'
    );

    return insights;
  }

  /**
   * Generate Byte's questions for the user
   */
  private async generateByteQuestions(
    categorizationResults: CategorizationResult[],
    context: DocumentProcessingContext
  ): Promise<string[]> {
    const questions: string[] = [];

    // Questions about low confidence transactions
    const lowConfidenceTransactions = categorizationResults.filter(r => r.confidence < 0.6);
    if (lowConfidenceTransactions.length > 0) {
      questions.push(
        `I found ${lowConfidenceTransactions.length} transactions that I'm not 100% sure about. Would you like to review and correct them?`
      );
    }

    // Questions about new categories
    const newCategories = categorizationResults.filter(r => r.source === 'semantic-ai' || r.source === 'adaptive-learning');
    if (newCategories.length > 0) {
      questions.push(
        'I discovered some new spending patterns! Should I create custom categories for these?'
      );
    }

    // Questions about goals
    if (context.currentGoals && context.currentGoals.length > 0) {
      questions.push(
        'Would you like me to track your progress toward your financial goals with this data?'
      );
    }

    return questions;
  }

  /**
   * Generate Byte's greeting
   */
  private generateByteGreeting(file: File, context: DocumentProcessingContext): string {
    let greeting = this.bytePersonality.responseTemplates.greeting + '\n\n';
    
    greeting += `📁 **File Details:**\n`;
    greeting += `• Name: ${file.name}\n`;
    greeting += `• Size: ${(file.size / 1024 / 1024).toFixed(2)} MB\n`;
    greeting += `• Type: ${file.type || 'Unknown'}\n\n`;
    
    greeting += `🚀 **Ready to Process:** I'm going to use my advanced OCR and AI categorization powers to extract and organize all your financial data. This is going to be awesome! ✨\n\n`;
    
    return greeting;
  }

  /**
   * Generate Byte's error response
   */
  private generateByteErrorResponse(
    error: any,
    file: File,
    context: DocumentProcessingContext
  ): AIEmployeeResponse {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    let response = this.bytePersonality.responseTemplates.error + '\n\n';
    response += `🔧 **Technical Details:**\n`;
    response += `• Error: ${errorMessage}\n`;
    response += `• File: ${file.name}\n`;
    response += `• Time: ${new Date().toLocaleTimeString()}\n\n`;
    
    response += `💡 **Byte's Suggestions:**\n`;
    response += `• Try uploading a different file format (CSV, PDF, or image)\n`;
    response += `• Make sure the file isn't corrupted or password-protected\n`;
    response += `• Check that the file size is under 10MB\n\n`;
    
    response += `I'm here to help! Let's try again and get your data organized! 🎯`;

    return {
      employee: this.bytePersonality.name,
      personality: this.bytePersonality.personality,
      response,
      technicalAnalysis: {
        processingTime: 0,
        confidence: 0,
        dataExtracted: 0,
        categoriesAssigned: 0,
        learningApplied: false
      },
      insights: {
        anomalies: [errorMessage],
        recommendations: ['Try a different file format', 'Check file size and format']
      },
      categorizationSummary: {
        totalTransactions: 0,
        categoriesFound: 0,
        confidence: 0,
        flaggedForReview: 0
      },
      userQuestions: ['Would you like to try uploading a different file?']
    };
  }

  /**
   * Get category breakdown from categorization results
   */
  private getCategoryBreakdown(categorizationResults: CategorizationResult[]): Array<{
    category: string;
    count: number;
    confidence: number;
  }> {
    const categoryMap = new Map<string, { count: number; totalConfidence: number }>();

    categorizationResults.forEach(result => {
      const existing = categoryMap.get(result.category) || { count: 0, totalConfidence: 0 };
      categoryMap.set(result.category, {
        count: existing.count + 1,
        totalConfidence: existing.totalConfidence + result.confidence
      });
    });

    return Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        confidence: data.totalConfidence / data.count
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get Byte's personality information
   */
  getBytePersonality(): BytePersonality {
    return this.bytePersonality;
  }

  /**
   * Process feedback for learning
   */
  async processUserFeedback(
    transactionId: string,
    originalCategory: string,
    correctedCategory: string,
    correctedSubcategory: string,
    userId: string,
    confidence: number = 0.8
  ): Promise<void> {
    await categoryLearningSystem.processFeedback({
      transactionId,
      originalCategory,
      correctedCategory,
      correctedSubcategory,
      userId,
      timestamp: new Date().toISOString(),
      confidence,
      reasoning: 'User correction via Byte interface'
    });
  }
}

// Export singleton instance
export const aiEmployeeDocumentProcessor = new AIEmployeeDocumentProcessor();
