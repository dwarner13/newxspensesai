// Cost Optimization System with Tiered Processing to Minimize API Costs
export interface ProcessingTier {
  name: string;
  cost: number;
  accuracy: number;
  speed: number;
  description: string;
  conditions: {
    maxFileSize: number;
    minConfidence: number;
    maxComplexity: string;
    userTier: string;
  };
}

export interface CostMetrics {
  totalCost: number;
  costPerReceipt: number;
  monthlyBudget: number;
  remainingBudget: number;
  costBreakdown: {
    tesseract: number;
    ocrspace: number;
    openai: number;
    other: number;
  };
  efficiency: {
    accuracy: number;
    speed: number;
    costEffectiveness: number;
  };
}

export interface OptimizationConfig {
  monthlyBudget: number;
  costPerReceiptTarget: number;
  accuracyThreshold: number;
  speedThreshold: number;
  enableTieredProcessing: boolean;
  enableCostTracking: boolean;
  enableBudgetAlerts: boolean;
  userTier: 'free' | 'premium' | 'enterprise';
}

export interface ProcessingDecision {
  tier: ProcessingTier;
  reason: string;
  estimatedCost: number;
  estimatedAccuracy: number;
  estimatedSpeed: number;
  alternatives: Array<{
    tier: ProcessingTier;
    cost: number;
    accuracy: number;
    speed: number;
  }>;
}

export class CostOptimizationSystem {
  private processingTiers: Map<string, ProcessingTier>;
  private costMetrics: CostMetrics;
  private optimizationConfig: OptimizationConfig;
  private processingHistory: Array<{
    timestamp: number;
    tier: string;
    cost: number;
    accuracy: number;
    speed: number;
    success: boolean;
  }>;

  constructor() {
    this.processingTiers = new Map();
    this.costMetrics = {
      totalCost: 0,
      costPerReceipt: 0,
      monthlyBudget: 10.0,
      remainingBudget: 10.0,
      costBreakdown: {
        tesseract: 0,
        ocrspace: 0,
        openai: 0,
        other: 0
      },
      efficiency: {
        accuracy: 0,
        speed: 0,
        costEffectiveness: 0
      }
    };
    this.optimizationConfig = {
      monthlyBudget: 10.0,
      costPerReceiptTarget: 0.02,
      accuracyThreshold: 0.85,
      speedThreshold: 3000,
      enableTieredProcessing: true,
      enableCostTracking: true,
      enableBudgetAlerts: true,
      userTier: 'free'
    };
    this.processingHistory = [];
    
    this.initializeProcessingTiers();
  }

  private initializeProcessingTiers(): void {
    const tiers: ProcessingTier[] = [
      {
        name: 'tesseract',
        cost: 0.0,
        accuracy: 0.7,
        speed: 1000,
        description: 'Local Tesseract OCR - Free but lower accuracy',
        conditions: {
          maxFileSize: 5 * 1024 * 1024, // 5MB
          minConfidence: 0.6,
          maxComplexity: 'medium',
          userTier: 'free'
        }
      },
      {
        name: 'ocrspace',
        cost: 0.001,
        accuracy: 0.8,
        speed: 2000,
        description: 'OCR.space API - Low cost, good accuracy',
        conditions: {
          maxFileSize: 10 * 1024 * 1024, // 10MB
          minConfidence: 0.75,
          maxComplexity: 'complex',
          userTier: 'free'
        }
      },
      {
        name: 'openai',
        cost: 0.01,
        accuracy: 0.95,
        speed: 3000,
        description: 'OpenAI Vision API - High cost, excellent accuracy',
        conditions: {
          maxFileSize: 20 * 1024 * 1024, // 20MB
          minConfidence: 0.9,
          maxComplexity: 'complex',
          userTier: 'premium'
        }
      },
      {
        name: 'hybrid',
        cost: 0.005,
        accuracy: 0.85,
        speed: 2500,
        description: 'Hybrid approach - Tesseract + OCR.space fallback',
        conditions: {
          maxFileSize: 15 * 1024 * 1024, // 15MB
          minConfidence: 0.8,
          maxComplexity: 'complex',
          userTier: 'premium'
        }
      },
      {
        name: 'enterprise',
        cost: 0.02,
        accuracy: 0.98,
        speed: 1500,
        description: 'Enterprise-grade processing with multiple engines',
        conditions: {
          maxFileSize: 50 * 1024 * 1024, // 50MB
          minConfidence: 0.95,
          maxComplexity: 'complex',
          userTier: 'enterprise'
        }
      }
    ];

    tiers.forEach(tier => {
      this.processingTiers.set(tier.name, tier);
    });
  }

