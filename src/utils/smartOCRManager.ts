/**
 * Smart OCR Manager
 * 
 * Intelligently selects the best OCR engine based on image analysis
 * Provides fallback mechanisms and cost optimization
 */

import { extractTextWithGoogleVision, selectOCREngine, parseReceiptWithGoogleVision, ImageAnalysisResult } from './googleVisionService';
import { processImageWithOCR, parseReceiptText } from './ocrService';

export interface SmartOCRResult {
  text: string;
  confidence: number;
  engine: 'google-vision' | 'ocr-space' | 'fallback';
  processingTime: number;
  imageAnalysis: ImageAnalysisResult;
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
      // Step 1: Analyze image to determine best OCR engine
      const engineSelection = await selectOCREngine(imageFile);
      console.log(`Selected OCR engine: ${engineSelection.engine} - ${engineSelection.reason}`);

      let result: SmartOCRResult;
      let cost = 0;

      // Step 2: Process with selected engine
      if (engineSelection.engine === 'google-vision') {
        try {
          const visionResult = await extractTextWithGoogleVision(imageFile);
          const parsedData = parseReceiptWithGoogleVision(visionResult);
          
          result = {
            text: visionResult.text,
            confidence: visionResult.confidence,
            engine: 'google-vision',
            processingTime: Date.now() - startTime,
            imageAnalysis: {
              text: visionResult.text,
              confidence: visionResult.confidence,
              language: 'en',
              textBlocks: visionResult.detectedText.map(block => ({
                text: block.text,
                confidence: block.confidence || 0.8,
                boundingBox: {
                  x: block.boundingBox.vertices[0]?.x || 0,
                  y: block.boundingBox.vertices[0]?.y || 0,
                  width: Math.abs((block.boundingBox.vertices[2]?.x || 0) - (block.boundingBox.vertices[0]?.x || 0)),
                  height: Math.abs((block.boundingBox.vertices[2]?.y || 0) - (block.boundingBox.vertices[0]?.y || 0))
                }
              })),
              imageQuality: {
                blur: 0.2, // Default values, would be calculated in real implementation
                brightness: 0.6,
                contrast: 0.7,
                resolution: 1.0
              }
            },
            parsedData,
            cost: {
              engine: 'Google Vision API',
              estimatedCost: 0.0015, // $1.50 per 1000 requests
              reason: 'High accuracy for complex documents'
            }
          };

          this.stats.googleVisionRequests++;
          cost = 0.0015;

        } catch (visionError) {
          console.warn('Google Vision failed, falling back to OCR.space:', visionError);
          return this.fallbackToOCRSpace(imageFile, startTime, 'Google Vision API failed');
        }

      } else {
        // Use OCR.space for simple images
        try {
          const ocrResult = await processImageWithOCR(imageFile);
          const parsedData = parseReceiptText(ocrResult.text);
          
          result = {
            text: ocrResult.text,
            confidence: ocrResult.confidence,
            engine: 'ocr-space',
            processingTime: Date.now() - startTime,
            imageAnalysis: {
              text: ocrResult.text,
              confidence: ocrResult.confidence,
              language: 'en',
              textBlocks: [],
              imageQuality: {
                blur: 0.1,
                brightness: 0.7,
                contrast: 0.8,
                resolution: 1.0
              }
            },
            parsedData: {
              ...parsedData,
              rawText: ocrResult.text
            },
            cost: {
              engine: 'OCR.space API',
              estimatedCost: 0.0005, // $0.50 per 1000 requests
              reason: 'Cost-effective for simple documents'
            }
          };

          this.stats.ocrSpaceRequests++;
          cost = 0.0005;

        } catch (ocrError) {
          console.error('OCR.space failed:', ocrError);
          throw new Error(`Both OCR engines failed. OCR.space error: ${ocrError}`);
        }
      }

      // Step 3: Update statistics
      this.updateStats(result, cost);

      // Step 4: Log result for monitoring
      this.logOCRResult(result, engineSelection);

      return result;

    } catch (error) {
      console.error('Smart OCR processing failed:', error);
      throw new Error(`OCR processing failed: ${error}`);
    }
  }

  /**
   * Fallback to OCR.space when Google Vision fails
   */
  private async fallbackToOCRSpace(imageFile: File, startTime: number, reason: string): Promise<SmartOCRResult> {
    try {
      const ocrResult = await processImageWithOCR(imageFile);
      const parsedData = parseReceiptText(ocrResult.text);
      
      const result: SmartOCRResult = {
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        engine: 'fallback',
        processingTime: Date.now() - startTime,
        imageAnalysis: {
          text: ocrResult.text,
          confidence: ocrResult.confidence,
          language: 'en',
          textBlocks: [],
          imageQuality: {
            blur: 0.1,
            brightness: 0.7,
            contrast: 0.8,
            resolution: 1.0
          }
        },
        parsedData: {
          ...parsedData,
          rawText: ocrResult.text
        },
        cost: {
          engine: 'OCR.space API (Fallback)',
          estimatedCost: 0.0005,
          reason
        }
      };

      this.stats.fallbackRequests++;
      this.updateStats(result, 0.0005);

      return result;

    } catch (error) {
      throw new Error(`Fallback OCR also failed: ${error}`);
    }
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
    if (googleVisionRatio > 0.7) {
      recommendations.push('Consider optimizing image quality to reduce Google Vision usage');
      potentialSavings += (googleVisionRequests * 0.001); // Potential savings from using OCR.space
    }

    if (ocrSpaceRatio > 0.8 && this.stats.averageConfidence < 0.8) {
      recommendations.push('Consider using Google Vision for better accuracy on complex documents');
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
