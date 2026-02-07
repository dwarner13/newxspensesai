/**
 * Smart OCR Manager
 * 
 * Intelligently selects the best OCR engine based on image analysis
 * Provides fallback mechanisms and cost optimization
 */

import { getSupabase } from '@/lib/supabase';
import { requestOcrProcessing, pollOcrCompletion } from '@/lib/ocr/requestOcrProcessing';
import { parseReceiptText } from './ocrService';

export interface SmartOCRResult {
  text: string;
  confidence: number;
  engine: 'backend';
  processingTime: number;
  imageAnalysis: {
    text: string;
    confidence: number;
    language: string;
    textBlocks: Array<{
      text: string;
      confidence: number;
      boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
    imageQuality: {
      blur: number;
      brightness: number;
      contrast: number;
      resolution: number;
    };
  };
  parsedData: {
    vendor: string;
    date: string;
    total: number;
    items: Array<{ description: string; amount: number; confidence?: number }>;
    category: string;
    confidence: number;
    rawText: string;
  };
  cost: {
    engine: string;
    estimatedCost: number;
    reason: string;
  };
}

export interface OCRStats {
  totalRequests: number;
  googleVisionRequests: number;
  ocrSpaceRequests: number;
  fallbackRequests: number;
  totalCost: number;
  averageConfidence: number;
  averageProcessingTime: number;
}

class SmartOCRManager {
  private stats: OCRStats = {
    totalRequests: 0,
    googleVisionRequests: 0,
    ocrSpaceRequests: 0,
    fallbackRequests: 0,
    totalCost: 0,
    averageConfidence: 0,
    averageProcessingTime: 0
  };

  /**
   * Main OCR processing method with intelligent engine selection
   */
  async processImage(imageFile: File): Promise<SmartOCRResult> {
    const startTime = Date.now();
    this.stats.totalRequests++;

    try {
      const userId = await this.resolveUserId();
      const ocrRequest = await requestOcrProcessing({ file: imageFile, userId });
      if (!ocrRequest.ok || !ocrRequest.documentId) {
        throw new Error(ocrRequest.error || 'OCR request failed');
      }

      const ocrStatus = await pollOcrCompletion(ocrRequest.documentId, userId);
      if (!ocrStatus.ok || !ocrStatus.ocrText) {
        throw new Error(ocrStatus.error || 'OCR processing did not return text');
      }

      const parsedData = parseReceiptText(ocrStatus.ocrText);
      const result: SmartOCRResult = {
        text: ocrStatus.ocrText,
        confidence: parsedData.confidence || 0.6,
        engine: 'backend',
        processingTime: Date.now() - startTime,
        imageAnalysis: {
          text: ocrStatus.ocrText,
          confidence: parsedData.confidence || 0.6,
          language: 'en',
          textBlocks: [],
          imageQuality: {
            blur: 0,
            brightness: 0,
            contrast: 0,
            resolution: 0
          }
        },
        parsedData: {
          ...parsedData,
          rawText: ocrStatus.ocrText
        },
        cost: {
          engine: 'Backend OCR',
          estimatedCost: 0,
          reason: 'Server-side OCR with guardrails'
        }
      };

      // Step 3: Update statistics
      this.updateStats(result, 0);

      // Step 4: Log result for monitoring
      this.logOCRResult(result, { reason: 'Server-side OCR pipeline' });

      return result;

    } catch (error) {
      console.error('Smart OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error}`);
    }
  }

  private async resolveUserId(): Promise<string> {
    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase client not available');
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user?.id) {
      throw new Error('User not authenticated');
    }
    return data.user.id;
  }

  /**
   * Update statistics
   */
  private updateStats(result: SmartOCRResult, cost: number): void {
    this.stats.totalCost += cost;
    
    // Update average confidence
    const totalConfidence = this.stats.averageConfidence * (this.stats.totalRequests - 1) + result.confidence;
    this.stats.averageConfidence = totalConfidence / this.stats.totalRequests;
    
    // Update average processing time
    const totalTime = this.stats.averageProcessingTime * (this.stats.totalRequests - 1) + result.processingTime;
    this.stats.averageProcessingTime = totalTime / this.stats.totalRequests;
  }

  /**
   * Log OCR result for monitoring and optimization
   */
  private logOCRResult(result: SmartOCRResult, engineSelection: any): void {
    console.log('Smart OCR Result:', {
      engine: result.engine,
      confidence: result.confidence,
      processingTime: result.processingTime,
      cost: result.cost.estimatedCost,
      reason: engineSelection.reason,
      vendor: result.parsedData.vendor,
      total: result.parsedData.total,
      itemsCount: result.parsedData.items.length});
  }

  /**
   * Get current statistics
   */
  getStats(): OCRStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      googleVisionRequests: 0,
      ocrSpaceRequests: 0,
      fallbackRequests: 0,
      totalCost: 0,
      averageConfidence: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Get cost optimization recommendations
   */
  getCostOptimizationRecommendations(): {
    currentCost: number;
    potentialSavings: number;
    recommendations: string[];
  } {
    const totalRequests = this.stats.totalRequests;
    const googleVisionRequests = this.stats.googleVisionRequests;
    const ocrSpaceRequests = this.stats.ocrSpaceRequests;
    
    if (totalRequests === 0) {
      return {
        currentCost: 0,
        potentialSavings: 0,
        recommendations: ['No data available for analysis']
      };
    }

    const currentCost = this.stats.totalCost;
    const googleVisionRatio = googleVisionRequests / totalRequests;
    const ocrSpaceRatio = ocrSpaceRequests / totalRequests;
    
    const recommendations: string[] = [];
    let potentialSavings = 0;

    // Analyze usage patterns
    if (googleVisionRatio > 0.7 || ocrSpaceRatio > 0.7) {
      recommendations.push('OCR runs server-side; tune provider selection in backend if needed');
    }

    if (this.stats.averageProcessingTime > 5000) {
      recommendations.push('Processing time is high - consider image optimization');
    }

    if (recommendations.length === 0) {
      recommendations.push('OCR usage is well optimized');
    }

    return {
      currentCost,
      potentialSavings,
      recommendations
    };
  }
}

// Export singleton instance
export const smartOCRManager = new SmartOCRManager();

// Export convenience functions
export const processImageWithSmartOCR = (imageFile: File): Promise<SmartOCRResult> => {
  return smartOCRManager.processImage(imageFile);
};

export const getOCRStats = (): OCRStats => {
  return smartOCRManager.getStats();
};

export const getCostOptimizationRecommendations = () => {
  return smartOCRManager.getCostOptimizationRecommendations();
};