  // Main cost optimization method
  async optimizeProcessing(
    file: File,
    extractedData: {
      merchant: string;
      amount: number;
      date: string;
      description: string;
    },
    userId: string,
    userPreferences: {
      prioritizeAccuracy: boolean;
      prioritizeSpeed: boolean;
      prioritizeCost: boolean;
    } = {
      prioritizeAccuracy: false,
      prioritizeSpeed: false,
      prioritizeCost: true
    }
  ): Promise<ProcessingDecision> {
    console.log(`💰 Cost Optimization: Optimizing processing for user ${userId}`);
    
    try {
      // Check budget constraints
      if (this.costMetrics.remainingBudget <= 0) {
        console.log(`💰 Cost Optimization: Budget exceeded, using free tier only`);
        return this.getFreeTierDecision();
      }
      
      // Analyze file characteristics
      const fileAnalysis = await this.analyzeFile(file, extractedData);
      
      // Get available tiers for user
      const availableTiers = this.getAvailableTiers(userId, fileAnalysis);
      
      if (availableTiers.length === 0) {
        console.log(`💰 Cost Optimization: No available tiers, using free tier`);
        return this.getFreeTierDecision();
      }
      
      // Score tiers based on user preferences
      const scoredTiers = this.scoreTiers(availableTiers, userPreferences, fileAnalysis);
      
      // Select best tier
      const bestTier = scoredTiers[0];
      
      // Generate alternatives
      const alternatives = scoredTiers.slice(1, 4).map(tier => ({
        tier: tier.tier,
        cost: tier.tier.cost,
        accuracy: tier.tier.accuracy,
        speed: tier.tier.speed
      }));
      
      const decision: ProcessingDecision = {
        tier: bestTier.tier,
        reason: this.generateDecisionReason(bestTier, userPreferences, fileAnalysis),
        estimatedCost: bestTier.tier.cost,
        estimatedAccuracy: bestTier.tier.accuracy,
        estimatedSpeed: bestTier.tier.speed,
        alternatives
      };
      
      console.log(`💰 Cost Optimization: Selected tier ${bestTier.tier.name} - Cost: $${bestTier.tier.cost}, Accuracy: ${(bestTier.tier.accuracy * 100).toFixed(1)}%`);
      
      return decision;
      
    } catch (error) {
      console.error(`💰 Cost Optimization: Error optimizing processing:`, error);
      
      // Return free tier as fallback
      return this.getFreeTierDecision();
    }
  }

  // Analyze file characteristics
  private async analyzeFile(
    file: File,
    extractedData: {
      merchant: string;
      amount: number;
      date: string;
      description: string;
    }
  ): Promise<{
    size: number;
    complexity: 'simple' | 'medium' | 'complex';
    importance: 'low' | 'medium' | 'high';
    estimatedAccuracy: number;
  }> {
    // Determine complexity based on file size
    let complexity: 'simple' | 'medium' | 'complex' = 'simple';
    if (file.size > 2 * 1024 * 1024) complexity = 'complex';
    else if (file.size > 500 * 1024) complexity = 'medium';
    
    // Determine importance based on amount
    let importance: 'low' | 'medium' | 'high' = 'low';
    if (extractedData.amount > 100) importance = 'high';
    else if (extractedData.amount > 25) importance = 'medium';
    
    // Estimate accuracy based on complexity
    let estimatedAccuracy = 0.8;
    if (complexity === 'simple') estimatedAccuracy = 0.9;
    else if (complexity === 'medium') estimatedAccuracy = 0.8;
    else estimatedAccuracy = 0.7;
    
    return {
      size: file.size,
      complexity,
      importance,
      estimatedAccuracy
    };
  }

