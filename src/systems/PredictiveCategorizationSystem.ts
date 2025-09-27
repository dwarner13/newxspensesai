// Predictive Categorization System using Image Features before OCR completes
import { PreprocessedImage } from './EnhancedOCRSystem';
import { enhancedLearningSystem } from './EnhancedLearningSystem';

export interface ImageFeatures {
  colorHistogram: number[];
  textLayout: string;
  detectedLogos: string[];
  complexity: 'simple' | 'medium' | 'complex';
  aspectRatio: number;
  brightness: number;
  contrast: number;
  edgeDensity: number;
  textDensity: number;
  logoConfidence: number;
}

export interface PredictionResult {
  likelyMerchant: string;
  likelyCategory: string;
  likelySubcategory: string;
  confidence: number;
  factors: string[];
  alternatives: Array<{
    merchant: string;
    category: string;
    confidence: number;
  }>;
  processingTime: number;
}

export interface MerchantSignature {
  name: string;
  logoPatterns: string[];
  colorSignatures: number[][];
  layoutPatterns: string[];
  confidence: number;
  category: string;
  subcategory: string;
}

export interface CategoryModel {
  name: string;
  visualFeatures: {
    typicalColors: number[][];
    layoutPatterns: string[];
    complexityRange: [number, number];
    aspectRatioRange: [number, number];
  };
  merchantSignatures: MerchantSignature[];
  confidence: number;
}

export class PredictiveCategorizationSystem {
  private merchantSignatures: Map<string, MerchantSignature>;
  private categoryModels: Map<string, CategoryModel>;
  private predictionCache: Map<string, PredictionResult>;
  private processingStats = {
    totalPredictions: 0,
    averageAccuracy: 0,
    averageProcessingTime: 0,
    cacheHitRate: 0
  };

  constructor() {
    this.merchantSignatures = new Map();
    this.categoryModels = new Map();
    this.predictionCache = new Map();
    
    this.initializeMerchantSignatures();
    this.initializeCategoryModels();
  }

  private initializeMerchantSignatures(): void {
    const signatures: MerchantSignature[] = [
      {
        name: 'Starbucks',
        logoPatterns: ['green-logo', 'circular-logo', 'siren-logo'],
        colorSignatures: [
          [0, 100, 0], // Green
          [255, 255, 255], // White
          [0, 0, 0] // Black
        ],
        layoutPatterns: ['header-centered', 'text-sparse', 'logo-prominent'],
        confidence: 0.95,
        category: 'Food & Dining',
        subcategory: 'Coffee & Tea'
      },
      {
        name: 'McDonald\'s',
        logoPatterns: ['yellow-logo', 'golden-arches', 'red-logo'],
        colorSignatures: [
          [255, 215, 0], // Gold
          [255, 0, 0], // Red
          [255, 255, 255] // White
        ],
        layoutPatterns: ['header-centered', 'text-dense', 'logo-prominent'],
        confidence: 0.9,
        category: 'Food & Dining',
        subcategory: 'Fast Food'
      },
      {
        name: 'Walmart',
        logoPatterns: ['blue-logo', 'spark-logo', 'text-logo'],
        colorSignatures: [
          [0, 100, 200], // Blue
          [255, 255, 255], // White
          [0, 0, 0] // Black
        ],
        layoutPatterns: ['header-left', 'text-dense', 'logo-subtle'],
        confidence: 0.85,
        category: 'Shopping',
        subcategory: 'General'
      },
      {
        name: 'Target',
        logoPatterns: ['red-logo', 'bullseye-logo', 'circular-logo'],
        colorSignatures: [
          [255, 0, 0], // Red
          [255, 255, 255], // White
          [0, 0, 0] // Black
        ],
        layoutPatterns: ['header-centered', 'text-medium', 'logo-prominent'],
        confidence: 0.9,
        category: 'Shopping',
        subcategory: 'General'
      },
      {
        name: 'Shell',
        logoPatterns: ['yellow-logo', 'shell-logo', 'red-logo'],
        colorSignatures: [
          [255, 215, 0], // Yellow
          [255, 0, 0], // Red
          [255, 255, 255] // White
        ],
        layoutPatterns: ['header-centered', 'text-sparse', 'logo-prominent'],
        confidence: 0.9,
        category: 'Transportation',
        subcategory: 'Gas'
      },
      {
        name: 'Uber',
        logoPatterns: ['black-logo', 'square-logo', 'text-logo'],
        colorSignatures: [
          [0, 0, 0], // Black
          [255, 255, 255], // White
          [100, 100, 100] // Gray
        ],
        layoutPatterns: ['header-centered', 'text-sparse', 'logo-prominent'],
        confidence: 0.85,
        category: 'Transportation',
        subcategory: 'Ride Share'
      }
    ];

    signatures.forEach(signature => {
      this.merchantSignatures.set(signature.name.toLowerCase(), signature);
    });
  }

