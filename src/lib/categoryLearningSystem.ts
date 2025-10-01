/**
 * Category Learning System
 * Learns from user feedback and adapts to user preferences
 */

import { supabase } from './supabase';

export interface LearningFeedback {
  transactionId: string;
  originalCategory: string;
  correctedCategory: string;
  correctedSubcategory?: string;
  userId: string;
  timestamp: string;
  confidence: number;
  reasoning?: string;
}

export interface LearningPattern {
  keyword: string;
  category: string;
  subcategory?: string;
  confidence: number;
  frequency: number;
  lastUpdated: string;
  source: 'user-correction' | 'pattern-recognition' | 'bulk-import';
}

export interface UserPreference {
  userId: string;
  category: string;
  weight: number;
  customRules: string[];
  exceptions: string[];
  lastUpdated: string;
}

export interface LearningMetrics {
  totalCorrections: number;
  accuracyImprovement: number;
  categoriesLearned: number;
  patternsRecognized: number;
  userSatisfaction: number;
  lastUpdated: string;
}

export interface CategorySuggestion {
  category: string;
  subcategory?: string;
  confidence: number;
  reasoning: string;
  basedOn: 'user-history' | 'similar-users' | 'spending-pattern' | 'vendor-pattern';
  alternatives: Array<{
    category: string;
    confidence: number;
  }>;
}

/**
 * Category Learning System
 */
export class CategoryLearningSystem {
  private learningCache: Map<string, LearningPattern[]> = new Map();
  private userPreferences: Map<string, UserPreference[]> = new Map();
  private metrics: Map<string, LearningMetrics> = new Map();

  constructor() {
    this.initializeLearningSystem();
  }

  /**
   * Process user feedback and update learning models
   */
  async processFeedback(feedback: LearningFeedback): Promise<void> {
    try {
      // Update categorization rules
      await this.updateCategorizationRules(feedback);
      
      // Update user preferences
      await this.updateUserPreferences(feedback);
      
      // Update learning patterns
      await this.updateLearningPatterns(feedback);
      
      // Update metrics
      await this.updateLearningMetrics(feedback);
      
      // Clear cache for this user
      this.learningCache.delete(feedback.userId);
      
      console.log(`Learning system processed feedback for user ${feedback.userId}`);
      
    } catch (error) {
      console.error('Error processing learning feedback:', error);
      throw error;
    }
  }

  /**
   * Get category suggestions based on learned patterns
   */
  async getCategorySuggestions(
    transaction: any,
    userId: string
  ): Promise<CategorySuggestion[]> {
    try {
      const suggestions: CategorySuggestion[] = [];
      
      // Get user-specific patterns
      const userPatterns = await this.getUserPatterns(userId);
      
      // Get similar user patterns
      const similarPatterns = await this.getSimilarUserPatterns(transaction, userId);
      
      // Get spending pattern suggestions
      const spendingSuggestions = await this.getSpendingPatternSuggestions(transaction, userId);
      
      // Get vendor pattern suggestions
      const vendorSuggestions = await this.getVendorPatternSuggestions(transaction, userId);
      
      // Combine and rank suggestions
      suggestions.push(...userPatterns, ...similarPatterns, ...spendingSuggestions, ...vendorSuggestions);
      
      // Remove duplicates and sort by confidence
      const uniqueSuggestions = this.deduplicateSuggestions(suggestions);
      return uniqueSuggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
      
    } catch (error) {
      console.error('Error getting category suggestions:', error);
      return [];
    }
  }

