// Enhanced Learning System with User-Specific Neural Network Updates
export interface CorrectionPattern {
  id: string;
  userId: string;
  original: {
    merchant: string;
    amount: number;
    description: string;
    category: string;
  };
  corrected: {
    merchant: string;
    amount: number;
    description: string;
    category: string;
  };
  confidence: number;
  context: {
    timestamp: number;
    source: string;
    userBehavior: string;
  };
  usage: number;
  lastUsed: number;
}

export interface UserModel {
  userId: string;
  neuralNetwork: {
    weights: Record<string, number>;
    biases: Record<string, number>;
    layers: number;
  };
  patterns: Map<string, CorrectionPattern>;
  accuracy: number;
  lastUpdated: number;
  trainingData: Array<{
    input: Record<string, number>;
    output: Record<string, number>;
    confidence: number;
  }>;
}

export interface LearningMetrics {
  totalCorrections: number;
  accuracy: number;
  learningRate: number;
  predictionConfidence: number;
  userSatisfaction: number;
}

export interface PredictionResult {
  category: string;
  subcategory: string;
  confidence: number;
  factors: string[];
  alternatives: Array<{category: string; confidence: number}>;
}

export class EnhancedLearningSystem {
  private userModels: Map<string, UserModel>;
  private globalPatterns: Map<string, CorrectionPattern>;
  private learningMetrics: Map<string, LearningMetrics>;
  private pendingCorrections: Map<string, CorrectionPattern[]>;

  constructor() {
    this.userModels = new Map();
    this.globalPatterns = new Map();
    this.learningMetrics = new Map();
    this.pendingCorrections = new Map();
  }