  private initializeCategoryModels(): void {
    const models: CategoryModel[] = [
      {
        name: 'Food & Dining',
        visualFeatures: {
          typicalColors: [
            [255, 215, 0], // Gold/Yellow
            [255, 0, 0], // Red
            [0, 100, 0], // Green
            [255, 255, 255] // White
          ],
          layoutPatterns: ['header-centered', 'text-sparse', 'logo-prominent'],
          complexityRange: [0.2, 0.6],
          aspectRatioRange: [0.5, 2.0]
        },
        merchantSignatures: [],
        confidence: 0.8
      },
      {
        name: 'Shopping',
        visualFeatures: {
          typicalColors: [
            [0, 100, 200], // Blue
            [255, 0, 0], // Red
            [255, 255, 255], // White
            [0, 0, 0] // Black
          ],
          layoutPatterns: ['header-left', 'text-dense', 'logo-subtle'],
          complexityRange: [0.4, 0.8],
          aspectRatioRange: [0.3, 3.0]
        },
        merchantSignatures: [],
        confidence: 0.75
      },
      {
        name: 'Transportation',
        visualFeatures: {
          typicalColors: [
            [255, 215, 0], // Yellow
            [255, 0, 0], // Red
            [0, 0, 0], // Black
            [100, 100, 100] // Gray
          ],
          layoutPatterns: ['header-centered', 'text-sparse', 'logo-prominent'],
          complexityRange: [0.1, 0.5],
          aspectRatioRange: [0.5, 2.0]
        },
        merchantSignatures: [],
        confidence: 0.8
      }
    ];

    models.forEach(model => {
      this.categoryModels.set(model.name, model);
    });
  }

  // Main predictive categorization method
  async predictCategory(
    preprocessedImage: PreprocessedImage, 
    userId: string
  ): Promise<PredictionResult> {
    const startTime = Date.now();
    console.log(`🔮 Predictive Categorization: Analyzing image features for user ${userId}`);
    
    try {
      // Check cache first
      const cacheKey = await this.generateImageHash(preprocessedImage.original);
      const cached = this.predictionCache.get(cacheKey);
      if (cached) {
        console.log(`🔮 Predictive Categorization: Using cached prediction`);
        this.updateStats(cached.processingTime, true, true);
        return cached;
      }
      
      // Extract image features
      const features = await this.extractImageFeatures(preprocessedImage);
      console.log(`🔮 Predictive Categorization: Extracted features - complexity: ${features.complexity}, logos: ${features.detectedLogos.length}`);
      
      // Predict merchant based on visual features
      const merchantPrediction = await this.predictMerchant(features);
      
      // Predict category based on visual features
      const categoryPrediction = await this.predictCategoryFromFeatures(features);
      
      // Combine predictions
      const combinedPrediction = this.combinePredictions(merchantPrediction, categoryPrediction, features);
      
      // Apply user-specific learning
      const userAdjustedPrediction = await this.applyUserLearning(combinedPrediction, userId);
      
      // Generate factors
      const factors = this.generatePredictionFactors(features, merchantPrediction, categoryPrediction);
      
      // Create result
      const result: PredictionResult = {
        likelyMerchant: userAdjustedPrediction.merchant,
        likelyCategory: userAdjustedPrediction.category,
        likelySubcategory: userAdjustedPrediction.subcategory,
        confidence: userAdjustedPrediction.confidence,
        factors,
        alternatives: userAdjustedPrediction.alternatives,
        processingTime: Date.now() - startTime
      };
      
      // Cache result
      this.predictionCache.set(cacheKey, result);
      
      // Update stats
      this.updateStats(result.processingTime, true, false);
      
      console.log(`🔮 Predictive Categorization: Prediction complete - ${result.likelyMerchant} > ${result.likelyCategory} (${result.confidence})`);
      
      return result;
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateStats(processingTime, false, false);
      
      console.error(`🔮 Predictive Categorization: Prediction failed:`, error);
      
      // Return fallback prediction
      return {
        likelyMerchant: 'Unknown',
        likelyCategory: 'Other',
        likelySubcategory: 'General',
        confidence: 0.1,
        factors: ['Prediction failed, using fallback'],
        alternatives: [],
        processingTime
      };
    }
  }

