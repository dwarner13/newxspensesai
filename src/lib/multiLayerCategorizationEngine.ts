/**
 * Multi-Layer Categorization Engine
 * Combines rule-based matching, AI-powered semantic understanding, and adaptive learning
 */

import { supabase } from './supabase';

export interface CategorizationResult {
  category: string;
  subcategory?: string;
  confidence: number;
  source: 'rule-based' | 'semantic-ai' | 'adaptive-learning' | 'user-memory' | 'fallback';
  reasoning: string;
  alternatives?: Array<{
    category: string;
    subcategory?: string;
    confidence: number;
  }>;
  suggestions?: string[];
  flagForReview?: boolean;
}

export interface TransactionData {
  description: string;
  amount?: number;
  date?: string;
  vendor?: string;
  type?: 'credit' | 'debit';
  metadata?: any;
}

export interface UserPreferences {
  userId?: string;
  customCategories?: string[];
  spendingPatterns?: Record<string, number>;
  goals?: Array<{
    category: string;
    targetAmount: number;
    currentAmount: number;
  }>;
  preferences?: Record<string, any>;
}

export interface CategorizationRule {
  id: string;
  pattern: string | RegExp;
  category: string;
  subcategory?: string;
  confidence: number;
  conditions?: {
    minAmount?: number;
    maxAmount?: number;
    vendorPattern?: string;
    dateRange?: { start: string; end: string };
  };
  source: 'system' | 'user' | 'learned';
  matchCount?: number;
  lastMatched?: string;
}

/**
 * Multi-Layer Categorization Engine
 */
export class MultiLayerCategorizationEngine {
  private rules: CategorizationRule[] = [];
  private userMemory: Map<string, string> = new Map();
  private spendingPatterns: Map<string, number> = new Map();
  private customCategories: Set<string> = new Set();

  constructor() {
    this.initializeSystemRules();
  }