  // Get available tiers for user
  private getAvailableTiers(
    userId: string,
    fileAnalysis: {
      size: number;
      complexity: 'simple' | 'medium' | 'complex';
      importance: 'low' | 'medium' | 'high';
      estimatedAccuracy: number;
    }
  ): ProcessingTier[] {
    const availableTiers: ProcessingTier[] = [];
    
    for (const tier of this.processingTiers.values()) {
      // Check user tier
      if (tier.conditions.userTier !== 'free' && this.optimizationConfig.userTier === 'free') {
        continue;
      }
      
      // Check file size
      if (fileAnalysis.size > tier.conditions.maxFileSize) {
        continue;
      }
      
      // Check complexity
      const complexityLevels = { simple: 1, medium: 2, complex: 3 };
      const tierComplexityLevel = complexityLevels[tier.conditions.maxComplexity as keyof typeof complexityLevels];
      const fileComplexityLevel = complexityLevels[fileAnalysis.complexity];
      
      if (fileComplexityLevel > tierComplexityLevel) {
        continue;
      }
      
      // Check budget
      if (tier.cost > this.costMetrics.remainingBudget) {
        continue;
      }
      
      availableTiers.push(tier);
    }
    
    return availableTiers;
  }

  // Score tiers based on user preferences
  private scoreTiers(
    tiers: ProcessingTier[],
    userPreferences: {
      prioritizeAccuracy: boolean;
      prioritizeSpeed: boolean;
      prioritizeCost: boolean;
    },
    fileAnalysis: {
      size: number;
      complexity: 'simple' | 'medium' | 'complex';
      importance: 'low' | 'medium' | 'high';
      estimatedAccuracy: number;
    }
  ): Array<{tier: ProcessingTier; score: number}> {
    const scoredTiers = tiers.map(tier => {
      let score = 0;
      
      // Cost scoring (lower is better)
      const costScore = 1 - (tier.cost / 0.02); // Normalize to 0-1
      score += userPreferences.prioritizeCost ? costScore * 0.4 : costScore * 0.2;
      
      // Accuracy scoring (higher is better)
      const accuracyScore = tier.accuracy;
      score += userPreferences.prioritizeAccuracy ? accuracyScore * 0.4 : accuracyScore * 0.2;
      
      // Speed scoring (lower is better)
      const speedScore = 1 - (tier.speed / 5000); // Normalize to 0-1
      score += userPreferences.prioritizeSpeed ? speedScore * 0.4 : speedScore * 0.2;
      
      // File analysis adjustments
      if (fileAnalysis.importance === 'high' && tier.accuracy > 0.9) {
        score += 0.1; // Bonus for high accuracy on important receipts
      }
      
      if (fileAnalysis.complexity === 'complex' && tier.accuracy > 0.8) {
        score += 0.1; // Bonus for good accuracy on complex files
      }
      
      return { tier, score };
    });
    
    // Sort by score (descending)
    scoredTiers.sort((a, b) => b.score - a.score);
    
    return scoredTiers;
  }

  // Generate decision reason
  private generateDecisionReason(
    scoredTier: {tier: ProcessingTier; score: number},
    userPreferences: {
      prioritizeAccuracy: boolean;
      prioritizeSpeed: boolean;
      prioritizeCost: boolean;
    },
    fileAnalysis: {
      size: number;
      complexity: 'simple' | 'medium' | 'complex';
      importance: 'low' | 'medium' | 'high';
      estimatedAccuracy: number;
    }
  ): string {
    const reasons: string[] = [];
    
    if (userPreferences.prioritizeCost) {
      reasons.push('Cost-optimized selection');
    }
    
    if (userPreferences.prioritizeAccuracy) {
      reasons.push('Accuracy-optimized selection');
    }
    
    if (userPreferences.prioritizeSpeed) {
      reasons.push('Speed-optimized selection');
    }
    
    if (fileAnalysis.importance === 'high') {
      reasons.push('High-value receipt');
    }
    
    if (fileAnalysis.complexity === 'complex') {
      reasons.push('Complex document');
    }
    
    if (scoredTier.tier.cost === 0) {
      reasons.push('Free processing tier');
    }
    
    return reasons.join(', ');
  }

  // Get free tier decision
  private getFreeTierDecision(): ProcessingDecision {
    const freeTier = this.processingTiers.get('tesseract')!;
    
    return {
      tier: freeTier,
      reason: 'Free tier only - budget constraints or user preference',
      estimatedCost: freeTier.cost,
      estimatedAccuracy: freeTier.accuracy,
      estimatedSpeed: freeTier.speed,
      alternatives: []
    };
  }