  // Extract comprehensive image features
  private async extractImageFeatures(preprocessedImage: PreprocessedImage): Promise<ImageFeatures> {
    const features = preprocessedImage.features;
    
    // Calculate additional features
    const aspectRatio = features.width / features.height;
    const brightness = this.calculateBrightness(features.colorHistogram);
    const contrast = this.calculateContrast(features.colorHistogram);
    const edgeDensity = this.calculateEdgeDensity(preprocessedImage);
    const textDensity = this.calculateTextDensity(preprocessedImage);
    const logoConfidence = this.calculateLogoConfidence(features.detectedLogos);
    
    return {
      colorHistogram: features.colorHistogram,
      textLayout: features.textLayout,
      detectedLogos: features.detectedLogos,
      complexity: features.complexity,
      aspectRatio,
      brightness,
      contrast,
      edgeDensity,
      textDensity,
      logoConfidence
    };
  }

  private calculateBrightness(histogram: number[]): number {
    let weightedSum = 0;
    let totalPixels = 0;
    
    for (let i = 0; i < histogram.length; i++) {
      weightedSum += i * histogram[i];
      totalPixels += histogram[i];
    }
    
    return totalPixels > 0 ? weightedSum / totalPixels / 255 : 0.5;
  }

  private calculateContrast(histogram: number[]): number {
    const brightness = this.calculateBrightness(histogram);
    let variance = 0;
    let totalPixels = 0;
    
    for (let i = 0; i < histogram.length; i++) {
      const diff = (i / 255) - brightness;
      variance += diff * diff * histogram[i];
      totalPixels += histogram[i];
    }
    
    return totalPixels > 0 ? Math.sqrt(variance / totalPixels) : 0.1;
  }

  private calculateEdgeDensity(preprocessedImage: PreprocessedImage): number {
    // Simplified edge density calculation
    // In a real implementation, this would use edge detection algorithms
    const complexity = preprocessedImage.features.complexity;
    
    switch (complexity) {
      case 'simple': return 0.2;
      case 'medium': return 0.5;
      case 'complex': return 0.8;
      default: return 0.3;
    }
  }

  private calculateTextDensity(preprocessedImage: PreprocessedImage): number {
    // Simplified text density calculation
    const layout = preprocessedImage.features.textLayout;
    
    switch (layout) {
      case 'sparse': return 0.2;
      case 'medium': return 0.5;
      case 'dense': return 0.8;
      default: return 0.3;
    }
  }

  private calculateLogoConfidence(detectedLogos: string[]): number {
    if (detectedLogos.length === 0) return 0;
    if (detectedLogos.length === 1) return 0.6;
    if (detectedLogos.length >= 2) return 0.9;
    return 0.3;
  }

  // Predict merchant based on visual features
  private async predictMerchant(features: ImageFeatures): Promise<{
    merchant: string;
    confidence: number;
    alternatives: Array<{merchant: string; confidence: number}>;
  }> {
    const predictions: Array<{merchant: string; confidence: number}> = [];
    
    // Check against merchant signatures
    for (const [name, signature] of this.merchantSignatures.entries()) {
      let confidence = 0;
      
      // Check logo patterns
      const logoMatch = signature.logoPatterns.some(pattern => 
        features.detectedLogos.includes(pattern)
      );
      if (logoMatch) confidence += 0.4;
      
      // Check color signatures
      const colorMatch = this.checkColorSignature(features.colorHistogram, signature.colorSignatures);
      if (colorMatch) confidence += 0.3;
      
      // Check layout patterns
      const layoutMatch = signature.layoutPatterns.includes(features.textLayout);
      if (layoutMatch) confidence += 0.2;
      
      // Check complexity
      const complexityMatch = this.checkComplexityMatch(features.complexity, signature);
      if (complexityMatch) confidence += 0.1;
      
      if (confidence > 0.3) {
        predictions.push({ merchant: signature.name, confidence });
      }
    }
    
    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);
    