  // Main learning method
  async learnFromCorrection(
    userId: string, 
    original: CorrectionPattern['original'], 
    corrected: CorrectionPattern['corrected']
  ): Promise<void> {
    console.log(`🧠 Enhanced Learning: Learning from correction for user ${userId}`);
    
    // Create correction pattern
    const pattern: CorrectionPattern = {
      id: `correction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      original,
      corrected,
      confidence: 1.0,
      context: {
        timestamp: Date.now(),
        source: 'user_correction',
        userBehavior: 'manual_correction'
      },
      usage: 1,
      lastUsed: Date.now()
    };
    
    // Store correction pattern
    await this.storeCorrectionPattern(pattern);
    
    // Update user's neural network
    await this.updateUserModel(userId, original, corrected);
    
    // Apply to similar pending transactions
    await this.propagateCorrection(userId, original, corrected);
    
    // Update learning metrics
    this.updateLearningMetrics(userId, true);
    
    console.log(`🧠 Enhanced Learning: Correction learned and propagated`);
  }

  // Get user-specific model
  async getUserModel(userId: string): Promise<UserModel> {
    let model = this.userModels.get(userId);
    
    if (!model) {
      model = await this.createBaseModel(userId);
      this.userModels.set(userId, model);
    }
    
    return model;
  }

  // Create base model for new user
  private async createBaseModel(userId: string): Promise<UserModel> {
    console.log(`🧠 Enhanced Learning: Creating base model for user ${userId}`);
    
    const model: UserModel = {
      userId,
      neuralNetwork: {
        weights: this.initializeWeights(),
        biases: this.initializeBiases(),
        layers: 3
      },
      patterns: new Map(),
      accuracy: 0.5, // Start with 50% accuracy
      lastUpdated: Date.now(),
      trainingData: []
    };
    
    // Load any existing patterns from localStorage
    await this.loadUserPatterns(userId, model);
    
    return model;
  }

  private initializeWeights(): Record<string, number> {
    const weights: Record<string, number> = {};
    
    // Initialize weights for different features
    const features = [
      'merchant_similarity',
      'amount_range',
      'description_keywords',
      'time_pattern',
      'category_frequency',
      'user_preference'
    ];
    
    features.forEach(feature => {
      weights[feature] = Math.random() * 0.2 - 0.1; // Random between -0.1 and 0.1
    });
    
    return weights;
  }

  private initializeBiases(): Record<string, number> {
    const biases: Record<string, number> = {};
    
    const categories = [
      'Food & Dining',
      'Transportation',
      'Shopping',
      'Entertainment',
      'Healthcare',
      'Utilities',
      'Education',
      'Travel'
    ];
    
    categories.forEach(category => {
      biases[category] = Math.random() * 0.1 - 0.05; // Small random bias
    });
    
    return biases;
  }

  // Update user model with new correction
  private async updateUserModel(
    userId: string, 
    original: CorrectionPattern['original'], 
    corrected: CorrectionPattern['corrected']
  ): Promise<void> {
    const model = await this.getUserModel(userId);
    
    // Create training data point
    const input = this.extractFeatures(original);
    const output = this.createOutputVector(corrected.category);
    
    // Add to training data
    model.trainingData.push({
      input,
      output,
      confidence: 1.0
    });
    
    // Update neural network weights using backpropagation
    this.updateWeights(model, input, output);
    
    // Update model accuracy
    model.accuracy = this.calculateModelAccuracy(model);
    model.lastUpdated = Date.now();
    
    // Save updated model
    await this.saveUserModel(userId, model);
    
    console.log(`🧠 Enhanced Learning: Model updated for user ${userId}, accuracy: ${model.accuracy.toFixed(3)}`);
  }

  private extractFeatures(original: CorrectionPattern['original']): Record<string, number> {
    return {
      merchant_similarity: this.calculateMerchantSimilarity(original.merchant),
      amount_range: this.normalizeAmount(original.amount),
      description_keywords: this.extractKeywordScore(original.description),
      time_pattern: this.getTimePattern(),
      category_frequency: this.getCategoryFrequency(original.category),
      user_preference: 0.5 // Default preference
    };
  }

  private calculateMerchantSimilarity(merchant: string): number {
    // Simplified similarity calculation
    const commonMerchants = [
      'starbucks', 'mcdonalds', 'walmart', 'target', 'amazon',
      'uber', 'lyft', 'shell', 'chevron', 'exxon'
    ];
    
    const merchantLower = merchant.toLowerCase();
    for (const common of commonMerchants) {
      if (merchantLower.includes(common) || common.includes(merchantLower)) {
        return 0.8;
      }
    }
    
    return 0.2; // Unknown merchant
  }

  private normalizeAmount(amount: number): number {
    // Normalize amount to 0-1 range
    if (amount <= 0) return 0;
    if (amount <= 10) return 0.1;
    if (amount <= 50) return 0.3;
    if (amount <= 100) return 0.5;
    if (amount <= 500) return 0.7;
    return 0.9;
  }

  private extractKeywordScore(description: string): number {
    const keywords = {
      'food': ['food', 'eat', 'restaurant', 'meal', 'dining'],
      'transport': ['uber', 'lyft', 'gas', 'fuel', 'parking'],
      'shopping': ['store', 'shop', 'buy', 'purchase', 'retail']
    };
    
    const descLower = description.toLowerCase();
    let maxScore = 0;
    
    Object.entries(keywords).forEach(([category, words]) => {
      const score = words.filter(word => descLower.includes(word)).length / words.length;
      maxScore = Math.max(maxScore, score);
    });
    
    return maxScore;
  }

  private getTimePattern(): number {
    const hour = new Date().getHours();
    
    // Business hours (9-17) = 0.8, evening (17-22) = 0.6, night (22-9) = 0.2
    if (hour >= 9 && hour < 17) return 0.8;
    if (hour >= 17 && hour < 22) return 0.6;
    return 0.2;
  }

  private getCategoryFrequency(category: string): number {
    // This would be calculated from user's transaction history
    // For now, return a default value
    return 0.5;
  }

  private createOutputVector(category: string): Record<string, number> {
    const categories = [
      'Food & Dining',
      'Transportation',
      'Shopping',
      'Entertainment',
      'Healthcare',
      'Utilities',
      'Education',
      'Travel'
    ];
    
    const output: Record<string, number> = {};
    categories.forEach(cat => {
      output[cat] = cat === category ? 1.0 : 0.0;
    });
    
    return output;
  }

  // Simplified backpropagation for weight updates
  private updateWeights(
    model: UserModel, 
    input: Record<string, number>, 
    output: Record<string, number>
  ): void {
    const learningRate = 0.01;
    
    // Calculate prediction
    const prediction = this.predict(model, input);
    
    // Calculate error
    const error = this.calculateError(prediction, output);
    
    // Update weights based on error
    Object.keys(model.neuralNetwork.weights).forEach(feature => {
      const gradient = error * input[feature];
      model.neuralNetwork.weights[feature] += learningRate * gradient;
    });
    
    // Update biases
    Object.keys(model.neuralNetwork.biases).forEach(category => {
      const gradient = error * (output[category] - prediction[category]);
      model.neuralNetwork.biases[category] += learningRate * gradient;
    });
  }

  private predict(model: UserModel, input: Record<string, number>): Record<string, number> {
    const prediction: Record<string, number> = {};
    
    Object.keys(model.neuralNetwork.biases).forEach(category => {
      let sum = model.neuralNetwork.biases[category];
      
      Object.entries(input).forEach(([feature, value]) => {
        sum += model.neuralNetwork.weights[feature] * value;
      });
      
      // Apply sigmoid activation
      prediction[category] = 1 / (1 + Math.exp(-sum));
    });
    
    return prediction;
  }

  private calculateError(prediction: Record<string, number>, target: Record<string, number>): number {
    let totalError = 0;
    let count = 0;
    
    Object.keys(prediction).forEach(category => {
      const error = Math.pow(target[category] - prediction[category], 2);
      totalError += error;
      count++;
    });
    
    return totalError / count;
  }

  private calculateModelAccuracy(model: UserModel): number {
    if (model.trainingData.length === 0) return 0.5;
    
    let correctPredictions = 0;
    let totalPredictions = 0;
    
    // Test on recent training data
    const recentData = model.trainingData.slice(-10);
    
    recentData.forEach(data => {
      const prediction = this.predict(model, data.input);
      const predictedCategory = Object.keys(prediction).reduce((a, b) => 
        prediction[a] > prediction[b] ? a : b
      );
      
      const actualCategory = Object.keys(data.output).reduce((a, b) => 
        data.output[a] > data.output[b] ? a : b
      );
      
      if (predictedCategory === actualCategory) {
        correctPredictions++;
      }
      totalPredictions++;
    });
    
    return totalPredictions > 0 ? correctPredictions / totalPredictions : 0.5;
  }

  // Propagate correction to similar pending transactions
  private async propagateCorrection(
    userId: string, 
    original: CorrectionPattern['original'], 
    corrected: CorrectionPattern['corrected']
  ): Promise<void> {
    const pending = this.pendingCorrections.get(userId) || [];
    
    if (pending.length === 0) return;
    
    const similarTransactions = pending.filter(pattern => 
      this.areSimilar(original, pattern.original)
    );
    
    if (similarTransactions.length > 0) {
      console.log(`🧠 Enhanced Learning: Propagating correction to ${similarTransactions.length} similar transactions`);
      
      // Apply correction to similar transactions
      similarTransactions.forEach(pattern => {
        pattern.corrected = corrected;
        pattern.confidence = 0.9; // High confidence for propagated corrections
        pattern.usage++;
        pattern.lastUsed = Date.now();
      });
      
      // Remove from pending
      this.pendingCorrections.set(userId, 
        pending.filter(pattern => !similarTransactions.includes(pattern))
      );
    }
  }

  private areSimilar(
    original1: CorrectionPattern['original'], 
    original2: CorrectionPattern['original']
  ): boolean {
    // Check merchant similarity
    const merchantSimilarity = this.calculateMerchantSimilarity(original1.merchant) > 0.7;
    
    // Check amount similarity (within 20%)
    const amountSimilarity = Math.abs(original1.amount - original2.amount) / 
      Math.max(original1.amount, original2.amount) < 0.2;
    
    // Check description similarity
    const descSimilarity = this.calculateDescriptionSimilarity(original1.description, original2.description) > 0.6;
    
    return merchantSimilarity && (amountSimilarity || descSimilarity);
  }

  private calculateDescriptionSimilarity(desc1: string, desc2: string): number {
    const words1 = desc1.toLowerCase().split(/\s+/);
    const words2 = desc2.toLowerCase().split(/\s+/);
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }

  // Store correction pattern
  private async storeCorrectionPattern(pattern: CorrectionPattern): Promise<void> {
    // Store in memory
    this.globalPatterns.set(pattern.id, pattern);
    
    // Store in user model
    const model = await this.getUserModel(pattern.userId);
    model.patterns.set(pattern.id, pattern);
    
    // Save to localStorage
    await this.saveCorrectionPattern(pattern);
  }

  // Save correction pattern to localStorage
  private async saveCorrectionPattern(pattern: CorrectionPattern): Promise<void> {
    try {
      const existing = JSON.parse(localStorage.getItem(`corrections_${pattern.userId}`) || '[]');
      existing.push(pattern);
      localStorage.setItem(`corrections_${pattern.userId}`, JSON.stringify(existing));
    } catch (error) {
      console.error('🧠 Enhanced Learning: Error saving correction pattern:', error);
    }
  }

  // Load user patterns from localStorage
  private async loadUserPatterns(userId: string, model: UserModel): Promise<void> {
    try {
      const patterns = JSON.parse(localStorage.getItem(`corrections_${userId}`) || '[]');
      patterns.forEach((pattern: CorrectionPattern) => {
        model.patterns.set(pattern.id, pattern);
      });
    } catch (error) {
      console.error('🧠 Enhanced Learning: Error loading user patterns:', error);
    }
  }

  // Save user model to localStorage
  private async saveUserModel(userId: string, model: UserModel): Promise<void> {
    try {
      // Convert Map to Object for JSON serialization
      const serializableModel = {
        ...model,
        patterns: Object.fromEntries(model.patterns)
      };
      
      localStorage.setItem(`user_model_${userId}`, JSON.stringify(serializableModel));
    } catch (error) {
      console.error('🧠 Enhanced Learning: Error saving user model:', error);
    }
  }

  // Update learning metrics
  private updateLearningMetrics(userId: string, success: boolean): void {
    let metrics = this.learningMetrics.get(userId);
    
    if (!metrics) {
      metrics = {
        totalCorrections: 0,
        accuracy: 0.5,
        learningRate: 0.01,
        predictionConfidence: 0.5,
        userSatisfaction: 0.5
      };
      this.learningMetrics.set(userId, metrics);
    }
    
    metrics.totalCorrections++;
    
    if (success) {
      metrics.accuracy = Math.min(metrics.accuracy + 0.01, 1.0);
      metrics.userSatisfaction = Math.min(metrics.userSatisfaction + 0.02, 1.0);
    } else {
      metrics.accuracy = Math.max(metrics.accuracy - 0.01, 0.0);
      metrics.userSatisfaction = Math.max(metrics.userSatisfaction - 0.01, 0.0);
    }
    
    // Update prediction confidence based on recent performance
    const model = this.userModels.get(userId);
    if (model) {
      metrics.predictionConfidence = model.accuracy;
    }
  }

  // Get learning metrics for user
  getUserLearningMetrics(userId: string): LearningMetrics {
    return this.learningMetrics.get(userId) || {
      totalCorrections: 0,
      accuracy: 0.5,
      learningRate: 0.01,
      predictionConfidence: 0.5,
      userSatisfaction: 0.5
    };
  }

  // Predict category using user model
  async predictCategory(
    userId: string, 
    transaction: {
      merchant: string;
      amount: number;
      description: string;
    }
  ): Promise<PredictionResult> {
    const model = await this.getUserModel(userId);
    const features = this.extractFeatures({
      merchant: transaction.merchant,
      amount: transaction.amount,
      description: transaction.description,
      category: 'Unknown'
    });
    
    const prediction = this.predict(model, features);
    
    // Get top prediction
    const sortedPredictions = Object.entries(prediction)
      .sort(([, a], [, b]) => b - a);
    
    const topPrediction = sortedPredictions[0];
    const alternatives = sortedPredictions.slice(1, 4).map(([category, confidence]) => ({
      category,
      confidence
    }));
    
    return {
      category: topPrediction[0],
      subcategory: 'General',
      confidence: topPrediction[1],
      factors: [
        `User model accuracy: ${(model.accuracy * 100).toFixed(1)}%`,
        `Total corrections: ${model.patterns.size}`,
        `Last updated: ${new Date(model.lastUpdated).toLocaleDateString()}`
      ],
      alternatives
    };
  }

  // Batch learning from multiple corrections
  async batchLearn(userId: string, corrections: Array<{
    original: CorrectionPattern['original'];
    corrected: CorrectionPattern['corrected'];
  }>): Promise<void> {
    console.log(`🧠 Enhanced Learning: Batch learning ${corrections.length} corrections for user ${userId}`);
    
    for (const correction of corrections) {
      await this.learnFromCorrection(userId, correction.original, correction.corrected);
    }
    
    // Retrain model with all new data
    await this.retrainModel(userId);
  }

  // Retrain model with all training data
  private async retrainModel(userId: string): Promise<void> {
    const model = await this.getUserModel(userId);
    
    if (model.trainingData.length < 10) {
      console.log(`🧠 Enhanced Learning: Not enough training data for retraining (${model.trainingData.length})`);
      return;
    }
    
    console.log(`🧠 Enhanced Learning: Retraining model with ${model.trainingData.length} data points`);
    
    // Multiple epochs of training
    for (let epoch = 0; epoch < 5; epoch++) {
      for (const data of model.trainingData) {
        this.updateWeights(model, data.input, data.output);
      }
    }
    
    // Update accuracy
    model.accuracy = this.calculateModelAccuracy(model);
    model.lastUpdated = Date.now();
    
    // Save updated model
    await this.saveUserModel(userId, model);
    
    console.log(`🧠 Enhanced Learning: Model retrained, new accuracy: ${model.accuracy.toFixed(3)}`);
  }

  // Get system-wide learning statistics
  getSystemLearningStats(): {
    totalUsers: number;
    totalCorrections: number;
    averageAccuracy: number;
    topLearningUsers: Array<{userId: string; accuracy: number; corrections: number}>;
  } {
    const users = Array.from(this.userModels.keys());
    const totalCorrections = Array.from(this.learningMetrics.values())
      .reduce((sum, metrics) => sum + metrics.totalCorrections, 0);
    
    const averageAccuracy = users.length > 0 ? 
      Array.from(this.learningMetrics.values())
        .reduce((sum, metrics) => sum + metrics.accuracy, 0) / users.length : 0;
    
    const topLearningUsers = users
      .map(userId => {
        const model = this.userModels.get(userId);
        const metrics = this.learningMetrics.get(userId);
        return {
          userId,
          accuracy: model?.accuracy || 0,
          corrections: metrics?.totalCorrections || 0
        };
      })
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 10);
    
    return {
      totalUsers: users.length,
      totalCorrections,
      averageAccuracy,
      topLearningUsers
    };
  }
}

// Export singleton instance
export const enhancedLearningSystem = new EnhancedLearningSystem();