  // Track processing cost
  async trackProcessingCost(
    tier: string,
    actualCost: number,
    accuracy: number,
    speed: number,
    success: boolean
  ): Promise<void> {
    console.log(`💰 Cost Optimization: Tracking cost - Tier: ${tier}, Cost: $${actualCost}, Success: ${success}`);
    
    // Update cost metrics
    this.costMetrics.totalCost += actualCost;
    this.costMetrics.remainingBudget -= actualCost;
    
    // Update cost breakdown
    const tierInfo = this.processingTiers.get(tier);
    if (tierInfo) {
      if (tier === 'tesseract') {
        this.costMetrics.costBreakdown.tesseract += actualCost;
      } else if (tier === 'ocrspace') {
        this.costMetrics.costBreakdown.ocrspace += actualCost;
      } else if (tier === 'openai') {
        this.costMetrics.costBreakdown.openai += actualCost;
      } else {
        this.costMetrics.costBreakdown.other += actualCost;
      }
    }
    
    // Update processing history
    this.processingHistory.push({
      timestamp: Date.now(),
      tier,
      cost: actualCost,
      accuracy,
      speed,
      success
    });
    
    // Update efficiency metrics
    this.updateEfficiencyMetrics();
    
    // Check budget alerts
    if (this.optimizationConfig.enableBudgetAlerts) {
      await this.checkBudgetAlerts();
    }
    
    // Save to localStorage
    await this.saveCostMetrics();
  }

  // Update efficiency metrics
  private updateEfficiencyMetrics(): void {
    if (this.processingHistory.length === 0) return;
    
    // Calculate average accuracy
    const successfulProcessings = this.processingHistory.filter(p => p.success);
    if (successfulProcessings.length > 0) {
      this.costMetrics.efficiency.accuracy = 
        successfulProcessings.reduce((sum, p) => sum + p.accuracy, 0) / successfulProcessings.length;
    }
    
    // Calculate average speed
    this.costMetrics.efficiency.speed = 
      this.processingHistory.reduce((sum, p) => sum + p.speed, 0) / this.processingHistory.length;
    
    // Calculate cost effectiveness (accuracy per dollar)
    if (this.costMetrics.totalCost > 0) {
      this.costMetrics.efficiency.costEffectiveness = 
        this.costMetrics.efficiency.accuracy / this.costMetrics.totalCost;
    }
    
    // Update cost per receipt
    if (this.processingHistory.length > 0) {
      this.costMetrics.costPerReceipt = this.costMetrics.totalCost / this.processingHistory.length;
    }
  }

  // Check budget alerts
  private async checkBudgetAlerts(): Promise<void> {
    const budgetUsage = (this.costMetrics.totalCost / this.costMetrics.monthlyBudget) * 100;
    
    if (budgetUsage >= 90) {
      console.warn(`💰 Cost Optimization: Budget alert - ${budgetUsage.toFixed(1)}% used`);
      // In a real implementation, this would send an alert to the user
    }
    
    if (budgetUsage >= 100) {
      console.error(`💰 Cost Optimization: Budget exceeded - ${budgetUsage.toFixed(1)}% used`);
      // In a real implementation, this would disable paid processing
    }
  }

  // Save cost metrics to localStorage
  private async saveCostMetrics(): Promise<void> {
    try {
      localStorage.setItem('cost_metrics', JSON.stringify(this.costMetrics));
      localStorage.setItem('processing_history', JSON.stringify(this.processingHistory));
    } catch (error) {
      console.error('💰 Cost Optimization: Error saving cost metrics:', error);
    }
  }

  // Load cost metrics from localStorage
  loadCostMetrics(): void {
    try {
      const savedMetrics = localStorage.getItem('cost_metrics');
      if (savedMetrics) {
        this.costMetrics = { ...this.costMetrics, ...JSON.parse(savedMetrics) };
      }
      
      const savedHistory = localStorage.getItem('processing_history');
      if (savedHistory) {
        this.processingHistory = JSON.parse(savedHistory);
      }
      
      console.log(`💰 Cost Optimization: Loaded cost metrics - Total: $${this.costMetrics.totalCost}, Remaining: $${this.costMetrics.remainingBudget}`);
    } catch (error) {
      console.error('💰 Cost Optimization: Error loading cost metrics:', error);
    }
  }

  // Get cost metrics
  getCostMetrics(): CostMetrics {
    return { ...this.costMetrics };
  }