    if (predictions.length === 0) {
      return {
        merchant: 'Unknown',
        confidence: 0.1,
        alternatives: []
      };
    }
    
    return {
      merchant: predictions[0].merchant,
      confidence: predictions[0].confidence,
      alternatives: predictions.slice(1, 4)
    };
  }

  // Predict category based on visual features
  private async predictCategoryFromFeatures(features: ImageFeatures): Promise<{
    category: string;
    subcategory: string;
    confidence: number;
    alternatives: Array<{category: string; confidence: number}>;
  }> {
    const predictions: Array<{category: string; confidence: number}> = [];
    
    // Check against category models
    for (const [name, model] of this.categoryModels.entries()) {
      let confidence = 0;
      
      // Check color patterns
      const colorMatch = this.checkColorPattern(features.colorHistogram, model.visualFeatures.typicalColors);
      if (colorMatch) confidence += 0.3;
      
      // Check layout patterns
      const layoutMatch = model.visualFeatures.layoutPatterns.includes(features.textLayout);
      if (layoutMatch) confidence += 0.2;
      
      // Check complexity range
      const complexityMatch = this.checkComplexityRange(features.complexity, model.visualFeatures.complexityRange);
      if (complexityMatch) confidence += 0.2;
      
      // Check aspect ratio
      const aspectRatioMatch = this.checkAspectRatio(features.aspectRatio, model.visualFeatures.aspectRatioRange);
      if (aspectRatioMatch) confidence += 0.1;
      
      // Check brightness and contrast
      const brightnessMatch = this.checkBrightnessContrast(features.brightness, features.contrast, model);
      if (brightnessMatch) confidence += 0.2;
      
      if (confidence > 0.2) {
        predictions.push({ category: name, confidence });
      }
    }
    
    // Sort by confidence
    predictions.sort((a, b) => b.confidence - a.confidence);
    
    if (predictions.length === 0) {
      return {
        category: 'Other',
        subcategory: 'General',
        confidence: 0.1,
        alternatives: []
      };
    }
    
    // Get subcategory from top prediction
    const topCategory = predictions[0].category;
    const subcategory = this.getSubcategoryFromCategory(topCategory, features);
    
    return {
      category: topCategory,
      subcategory,
      confidence: predictions[0].confidence,
      alternatives: predictions.slice(1, 4)
    };
  }

  // Helper methods for feature matching
  private checkColorSignature(histogram: number[], signatures: number[][]): boolean {
    // Simplified color signature matching
    // In a real implementation, this would use more sophisticated color analysis
    return signatures.some(signature => {
      const signatureMatch = signature.every((color, index) => {
        const bin = Math.floor(color / 255 * histogram.length);
        return histogram[bin] > 0;
      });
      return signatureMatch;
    });
  }

  private checkColorPattern(histogram: number[], patterns: number[][]): boolean {
    // Check if histogram matches any of the typical color patterns
    return patterns.some(pattern => {
      let matchCount = 0;
      pattern.forEach(color => {
        const bin = Math.floor(color / 255 * histogram.length);
        if (histogram[bin] > 0) matchCount++;
      });
      return matchCount >= pattern.length * 0.5; // 50% match threshold
    });
  }

  private checkComplexityMatch(complexity: string, signature: MerchantSignature): boolean {
    // Different merchants have different typical complexity levels
    const complexityMap: Record<string, string[]> = {
      'starbucks': ['simple', 'medium'],
      'mcdonalds': ['simple', 'medium'],
      'walmart': ['medium', 'complex'],
      'target': ['medium', 'complex'],
      'shell': ['simple'],
      'uber': ['simple']
    };
    
    const expectedComplexities = complexityMap[signature.name.toLowerCase()] || ['simple', 'medium', 'complex'];
    return expectedComplexities.includes(complexity);
  }

  private checkComplexityRange(complexity: string, range: [number, number]): boolean {
    const complexityValues = { simple: 0.3, medium: 0.6, complex: 0.9 };
    const value = complexityValues[complexity] || 0.5;
    return value >= range[0] && value <= range[1];
  }

  private checkAspectRatio(aspectRatio: number, range: [number, number]): boolean {
    return aspectRatio >= range[0] && aspectRatio <= range[1];
  }

  private checkBrightnessContrast(brightness: number, contrast: number, model: CategoryModel): boolean {
    // Different categories have different typical brightness/contrast characteristics
    const categoryCharacteristics = {
      'Food & Dining': { brightness: [0.4, 0.8], contrast: [0.3, 0.7] },
      'Shopping': { brightness: [0.5, 0.9], contrast: [0.4, 0.8] },
      'Transportation': { brightness: [0.3, 0.7], contrast: [0.2, 0.6] }
    };
    
    const characteristics = categoryCharacteristics[model.name as keyof typeof categoryCharacteristics];
    if (!characteristics) return true;
    
    const brightnessMatch = brightness >= characteristics.brightness[0] && brightness <= characteristics.brightness[1];
    const contrastMatch = contrast >= characteristics.contrast[0] && contrast <= characteristics.contrast[1];
    
    return brightnessMatch && contrastMatch;
  }

  private getSubcategoryFromCategory(category: string, features: ImageFeatures): string {
    // Map categories to subcategories based on visual features
    const subcategoryMap: Record<string, string[]> = {
      'Food & Dining': ['Coffee & Tea', 'Fast Food', 'Restaurants', 'Groceries'],
      'Shopping': ['General', 'Electronics', 'Clothing', 'Home'],
      'Transportation': ['Gas', 'Ride Share', 'Public Transit', 'Parking']
    };
    
    const subcategories = subcategoryMap[category] || ['General'];
    
    // Use visual features to determine most likely subcategory
    if (features.detectedLogos.includes('green-logo') || features.detectedLogos.includes('circular-logo')) {
      return 'Coffee & Tea';
    }
    
    if (features.detectedLogos.includes('yellow-logo') || features.detectedLogos.includes('golden-arches')) {
      return 'Fast Food';
    }
    
    if (features.detectedLogos.includes('blue-logo') || features.detectedLogos.includes('spark-logo')) {
      return 'General';
    }
    
    if (features.detectedLogos.includes('red-logo') || features.detectedLogos.includes('bullseye-logo')) {
      return 'General';
    }
    
    if (features.detectedLogos.includes('shell-logo')) {
      return 'Gas';
    }
    
    if (features.detectedLogos.includes('black-logo') || features.detectedLogos.includes('square-logo')) {
      return 'Ride Share';
    }
    
    return subcategories[0];
  }

  // Combine merchant and category predictions
  private combinePredictions(
    merchantPrediction: any,
    categoryPrediction: any,
    features: ImageFeatures
  ): {
    merchant: string;
    category: string;
    subcategory: string;
    confidence: number;
    alternatives: Array<{merchant: string; category: string; confidence: number}>;
  } {
    // If merchant prediction is confident, use its category
    if (merchantPrediction.confidence > 0.7) {
      const merchantSignature = this.merchantSignatures.get(merchantPrediction.merchant.toLowerCase());
      if (merchantSignature) {
        return {
          merchant: merchantPrediction.merchant,
          category: merchantSignature.category,
          subcategory: merchantSignature.subcategory,
          confidence: merchantPrediction.confidence,
          alternatives: merchantPrediction.alternatives.map((alt: any) => ({
            merchant: alt.merchant,
            category: this.merchantSignatures.get(alt.merchant.toLowerCase())?.category || 'Other',
            confidence: alt.confidence
          }))
        };
      }
    }
    
    // Otherwise, use category prediction
    return {
      merchant: merchantPrediction.merchant,
      category: categoryPrediction.category,
      subcategory: categoryPrediction.subcategory,
      confidence: Math.max(merchantPrediction.confidence, categoryPrediction.confidence),
      alternatives: [
        ...merchantPrediction.alternatives.map((alt: any) => ({
          merchant: alt.merchant,
          category: this.merchantSignatures.get(alt.merchant.toLowerCase())?.category || 'Other',
          confidence: alt.confidence
        })),
        ...categoryPrediction.alternatives.map((alt: any) => ({
          merchant: 'Unknown',
          category: alt.category,
          confidence: alt.confidence
        }))
      ]
    };
  }

  // Apply user-specific learning
  private async applyUserLearning(
    prediction: any,
    userId: string
  ): Promise<{
    merchant: string;
    category: string;
    subcategory: string;
    confidence: number;
    alternatives: Array<{merchant: string; category: string; confidence: number}>;
  }> {
    try {
      // Get user's learning prediction
      const userPrediction = await enhancedLearningSystem.predictCategory(userId, {
        merchant: prediction.merchant,
        amount: 0, // Not available yet
        description: 'Visual prediction'
      });
      
      // Combine with visual prediction
      const combinedConfidence = (prediction.confidence + userPrediction.confidence) / 2;
      
      // Use user prediction if it's more confident
      if (userPrediction.confidence > prediction.confidence) {
        return {
          merchant: prediction.merchant,
          category: userPrediction.category,
          subcategory: userPrediction.subcategory,
          confidence: combinedConfidence,
          alternatives: prediction.alternatives
        };
      }
      
      return {
        ...prediction,
        confidence: combinedConfidence
      };
      
    } catch (error) {
      console.error('🔮 Predictive Categorization: User learning failed:', error);
      return prediction;
    }
  }

  // Generate prediction factors
  private generatePredictionFactors(
    features: ImageFeatures,
    merchantPrediction: any,
    categoryPrediction: any
  ): string[] {
    const factors: string[] = [];
    
    // Visual factors
    factors.push(`Image complexity: ${features.complexity}`);
    factors.push(`Text layout: ${features.textLayout}`);
    factors.push(`Brightness: ${(features.brightness * 100).toFixed(1)}%`);
    factors.push(`Contrast: ${(features.contrast * 100).toFixed(1)}%`);
    
    // Logo factors
    if (features.detectedLogos.length > 0) {
      factors.push(`Detected logos: ${features.detectedLogos.join(', ')}`);
    }
    
    // Prediction factors
    if (merchantPrediction.confidence > 0.5) {
      factors.push(`Merchant signature match: ${(merchantPrediction.confidence * 100).toFixed(1)}%`);
    }
    
    if (categoryPrediction.confidence > 0.5) {
      factors.push(`Category pattern match: ${(categoryPrediction.confidence * 100).toFixed(1)}%`);
    }
    
    // Processing factors
    factors.push(`Processing time: ${Date.now()}ms`);
    factors.push(`Cache status: ${this.predictionCache.size} entries`);
    
    return factors;
  }

  // Utility methods
  private async generateImageHash(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private updateStats(processingTime: number, success: boolean, cacheHit: boolean): void {
    this.processingStats.totalPredictions++;
    
    this.processingStats.averageProcessingTime = 
      (this.processingStats.averageProcessingTime * (this.processingStats.totalPredictions - 1) + processingTime) / 
      this.processingStats.totalPredictions;
    
    if (success) {
      this.processingStats.averageAccuracy = 
        (this.processingStats.averageAccuracy * (this.processingStats.totalPredictions - 1) + 1) / 
        this.processingStats.totalPredictions;
    } else {
      this.processingStats.averageAccuracy = 
        (this.processingStats.averageAccuracy * (this.processingStats.totalPredictions - 1)) / 
        this.processingStats.totalPredictions;
    }
    
    this.processingStats.cacheHitRate = 
      (this.processingStats.cacheHitRate * (this.processingStats.totalPredictions - 1) + (cacheHit ? 1 : 0)) / 
      this.processingStats.totalPredictions;
  }

  // Public methods
  getProcessingStats() {
    return { ...this.processingStats };
  }

  clearCache(): void {
    this.predictionCache.clear();
  }

  addMerchantSignature(signature: MerchantSignature): void {
    this.merchantSignatures.set(signature.name.toLowerCase(), signature);
  }

  addCategoryModel(model: CategoryModel): void {
    this.categoryModels.set(model.name, model);
  }
}

// Export singleton instance
export const predictiveCategorizationSystem = new PredictiveCategorizationSystem();