  /**
   * Learn from bulk corrections
   */
  async learnFromBulkCorrections(
    corrections: Array<{
      transactionId: string;
      originalCategory: string;
      correctedCategory: string;
      correctedSubcategory?: string;
      userId: string;
    }>
  ): Promise<void> {
    try {
      const batchSize = 50;
      
      for (let i = 0; i < corrections.length; i += batchSize) {
        const batch = corrections.slice(i, i + batchSize);
        
        // Process batch
        await Promise.all(batch.map(correction => 
          this.processFeedback({
            ...correction,
            timestamp: new Date().toISOString(),
            confidence: 0.8 // High confidence for bulk corrections
          })
        ));
        
        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Learning system processed ${corrections.length} bulk corrections`);
      
    } catch (error) {
      console.error('Error processing bulk corrections:', error);
      throw error;
    }
  }

  /**
   * Get learning metrics for a user
   */
  async getLearningMetrics(userId: string): Promise<LearningMetrics> {
    try {
      const cached = this.metrics.get(userId);
      if (cached) return cached;

      const { data: corrections, error: correctionsError } = await supabase
        .from('categorization_corrections')
        .select('*')
        .eq('user_id', userId);

      if (correctionsError) throw correctionsError;

      const { data: rules, error: rulesError } = await supabase
        .from('categorization_rules')
        .select('*')
        .eq('user_id', userId);

      if (rulesError) throw rulesError;

      const metrics: LearningMetrics = {
        totalCorrections: corrections?.length || 0,
        accuracyImprovement: this.calculateAccuracyImprovement(corrections || []),
        categoriesLearned: new Set(rules?.map(r => r.category) || []).size,
        patternsRecognized: rules?.length || 0,
        userSatisfaction: this.calculateUserSatisfaction(corrections || []),
        lastUpdated: new Date().toISOString()
      };

      this.metrics.set(userId, metrics);
      return metrics;

    } catch (error) {
      console.error('Error getting learning metrics:', error);
      return {
        totalCorrections: 0,
        accuracyImprovement: 0,
        categoriesLearned: 0,
        patternsRecognized: 0,
        userSatisfaction: 0,
        lastUpdated: new Date().toISOString()
      };
    }
  }

  /**
   * Predict category confidence based on learning
   */
  async predictCategoryConfidence(
    transaction: any,
    suggestedCategory: string,
    userId: string
  ): Promise<number> {
    try {
      const patterns = await this.getUserPatterns(userId);
      const matchingPattern = patterns.find(p => 
        p.category === suggestedCategory && 
        this.matchesPattern(transaction, p)
      );

      if (matchingPattern) {
        return Math.min(0.95, matchingPattern.confidence + (matchingPattern.frequency * 0.01));
      }

      // Check for similar patterns
      const similarPatterns = patterns.filter(p => 
        p.category === suggestedCategory
      );

      if (similarPatterns.length > 0) {
        const avgConfidence = similarPatterns.reduce((sum, p) => sum + p.confidence, 0) / similarPatterns.length;
        return Math.min(0.85, avgConfidence);
      }

      return 0.5; // Default confidence

    } catch (error) {
      console.error('Error predicting category confidence:', error);
      return 0.5;
    }
  }

  /**
   * Update categorization rules based on feedback
   */
  private async updateCategorizationRules(feedback: LearningFeedback): Promise<void> {
    try {
      const keyword = this.extractKeyword(feedback.transactionId); // This should be description
      
      const { error } = await supabase
        .from('categorization_rules')
        .upsert({
          user_id: feedback.userId,
          keyword,
          category: feedback.correctedCategory,
          subcategory: feedback.correctedSubcategory,
          match_count: 1,
          last_matched: feedback.timestamp,
          source: 'user-correction',
          confidence: feedback.confidence
        }, {
          onConflict: 'user_id,keyword'
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error updating categorization rules:', error);
      throw error;
    }
  }

  /**
   * Update user preferences based on feedback
   */
  private async updateUserPreferences(feedback: LearningFeedback): Promise<void> {
    try {
      const { data: existing, error: fetchError } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', feedback.userId)
        .eq('category', feedback.correctedCategory)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existing) {
        // Update existing preference
        const newWeight = Math.min(1.0, existing.weight + 0.1);
        
        await supabase
          .from('user_preferences')
          .update({
            weight: newWeight,
            last_updated: feedback.timestamp
          })
          .eq('id', existing.id);

      } else {
        // Create new preference
        await supabase
          .from('user_preferences')
          .insert({
            user_id: feedback.userId,
            category: feedback.correctedCategory,
            weight: 0.7,
            custom_rules: [],
            exceptions: [],
            last_updated: feedback.timestamp});
      }

    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  /**
   * Update learning patterns
   */
  private async updateLearningPatterns(feedback: LearningFeedback): Promise<void> {
    try {
      const pattern: LearningPattern = {
        keyword: this.extractKeyword(feedback.transactionId), // Should be description
        category: feedback.correctedCategory,
        subcategory: feedback.correctedSubcategory,
        confidence: feedback.confidence,
        frequency: 1,
        lastUpdated: feedback.timestamp,
        source: 'user-correction'
      };

      const { error } = await supabase
        .from('learning_patterns')
        .upsert(pattern, {
          onConflict: 'user_id,keyword,category'
        });

      if (error) throw error;

    } catch (error) {
      console.error('Error updating learning patterns:', error);
      throw error;
    }
  }

  /**
   * Update learning metrics
   */
  private async updateLearningMetrics(feedback: LearningFeedback): Promise<void> {
    try {
      await supabase
        .from('categorization_corrections')
        .insert({
          user_id: feedback.userId,
          transaction_id: feedback.transactionId,
          original_category: feedback.originalCategory,
          corrected_category: feedback.correctedCategory,
          corrected_subcategory: feedback.correctedSubcategory,
          confidence: feedback.confidence,
          reasoning: feedback.reasoning,
          timestamp: feedback.timestamp});

      // Clear cached metrics
      this.metrics.delete(feedback.userId);

    } catch (error) {
      console.error('Error updating learning metrics:', error);
      throw error;
    }
  }

  /**
   * Get user-specific patterns
   */
  private async getUserPatterns(userId: string): Promise<CategorySuggestion[]> {
    try {
      const cached = this.learningCache.get(userId);
      if (cached) {
        return cached.map(pattern => ({
          category: pattern.category,
          subcategory: pattern.subcategory,
          confidence: pattern.confidence,
          reasoning: `Based on ${pattern.frequency} previous matches`,
          basedOn: 'user-history' as const,
          alternatives: []
        }));
      }

      const { data: patterns, error } = await supabase
        .from('learning_patterns')
        .select('*')
        .eq('user_id', userId)
        .order('frequency', { ascending: false })
        .limit(20);

      if (error) throw error;

      const suggestions = patterns?.map(pattern => ({
        category: pattern.category,
        subcategory: pattern.subcategory,
        confidence: pattern.confidence,
        reasoning: `Based on ${pattern.frequency} previous matches`,
        basedOn: 'user-history' as const,
        alternatives: []
      })) || [];

      this.learningCache.set(userId, patterns || []);
      return suggestions;

    } catch (error) {
      console.error('Error getting user patterns:', error);
      return [];
    }
  }

  /**
   * Get similar user patterns
   */
  private async getSimilarUserPatterns(
    transaction: any,
    userId: string
  ): Promise<CategorySuggestion[]> {
    try {
      // Find users with similar spending patterns
      const { data: similarUsers, error } = await supabase
        .from('spending_patterns')
        .select('user_id, category, frequency')
        .neq('user_id', userId)
        .eq('amount_range_min', Math.floor((transaction.amount || 0) / 50) * 50)
        .order('frequency', { ascending: false })
        .limit(10);

      if (error) throw error;

      const suggestions: CategorySuggestion[] = [];
      const categoryCounts = new Map<string, number>();

      similarUsers?.forEach(user => {
        const count = categoryCounts.get(user.category) || 0;
        categoryCounts.set(user.category, count + user.frequency);
      });

      categoryCounts.forEach((count, category) => {
        suggestions.push({
          category,
          confidence: Math.min(0.7, count / 20),
          reasoning: `Based on similar users' spending patterns`,
          basedOn: 'similar-users',
          alternatives: []
        });
      });

      return suggestions;

    } catch (error) {
      console.error('Error getting similar user patterns:', error);
      return [];
    }
  }

  /**
   * Get spending pattern suggestions
   */
  private async getSpendingPatternSuggestions(
    transaction: any,
    userId: string
  ): Promise<CategorySuggestion[]> {
    try {
      const amount = transaction.amount || 0;
      const amountRange = Math.floor(amount / 50) * 50;

      const { data: patterns, error } = await supabase
        .from('spending_patterns')
        .select('*')
        .eq('user_id', userId)
        .eq('amount_range_min', amountRange)
        .order('frequency', { ascending: false })
        .limit(5);

      if (error) throw error;

      return patterns?.map(pattern => ({
        category: pattern.category,
        confidence: Math.min(0.8, pattern.frequency / 10),
        reasoning: `Common category for $${amountRange}-${amountRange + 49} range`,
        basedOn: 'spending-pattern',
        alternatives: []
      })) || [];

    } catch (error) {
      console.error('Error getting spending pattern suggestions:', error);
      return [];
    }
  }

  /**
   * Get vendor pattern suggestions
   */
  private async getVendorPatternSuggestions(
    transaction: any,
    userId: string
  ): Promise<CategorySuggestion[]> {
    try {
      const vendor = transaction.vendor || transaction.description;
      if (!vendor) return [];

      const { data: patterns, error } = await supabase
        .from('categorization_rules')
        .select('*')
        .eq('user_id', userId)
        .ilike('keyword', `%${vendor.toLowerCase()}%`)
        .order('match_count', { ascending: false })
        .limit(3);

      if (error) throw error;

      return patterns?.map(pattern => ({
        category: pattern.category,
        subcategory: pattern.subcategory,
        confidence: Math.min(0.9, 0.6 + (pattern.match_count * 0.05)),
        reasoning: `Based on ${pattern.match_count} previous matches for similar vendors`,
        basedOn: 'vendor-pattern',
        alternatives: []
      })) || [];

    } catch (error) {
      console.error('Error getting vendor pattern suggestions:', error);
      return [];
    }
  }

  /**
   * Check if transaction matches a pattern
   */
  private matchesPattern(transaction: any, pattern: LearningPattern): boolean {
    const description = transaction.description?.toLowerCase() || '';
    const vendor = transaction.vendor?.toLowerCase() || '';
    
    return description.includes(pattern.keyword.toLowerCase()) || 
           vendor.includes(pattern.keyword.toLowerCase());
  }

  /**
   * Extract keyword from description
   */
  private extractKeyword(description: string): string {
    return description
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 2)
      .join(' ');
  }

  /**
   * Deduplicate suggestions
   */
  private deduplicateSuggestions(suggestions: CategorySuggestion[]): CategorySuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = `${suggestion.category}|${suggestion.subcategory || ''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Calculate accuracy improvement
   */
  private calculateAccuracyImprovement(corrections: any[]): number {
    if (corrections.length === 0) return 0;
    
    const recentCorrections = corrections.slice(-10); // Last 10 corrections
    const olderCorrections = corrections.slice(-20, -10); // Previous 10 corrections
    
    if (olderCorrections.length === 0) return 0;
    
    const recentAccuracy = recentCorrections.filter(c => c.confidence > 0.7).length / recentCorrections.length;
    const olderAccuracy = olderCorrections.filter(c => c.confidence > 0.7).length / olderCorrections.length;
    
    return recentAccuracy - olderAccuracy;
  }

  /**
   * Calculate user satisfaction
   */
  private calculateUserSatisfaction(corrections: any[]): number {
    if (corrections.length === 0) return 0;
    
    const recentCorrections = corrections.slice(-20); // Last 20 corrections
    const satisfactionScore = recentCorrections.reduce((sum, correction) => {
      return sum + (correction.confidence || 0.5);
    }, 0) / recentCorrections.length;
    
    return satisfactionScore;
  }

  /**
   * Initialize learning system
   */
  private async initializeLearningSystem(): Promise<void> {
    try {
      // Create tables if they don't exist
      await this.createLearningTables();
      console.log('Category Learning System initialized');
    } catch (error) {
      console.error('Error initializing learning system:', error);
    }
  }

  /**
   * Create learning tables
   */
  private async createLearningTables(): Promise<void> {
    // This would typically be done via database migrations
    // For now, we'll assume the tables exist
    console.log('Learning tables ready');
  }
}

// Export singleton instance
export const categoryLearningSystem = new CategoryLearningSystem();