  /**
   * Main categorization method
   */
  async categorize(
    transaction: TransactionData,
    userPreferences: UserPreferences = {}
  ): Promise<CategorizationResult> {
    try {
      // Layer 1: Rule-based matching
      const ruleBasedResult = await this.ruleBasedCategorization(transaction, userPreferences);
      if (ruleBasedResult.confidence >= 0.9) {
        return ruleBasedResult;
      }

      // Layer 2: User memory and learned patterns
      const memoryResult = await this.memoryBasedCategorization(transaction, userPreferences);
      if (memoryResult.confidence >= 0.8) {
        return memoryResult;
      }

      // Layer 3: AI-powered semantic understanding
      const aiResult = await this.semanticAICategorization(transaction, userPreferences);
      if (aiResult.confidence >= 0.7) {
        return aiResult;
      }

      // Layer 4: Adaptive learning and pattern recognition
      const adaptiveResult = await this.adaptiveLearningCategorization(transaction, userPreferences);
      if (adaptiveResult.confidence >= 0.6) {
        return adaptiveResult;
      }

      // Fallback: Use the best result or default
      const results = [ruleBasedResult, memoryResult, aiResult, adaptiveResult];
      const bestResult = results.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );

      return {
        ...bestResult,
        flagForReview: bestResult.confidence < 0.6,
        suggestions: this.generateCategorySuggestions(transaction, userPreferences)
      };

    } catch (error) {
      console.error('Categorization error:', error);
      return this.getFallbackResult(transaction);
    }
  }

  /**
   * Layer 1: Rule-based categorization
   */
  private async ruleBasedCategorization(
    transaction: TransactionData,
    userPreferences: UserPreferences
  ): Promise<CategorizationResult> {
    const description = transaction.description.toLowerCase();
    const vendor = transaction.vendor?.toLowerCase() || '';
    const amount = transaction.amount || 0;

    // Check system rules
    for (const rule of this.rules) {
      if (this.matchesRule(transaction, rule)) {
        return {
          category: rule.category,
          subcategory: rule.subcategory,
          confidence: rule.confidence,
          source: 'rule-based',
          reasoning: `Matched rule: ${rule.pattern}`,
          alternatives: this.getAlternativeCategories(transaction, userPreferences)
        };
      }
    }

    // Check user-defined rules
    if (userPreferences.userId) {
      const userRules = await this.getUserRules(userPreferences.userId);
      for (const rule of userRules) {
        if (this.matchesRule(transaction, rule)) {
          return {
            category: rule.category,
            subcategory: rule.subcategory,
            confidence: rule.confidence,
            source: 'rule-based',
            reasoning: `Matched user rule: ${rule.pattern}`,
            alternatives: this.getAlternativeCategories(transaction, userPreferences)
          };
        }
      }
    }

    return {
      category: 'Uncategorized',
      confidence: 0.1,
      source: 'rule-based',
      reasoning: 'No rules matched'
    };
  }

  /**
   * Layer 2: Memory-based categorization
   */
  private async memoryBasedCategorization(
    transaction: TransactionData,
    userPreferences: UserPreferences
  ): Promise<CategorizationResult> {
    if (!userPreferences.userId) {
      return { category: 'Uncategorized', confidence: 0, source: 'user-memory', reasoning: 'No user ID' };
    }

    try {
      // Check user's categorization memory
      const { data: memory, error } = await supabase
        .from('categorization_rules')
        .select('*')
        .eq('user_id', userPreferences.userId)
        .or(`keyword.ilike.%${transaction.description}%,keyword.ilike.%${transaction.vendor}%`)
        .order('match_count', { ascending: false })
        .limit(5);

      if (error) throw error;

      if (memory && memory.length > 0) {
        const bestMatch = memory[0];
        const confidence = Math.min(0.95, 0.6 + (bestMatch.match_count * 0.05));

        return {
          category: bestMatch.category,
          subcategory: bestMatch.subcategory,
          confidence,
          source: 'user-memory',
          reasoning: `Based on ${bestMatch.match_count} previous matches for "${bestMatch.keyword}"`,
          alternatives: memory.slice(1, 3).map(m => ({
            category: m.category,
            subcategory: m.subcategory,
            confidence: Math.min(0.9, 0.5 + (m.match_count * 0.05))
          }))
        };
      }

      return { category: 'Uncategorized', confidence: 0, source: 'user-memory', reasoning: 'No memory matches' };

    } catch (error) {
      console.error('Memory-based categorization error:', error);
      return { category: 'Uncategorized', confidence: 0, source: 'user-memory', reasoning: 'Error accessing memory' };
    }
  }

  /**
   * Layer 3: AI-powered semantic categorization
   */
  private async semanticAICategorization(
    transaction: TransactionData,
    userPreferences: UserPreferences
  ): Promise<CategorizationResult> {
    try {
      const prompt = this.buildSemanticPrompt(transaction, userPreferences);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an expert financial transaction categorizer. Analyze the transaction and provide the most appropriate category and subcategory. Consider context, amount, and spending patterns.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const result = JSON.parse(data.choices[0].message.content);

      return {
        category: result.category,
        subcategory: result.subcategory,
        confidence: result.confidence || 0.75,
        source: 'semantic-ai',
        reasoning: result.reasoning || 'AI semantic analysis',
        alternatives: result.alternatives || []
      };

    } catch (error) {
      console.error('AI categorization error:', error);
      return { category: 'Uncategorized', confidence: 0, source: 'semantic-ai', reasoning: 'AI processing failed' };
    }
  }

  /**
   * Layer 4: Adaptive learning categorization
   */
  private async adaptiveLearningCategorization(
    transaction: TransactionData,
    userPreferences: UserPreferences
  ): Promise<CategorizationResult> {
    try {
      // Analyze spending patterns
      const patterns = await this.analyzeSpendingPatterns(transaction, userPreferences);
      
      // Look for similar transactions
      const similarTransactions = await this.findSimilarTransactions(transaction, userPreferences);
      
      if (similarTransactions.length > 0) {
        const mostCommon = this.getMostCommonCategory(similarTransactions);
        const confidence = Math.min(0.8, 0.4 + (similarTransactions.length * 0.1));

        return {
          category: mostCommon.category,
          subcategory: mostCommon.subcategory,
          confidence,
          source: 'adaptive-learning',
          reasoning: `Based on ${similarTransactions.length} similar transactions`,
          alternatives: this.getAlternativeCategories(transaction, userPreferences)
        };
      }

      // Use spending pattern analysis
      if (patterns.bestMatch) {
        return {
          category: patterns.bestMatch.category,
          confidence: patterns.bestMatch.confidence,
          source: 'adaptive-learning',
          reasoning: 'Based on spending pattern analysis',
          alternatives: patterns.alternatives
        };
      }

      return { category: 'Uncategorized', confidence: 0, source: 'adaptive-learning', reasoning: 'No patterns found' };

    } catch (error) {
      console.error('Adaptive learning error:', error);
      return { category: 'Uncategorized', confidence: 0, source: 'adaptive-learning', reasoning: 'Pattern analysis failed' };
    }
  }

  /**
   * Check if transaction matches a rule
   */
  private matchesRule(transaction: TransactionData, rule: CategorizationRule): boolean {
    const description = transaction.description.toLowerCase();
    const vendor = transaction.vendor?.toLowerCase() || '';
    const amount = transaction.amount || 0;

    // Check pattern match
    let patternMatches = false;
    if (typeof rule.pattern === 'string') {
      patternMatches = description.includes(rule.pattern.toLowerCase()) || 
                      vendor.includes(rule.pattern.toLowerCase());
    } else {
      patternMatches = rule.pattern.test(description) || rule.pattern.test(vendor);
    }

    if (!patternMatches) return false;

    // Check conditions
    if (rule.conditions) {
      if (rule.conditions.minAmount && amount < rule.conditions.minAmount) return false;
      if (rule.conditions.maxAmount && amount > rule.conditions.maxAmount) return false;
      if (rule.conditions.vendorPattern && !new RegExp(rule.conditions.vendorPattern, 'i').test(vendor)) return false;
      // Date range check would go here
    }

    return true;
  }

  /**
   * Get user-defined rules
   */
  private async getUserRules(userId: string): Promise<CategorizationRule[]> {
    try {
      const { data, error } = await supabase
        .from('categorization_rules')
        .select('*')
        .eq('user_id', userId)
        .eq('source', 'user');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching user rules:', error);
      return [];
    }
  }

  /**
   * Build semantic analysis prompt
   */
  private buildSemanticPrompt(transaction: TransactionData, userPreferences: UserPreferences): string {
    const customCategories = userPreferences.customCategories?.join(', ') || '';
    
    return `Analyze this transaction and categorize it:

Transaction: "${transaction.description}"
Amount: $${transaction.amount || 0}
Vendor: ${transaction.vendor || 'Unknown'}
Date: ${transaction.date || 'Unknown'}

${customCategories ? `Custom categories available: ${customCategories}` : ''}

Respond with JSON:
{
  "category": "string",
  "subcategory": "string or null",
  "confidence": 0.0-1.0,
  "reasoning": "explanation",
  "alternatives": [{"category": "string", "confidence": 0.0-1.0}]
}`;
  }

  /**
   * Analyze spending patterns
   */
  private async analyzeSpendingPatterns(
    transaction: TransactionData,
    userPreferences: UserPreferences
  ): Promise<{ bestMatch?: any; alternatives: any[] }> {
    if (!userPreferences.userId) {
      return { alternatives: [] };
    }

    try {
      // Get user's spending patterns
      const { data: patterns, error } = await supabase
        .from('spending_patterns')
        .select('*')
        .eq('user_id', userPreferences.userId)
        .gte('amount_range_min', transaction.amount || 0)
        .lte('amount_range_max', transaction.amount || 999999);

      if (error) throw error;

      if (patterns && patterns.length > 0) {
        const bestMatch = patterns.reduce((best, current) => 
          current.frequency > best.frequency ? current : best
        );

        return {
          bestMatch: {
            category: bestMatch.category,
            confidence: Math.min(0.8, bestMatch.frequency / 10)
          },
          alternatives: patterns.slice(0, 3).map(p => ({
            category: p.category,
            confidence: Math.min(0.7, p.frequency / 15)
          }))
        };
      }

      return { alternatives: [] };
    } catch (error) {
      console.error('Spending pattern analysis error:', error);
      return { alternatives: [] };
    }
  }

  /**
   * Find similar transactions
   */
  private async findSimilarTransactions(
    transaction: TransactionData,
    userPreferences: UserPreferences
  ): Promise<any[]> {
    if (!userPreferences.userId) return [];

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userPreferences.userId)
        .not('category', 'is', null)
        .ilike('description', `%${transaction.description.split(' ')[0]}%`)
        .limit(10);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Similar transaction search error:', error);
      return [];
    }
  }

  /**
   * Get most common category from similar transactions
   */
  private getMostCommonCategory(transactions: any[]): { category: string; subcategory?: string } {
    const categoryCounts = new Map<string, number>();
    
    transactions.forEach(tx => {
      const key = `${tx.category}|${tx.subcategory || ''}`;
      categoryCounts.set(key, (categoryCounts.get(key) || 0) + 1);
    });

    const mostCommon = Array.from(categoryCounts.entries())
      .reduce((best, current) => current[1] > best[1] ? current : best);

    const [category, subcategory] = mostCommon[0].split('|');
    return { category, subcategory: subcategory || undefined };
  }

  /**
   * Generate category suggestions
   */
  private generateCategorySuggestions(
    transaction: TransactionData,
    userPreferences: UserPreferences
  ): string[] {
    const suggestions = new Set<string>();
    
    // Add custom categories
    if (userPreferences.customCategories) {
      userPreferences.customCategories.forEach(cat => suggestions.add(cat));
    }

    // Add common categories based on amount
    const amount = transaction.amount || 0;
    if (amount > 100) {
      suggestions.add('Major Purchase');
      suggestions.add('Business Expense');
    } else if (amount < 10) {
      suggestions.add('Small Purchase');
      suggestions.add('Coffee & Snacks');
    }

    // Add vendor-based suggestions
    const vendor = transaction.vendor?.toLowerCase() || '';
    if (vendor.includes('gas') || vendor.includes('fuel')) {
      suggestions.add('Transportation');
    } else if (vendor.includes('grocery') || vendor.includes('food')) {
      suggestions.add('Food & Dining');
    }

    return Array.from(suggestions).slice(0, 5);
  }

  /**
   * Get alternative categories
   */
  private getAlternativeCategories(
    transaction: TransactionData,
    userPreferences: UserPreferences
  ): Array<{ category: string; subcategory?: string; confidence: number }> {
    return [
      { category: 'Uncategorized', confidence: 0.1 },
      { category: 'Other', confidence: 0.2 }
    ];
  }

  /**
   * Get fallback result
   */
  private getFallbackResult(transaction: TransactionData): CategorizationResult {
    return {
      category: 'Uncategorized',
      confidence: 0.1,
      source: 'fallback',
      reasoning: 'All categorization methods failed',
      flagForReview: true,
      suggestions: ['Other', 'Business Expense', 'Personal']
    };
  }

  /**
   * Initialize system rules
   */
  private initializeSystemRules() {
    this.rules = [
      // Food & Dining
      { id: 'food-1', pattern: /restaurant|cafe|diner|food|eat/i, category: 'Food & Dining', subcategory: 'Restaurants', confidence: 0.9, source: 'system' },
      { id: 'food-2', pattern: /grocery|supermarket|market|food/i, category: 'Food & Dining', subcategory: 'Groceries', confidence: 0.9, source: 'system' },
      { id: 'food-3', pattern: /coffee|starbucks|dunkin/i, category: 'Food & Dining', subcategory: 'Coffee', confidence: 0.9, source: 'system' },
      
      // Transportation
      { id: 'transport-1', pattern: /gas|fuel|petrol|shell|exxon|chevron/i, category: 'Transportation', subcategory: 'Gas', confidence: 0.9, source: 'system' },
      { id: 'transport-2', pattern: /uber|lyft|taxi|cab/i, category: 'Transportation', subcategory: 'Rideshare', confidence: 0.9, source: 'system' },
      { id: 'transport-3', pattern: /parking|garage/i, category: 'Transportation', subcategory: 'Parking', confidence: 0.8, source: 'system' },
      
      // Shopping
      { id: 'shopping-1', pattern: /amazon|walmart|target|store|shop/i, category: 'Shopping', subcategory: 'General', confidence: 0.8, source: 'system' },
      { id: 'shopping-2', pattern: /clothing|apparel|fashion/i, category: 'Shopping', subcategory: 'Clothing', confidence: 0.8, source: 'system' },
      
      // Utilities
      { id: 'utilities-1', pattern: /electric|power|energy/i, category: 'Utilities', subcategory: 'Electricity', confidence: 0.9, source: 'system' },
      { id: 'utilities-2', pattern: /water|sewer/i, category: 'Utilities', subcategory: 'Water', confidence: 0.9, source: 'system' },
      { id: 'utilities-3', pattern: /internet|cable|phone|telecom/i, category: 'Utilities', subcategory: 'Internet & Phone', confidence: 0.9, source: 'system' },
      
      // Healthcare
      { id: 'healthcare-1', pattern: /doctor|medical|hospital|clinic|pharmacy/i, category: 'Healthcare', subcategory: 'Medical', confidence: 0.9, source: 'system' },
      { id: 'healthcare-2', pattern: /cvs|walgreens|pharmacy/i, category: 'Healthcare', subcategory: 'Pharmacy', confidence: 0.9, source: 'system' },
      
      // Entertainment
      { id: 'entertainment-1', pattern: /movie|cinema|theater|netflix|spotify/i, category: 'Entertainment', subcategory: 'Media', confidence: 0.8, source: 'system' },
      { id: 'entertainment-2', pattern: /game|gaming|steam/i, category: 'Entertainment', subcategory: 'Gaming', confidence: 0.8, source: 'system' },
      
      // Income
      { id: 'income-1', pattern: /salary|payroll|deposit|income/i, category: 'Income', subcategory: 'Salary', confidence: 0.9, source: 'system', conditions: { minAmount: 0 } },
      { id: 'income-2', pattern: /refund|return/i, category: 'Income', subcategory: 'Refunds', confidence: 0.8, source: 'system' }
    ];
  }

  /**
   * Learn from user feedback
   */
  async learnFromFeedback(
    transaction: TransactionData,
    correctCategory: string,
    correctSubcategory: string,
    userId: string
  ): Promise<void> {
    try {
      // Update categorization rules
      const keyword = this.extractKeyword(transaction.description);
      
      await supabase
        .from('categorization_rules')
        .upsert({
          user_id: userId,
          keyword,
          category: correctCategory,
          subcategory: correctSubcategory,
          match_count: 1,
          last_matched: new Date().toISOString(),
          source: 'learned'
        });

      // Update spending patterns
      await this.updateSpendingPattern(transaction, correctCategory, userId);

    } catch (error) {
      console.error('Learning from feedback error:', error);
    }
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
   * Update spending pattern
   */
  private async updateSpendingPattern(
    transaction: TransactionData,
    category: string,
    userId: string
  ): Promise<void> {
    try {
      const amount = transaction.amount || 0;
      const amountRange = Math.floor(amount / 50) * 50; // Group by $50 ranges

      await supabase
        .from('spending_patterns')
        .upsert({
          user_id: userId,
          category,
          amount_range_min: amountRange,
          amount_range_max: amountRange + 49,
          frequency: 1,
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id,category,amount_range_min',
          ignoreDuplicates: false});

    } catch (error) {
      console.error('Spending pattern update error:', error);
    }
  }
}

// Export singleton instance
export const multiLayerCategorizationEngine = new MultiLayerCategorizationEngine();