  // Update optimization configuration
  updateConfig(newConfig: Partial<OptimizationConfig>): void {
    this.optimizationConfig = { ...this.optimizationConfig, ...newConfig };
    console.log('💰 Cost Optimization: Configuration updated');
  }

  // Get optimization configuration
  getConfig(): OptimizationConfig {
    return { ...this.optimizationConfig };
  }

  // Reset monthly budget
  resetMonthlyBudget(): void {
    this.costMetrics.totalCost = 0;
    this.costMetrics.remainingBudget = this.costMetrics.monthlyBudget;
    this.costMetrics.costBreakdown = {
      tesseract: 0,
      ocrspace: 0,
      openai: 0,
      other: 0
    };
    this.processingHistory = [];
    
    console.log('💰 Cost Optimization: Monthly budget reset');
  }

  // Get processing recommendations
  getProcessingRecommendations(): {
    recommendedTier: string;
    reason: string;
    estimatedSavings: number;
    alternatives: string[];
  } {
    const currentCostPerReceipt = this.costMetrics.costPerReceipt;
    const targetCostPerReceipt = this.optimizationConfig.costPerReceiptTarget;
    
    if (currentCostPerReceipt <= targetCostPerReceipt) {
      return {
        recommendedTier: 'current',
        reason: 'Current processing is within cost targets',
        estimatedSavings: 0,
        alternatives: []
      };
    }
    
    // Find cheaper alternatives
    const cheaperTiers = Array.from(this.processingTiers.values())
      .filter(tier => tier.cost < currentCostPerReceipt)
      .sort((a, b) => a.cost - b.cost);
    
    if (cheaperTiers.length === 0) {
      return {
        recommendedTier: 'current',
        reason: 'No cheaper alternatives available',
        estimatedSavings: 0,
        alternatives: []
      };
    }
    
    const recommendedTier = cheaperTiers[0];
    const estimatedSavings = (currentCostPerReceipt - recommendedTier.cost) * this.processingHistory.length;
    
    return {
      recommendedTier: recommendedTier.name,
      reason: `Switch to ${recommendedTier.name} for cost savings`,
      estimatedSavings,
      alternatives: cheaperTiers.slice(1, 4).map(tier => tier.name)
    };
  }

  // Get cost analysis report
  getCostAnalysisReport(): {
    summary: {
      totalCost: number;
      costPerReceipt: number;
      budgetUsage: number;
      efficiency: number;
    };
    breakdown: {
      byTier: Record<string, number>;
      byMonth: Record<string, number>;
      trends: Array<{date: string; cost: number; accuracy: number}>;
    };
    recommendations: string[];
  } {
    const budgetUsage = (this.costMetrics.totalCost / this.costMetrics.monthlyBudget) * 100;
    
    // Calculate tier breakdown
    const byTier: Record<string, number> = {};
    this.processingHistory.forEach(processing => {
      byTier[processing.tier] = (byTier[processing.tier] || 0) + processing.cost;
    });
    
    // Calculate monthly trends (simplified)
    const trends = this.processingHistory
      .filter(p => Date.now() - p.timestamp < 30 * 24 * 60 * 60 * 1000) // Last 30 days
      .map(p => ({
        date: new Date(p.timestamp).toISOString().split('T')[0],
        cost: p.cost,
        accuracy: p.accuracy
      }));
    
    // Generate recommendations
    const recommendations: string[] = [];
    
    if (budgetUsage > 80) {
      recommendations.push('Consider upgrading to a higher budget tier');
    }
    
    if (this.costMetrics.efficiency.accuracy < 0.8) {
      recommendations.push('Consider using higher accuracy processing tiers');
    }
    
    if (this.costMetrics.costPerReceipt > this.optimizationConfig.costPerReceiptTarget) {
      recommendations.push('Optimize processing to reduce cost per receipt');
    }
    
    return {
      summary: {
        totalCost: this.costMetrics.totalCost,
        costPerReceipt: this.costMetrics.costPerReceipt,
        budgetUsage,
        efficiency: this.costMetrics.efficiency.costEffectiveness
      },
      breakdown: {
        byTier,
        byMonth: {}, // Would be calculated from historical data
        trends
      },
      recommendations
    };
  }
}

// Export singleton instance
export const costOptimizationSystem = new CostOptimizationSystem();
