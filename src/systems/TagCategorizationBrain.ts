// Enhanced Tag Categorization Intelligence System
export interface Category {
  id: string;
  name: string;
  subcategories: string[];
  keywords: string[];
  merchants: Set<string>;
  confidence: number;
}

export interface CategorizationResult {
  category: string;
  subcategory: string;
  confidence: number;
  source: 'custom_rule' | 'learned_pattern' | 'ml_prediction' | 'keyword_match' | 'merchant_match';
  alternatives?: Array<{category: string; subcategory: string; confidence: number}>;
}

export interface Transaction {
  id?: string;
  merchant: string;
  amount: number;
  description: string;
  date: string;
  category?: string;
  subcategory?: string;
}

export interface UserPattern {
  merchant: string;
  amount?: {min: number; max: number};
  description?: string;
  category: string;
  subcategory: string;
  confidence: number;
  usage: number;
  lastUsed: number;
}

export interface CustomRule {
  id: string;
  userId: string;
  name: string;
  conditions: Array<{
    field: 'merchant' | 'amount' | 'description';
    operator: 'equals' | 'contains' | 'between' | 'contains_any';
    value?: string | number;
    min?: number;
    max?: number;
    values?: string[];
  }>;
  category: string;
  subcategory: string;
  priority: number;
  created: number;
  usage: number;
}

export class TagCategorizationBrain {
  private categories: Record<string, Category>;
  private userPatterns: Map<string, UserPattern[]>;
  private customRules: Map<string, CustomRule[]>;
  private merchantDatabase: Map<string, string>;

  constructor() {
    this.categories = this.initializeCategories();
    this.userPatterns = new Map();
    this.customRules = new Map();
    this.merchantDatabase = this.initializeMerchantDatabase();
  }

  private initializeCategories(): Record<string, Category> {
    return {
      'Food & Dining': {
        id: 'food-dining',
        name: 'Food & Dining',
        subcategories: ['Restaurants', 'Groceries', 'Coffee & Tea', 'Fast Food', 'Delivery'],
        keywords: ['restaurant', 'food', 'eat', 'dining', 'meal', 'cafe', 'bistro', 'grill', 'pizza', 'burger'],
        merchants: new Set(['McDonalds', 'Starbucks', 'Uber Eats', 'DoorDash', 'Grubhub', 'Subway', 'KFC', 'Pizza Hut']),
        confidence: 0.9
      },
      'Transportation': {
        id: 'transportation',
        name: 'Transportation',
        subcategories: ['Gas', 'Public Transit', 'Ride Share', 'Parking', 'Auto Service', 'Tolls'],
        keywords: ['uber', 'lyft', 'gas', 'fuel', 'parking', 'transit', 'metro', 'bus', 'taxi', 'toll'],
        merchants: new Set(['Uber', 'Lyft', 'Shell', 'Chevron', 'Exxon', 'BP', 'Mobil', '7-Eleven']),
        confidence: 0.9
      },
      'Shopping': {
        id: 'shopping',
        name: 'Shopping',
        subcategories: ['Clothing', 'Electronics', 'Home', 'Online', 'General', 'Beauty'],
        keywords: ['store', 'shop', 'buy', 'purchase', 'mall', 'retail', 'amazon', 'walmart', 'target'],
        merchants: new Set(['Amazon', 'Walmart', 'Target', 'Best Buy', 'Home Depot', 'Lowes', 'Costco']),
        confidence: 0.8
      },
      'Entertainment': {
        id: 'entertainment',
        name: 'Entertainment',
        subcategories: ['Movies', 'Music', 'Games', 'Sports', 'Events', 'Streaming'],
        keywords: ['movie', 'cinema', 'netflix', 'spotify', 'game', 'sport', 'concert', 'theater'],
        merchants: new Set(['Netflix', 'Spotify', 'Apple Music', 'AMC', 'Regal', 'Steam', 'PlayStation']),
        confidence: 0.8
      },
      'Healthcare': {
        id: 'healthcare',
        name: 'Healthcare',
        subcategories: ['Doctor', 'Pharmacy', 'Dental', 'Vision', 'Insurance', 'Medical'],
        keywords: ['doctor', 'pharmacy', 'dental', 'vision', 'medical', 'health', 'clinic', 'hospital'],
        merchants: new Set(['CVS', 'Walgreens', 'Rite Aid', 'Kaiser', 'Blue Cross', 'Aetna']),
        confidence: 0.9
      },
      'Utilities': {
        id: 'utilities',
        name: 'Utilities',
        subcategories: ['Electric', 'Gas', 'Water', 'Internet', 'Phone', 'Cable'],
        keywords: ['electric', 'gas', 'water', 'internet', 'phone', 'cable', 'utility', 'bill'],
        merchants: new Set(['PG&E', 'Comcast', 'Verizon', 'AT&T', 'T-Mobile', 'Spectrum']),
        confidence: 0.9
      },
      'Education': {
        id: 'education',
        name: 'Education',
        subcategories: ['Tuition', 'Books', 'Supplies', 'Courses', 'Training'],
        keywords: ['school', 'university', 'college', 'tuition', 'book', 'course', 'training', 'education'],
        merchants: new Set(['Amazon', 'Barnes & Noble', 'Coursera', 'Udemy', 'Khan Academy']),
        confidence: 0.8
      },
      'Travel': {
        id: 'travel',
        name: 'Travel',
        subcategories: ['Flights', 'Hotels', 'Car Rental', 'Vacation', 'Business Travel'],
        keywords: ['flight', 'hotel', 'travel', 'vacation', 'airline', 'booking', 'expedia', 'airbnb'],
        merchants: new Set(['Expedia', 'Booking.com', 'Airbnb', 'Delta', 'United', 'American Airlines']),
        confidence: 0.9
      }
    };
  }

  private initializeMerchantDatabase(): Map<string, string> {
    const merchantMap = new Map<string, string>();
    
    // Food & Dining
    ['McDonalds', 'Starbucks', 'Uber Eats', 'DoorDash', 'Grubhub', 'Subway', 'KFC', 'Pizza Hut', 'Dominos', 'Chipotle', 'Taco Bell', 'Burger King', 'Wendys'].forEach(merchant => {
      merchantMap.set(merchant.toLowerCase(), 'Food & Dining');
    });
    
    // Transportation
    ['Uber', 'Lyft', 'Shell', 'Chevron', 'Exxon', 'BP', 'Mobil', '7-Eleven', 'Valero', 'Speedway'].forEach(merchant => {
      merchantMap.set(merchant.toLowerCase(), 'Transportation');
    });
    
    // Shopping
    ['Amazon', 'Walmart', 'Target', 'Best Buy', 'Home Depot', 'Lowes', 'Costco', 'Sams Club', 'Macy\'s', 'Nordstrom'].forEach(merchant => {
      merchantMap.set(merchant.toLowerCase(), 'Shopping');
    });
    
    // Entertainment
    ['Netflix', 'Spotify', 'Apple Music', 'AMC', 'Regal', 'Steam', 'PlayStation', 'Xbox', 'Hulu', 'Disney+'].forEach(merchant => {
      merchantMap.set(merchant.toLowerCase(), 'Entertainment');
    });
    
    // Healthcare
    ['CVS', 'Walgreens', 'Rite Aid', 'Kaiser', 'Blue Cross', 'Aetna', 'Cigna', 'Humana'].forEach(merchant => {
      merchantMap.set(merchant.toLowerCase(), 'Healthcare');
    });
    
    // Utilities
    ['PG&E', 'Comcast', 'Verizon', 'AT&T', 'T-Mobile', 'Spectrum', 'Xfinity', 'Directv'].forEach(merchant => {
      merchantMap.set(merchant.toLowerCase(), 'Utilities');
    });
    
    return merchantMap;
  }

  // Main categorization method
  async categorizeTransaction(transaction: Transaction, userId: string): Promise<CategorizationResult> {
    console.log(`🏷️ Tag: Categorizing transaction for ${transaction.merchant} ($${transaction.amount})`);
    
    // Step 1: Check user's custom rules first
    const customRule = await this.checkCustomRules(transaction, userId);
    if (customRule) {
      console.log(`🏷️ Tag: Found custom rule match`);
      return {
        category: customRule.category,
        subcategory: customRule.subcategory,
        confidence: 1.0,
        source: 'custom_rule'
      };
    }
    
    // Step 2: Check learned patterns for this user
    const learnedPattern = await this.checkLearnedPatterns(transaction, userId);
    if (learnedPattern && learnedPattern.confidence > 0.9) {
      console.log(`🏷️ Tag: Found learned pattern match`);
      return {
        category: learnedPattern.category,
        subcategory: learnedPattern.subcategory,
        confidence: learnedPattern.confidence,
        source: 'learned_pattern'
      };
    }
    
    // Step 3: ML-based categorization (simplified for now)
    const mlPrediction = await this.mlCategorize(transaction, userId);
    
    // Step 4: Keyword and merchant matching
    const keywordMatch = this.matchKeywords(transaction);
    const merchantMatch = this.matchMerchant(transaction);
    
    // Step 5: Combine all signals
    const combined = this.combineSignals([mlPrediction, keywordMatch, merchantMatch]);
    
    // Step 6: Apply user preferences
    const final = await this.applyUserPreferences(combined, userId);
    
    console.log(`🏷️ Tag: Final categorization: ${final.category} > ${final.subcategory} (${final.confidence})`);
    
    return {
      category: final.category,
      subcategory: final.subcategory,
      confidence: final.confidence,
      source: final.source,
      alternatives: final.alternatives
    };
  }

  private async checkCustomRules(transaction: Transaction, userId: string): Promise<CustomRule | null> {
    const userRules = this.customRules.get(userId) || [];
    
    for (const rule of userRules.sort((a, b) => b.priority - a.priority)) {
      if (this.evaluateRule(rule, transaction)) {
        rule.usage++;
        return rule;
      }
    }
    
    return null;
  }

  private evaluateRule(rule: CustomRule, transaction: Transaction): boolean {
    return rule.conditions.every(condition => {
      switch (condition.field) {
        case 'merchant':
          if (condition.operator === 'equals') {
            return transaction.merchant.toLowerCase() === condition.value?.toString().toLowerCase();
          } else if (condition.operator === 'contains') {
            return transaction.merchant.toLowerCase().includes(condition.value?.toString().toLowerCase() || '');
          }
          break;
        case 'amount':
          if (condition.operator === 'between') {
            return transaction.amount >= (condition.min || 0) && transaction.amount <= (condition.max || Infinity);
          }
          break;
        case 'description':
          if (condition.operator === 'contains') {
            return transaction.description.toLowerCase().includes(condition.value?.toString().toLowerCase() || '');
          } else if (condition.operator === 'contains_any') {
            return condition.values?.some(value => 
              transaction.description.toLowerCase().includes(value.toLowerCase())
            ) || false;
          }
          break;
      }
      return false;
    });
  }

  private async checkLearnedPatterns(transaction: Transaction, userId: string): Promise<UserPattern | null> {
    const userPatterns = this.userPatterns.get(userId) || [];
    
    // Find exact merchant match
    const exactMatch = userPatterns.find(pattern => 
      pattern.merchant.toLowerCase() === transaction.merchant.toLowerCase()
    );
    
    if (exactMatch) {
      return exactMatch;
    }
    
    // Find similar merchant match
    const similarMatch = userPatterns.find(pattern => 
      this.calculateSimilarity(pattern.merchant, transaction.merchant) > 0.8
    );
    
    if (similarMatch) {
      return similarMatch;
    }
    
    // Find amount range match
    const amountMatch = userPatterns.find(pattern => 
      pattern.amount && 
      transaction.amount >= pattern.amount.min && 
      transaction.amount <= pattern.amount.max
    );
    
    return amountMatch || null;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private async mlCategorize(transaction: Transaction, userId: string): Promise<CategorizationResult> {
    // Simplified ML prediction based on merchant and amount patterns
    const merchant = transaction.merchant.toLowerCase();
    const amount = transaction.amount;
    
    // High-value transactions are often different categories
    if (amount > 500) {
      return {
        category: 'Shopping',
        subcategory: 'Electronics',
        confidence: 0.7,
        source: 'ml_prediction'
      };
    }
    
    // Medium-value transactions
    if (amount > 100) {
      return {
        category: 'Shopping',
        subcategory: 'General',
        confidence: 0.6,
        source: 'ml_prediction'
      };
    }
    
    // Low-value transactions
    return {
      category: 'Food & Dining',
      subcategory: 'Fast Food',
      confidence: 0.5,
      source: 'ml_prediction'
    };
  }

  private matchKeywords(transaction: Transaction): CategorizationResult | null {
    const text = `${transaction.merchant} ${transaction.description}`.toLowerCase();
    
    for (const [categoryName, category] of Object.entries(this.categories)) {
      for (const keyword of category.keywords) {
        if (text.includes(keyword.toLowerCase())) {
          return {
            category: categoryName,
            subcategory: category.subcategories[0],
            confidence: 0.8,
            source: 'keyword_match'
          };
        }
      }
    }
    
    return null;
  }

  private matchMerchant(transaction: Transaction): CategorizationResult | null {
    const merchant = transaction.merchant.toLowerCase();
    const category = this.merchantDatabase.get(merchant);
    
    if (category) {
      const categoryData = this.categories[category];
      return {
        category: category,
        subcategory: categoryData.subcategories[0],
        confidence: 0.9,
        source: 'merchant_match'
      };
    }
    
    return null;
  }

  private combineSignals(signals: (CategorizationResult | null)[]): CategorizationResult {
    const validSignals = signals.filter(s => s !== null) as CategorizationResult[];
    
    if (validSignals.length === 0) {
      return {
        category: 'Other',
        subcategory: 'General',
        confidence: 0.1,
        source: 'keyword_match'
      };
    }
    
    // Sort by confidence
    validSignals.sort((a, b) => b.confidence - a.confidence);
    
    const best = validSignals[0];
    const alternatives = validSignals.slice(1).map(s => ({
      category: s.category,
      subcategory: s.subcategory,
      confidence: s.confidence
    }));
    
    return {
      category: best.category,
      subcategory: best.subcategory,
      confidence: best.confidence,
      source: best.source,
      alternatives
    };
  }

  private async applyUserPreferences(result: CategorizationResult, userId: string): Promise<CategorizationResult> {
    // For now, just return the result as-is
    // In the future, this could apply user-specific preferences
    return result;
  }

  // Learning from user corrections
  async learnFromCorrection(userId: string, transaction: Transaction, oldCategory: string, newCategory: string): Promise<void> {
    console.log(`🏷️ Tag: Learning from correction - ${transaction.merchant}: ${oldCategory} → ${newCategory}`);
    
    const userPatterns = this.userPatterns.get(userId) || [];
    
    // Create or update pattern
    const existingPattern = userPatterns.find(p => p.merchant.toLowerCase() === transaction.merchant.toLowerCase());
    
    if (existingPattern) {
      existingPattern.category = newCategory;
      existingPattern.confidence = Math.min(existingPattern.confidence + 0.1, 1.0);
      existingPattern.usage++;
      existingPattern.lastUsed = Date.now();
    } else {
      const newPattern: UserPattern = {
        merchant: transaction.merchant,
        amount: { min: transaction.amount * 0.8, max: transaction.amount * 1.2 },
        description: transaction.description,
        category: newCategory,
        subcategory: 'General',
        confidence: 0.9,
        usage: 1,
        lastUsed: Date.now()
      };
      userPatterns.push(newPattern);
    }
    
    this.userPatterns.set(userId, userPatterns);
    
    // Save to localStorage for now (in production, save to database)
    localStorage.setItem(`tag_patterns_${userId}`, JSON.stringify(userPatterns));
    
    // Create auto-rule if this is a strong pattern
    if (await this.shouldCreateRule(userId, transaction, newCategory)) {
      await this.createAutoRule(userId, {
        condition: `merchant == "${transaction.merchant}"`,
        category: newCategory,
        subcategory: 'General',
        confidence: 1.0
      });
    }
  }

  private async shouldCreateRule(userId: string, transaction: Transaction, category: string): Promise<boolean> {
    const userPatterns = this.userPatterns.get(userId) || [];
    const merchantPatterns = userPatterns.filter(p => p.merchant.toLowerCase() === transaction.merchant.toLowerCase());
    
    // Create rule if we have 3+ corrections for the same merchant
    return merchantPatterns.length >= 3;
  }

  private async createAutoRule(userId: string, pattern: {condition: string; category: string; subcategory: string; confidence: number}): Promise<void> {
    const userRules = this.customRules.get(userId) || [];
    
    const rule: CustomRule = {
      id: `auto_${Date.now()}`,
      userId: userId,
      name: `Auto-rule for ${pattern.condition}`,
      conditions: [{
        field: 'merchant',
        operator: 'equals',
        value: pattern.condition.split('"')[1]
      }],
      category: pattern.category,
      subcategory: pattern.subcategory,
      priority: 100,
      created: Date.now(),
      usage: 0
    };
    
    userRules.push(rule);
    this.customRules.set(userId, userRules);
    
    // Save to localStorage for now
    localStorage.setItem(`tag_rules_${userId}`, JSON.stringify(userRules));
    
    console.log(`🏷️ Tag: Created auto-rule for ${pattern.condition}`);
  }

  // Bulk categorization with optimization
  async bulkCategorize(transactions: Transaction[], userId: string): Promise<Transaction[]> {
    console.log(`🏷️ Tag: Bulk categorizing ${transactions.length} transactions`);
    
    // Group similar transactions
    const groups = this.groupSimilarTransactions(transactions);
    const categorized: Transaction[] = [];
    
    for (const group of groups) {
      if (group.length === 1) {
        // Single transaction
        const result = await this.categorizeTransaction(group[0], userId);
        categorized.push({ ...group[0], ...result });
      } else {
        // Multiple similar transactions - categorize once, apply to all
        const sample = group[0];
        const result = await this.categorizeTransaction(sample, userId);
        
        // Apply to all in group
        for (const transaction of group) {
          categorized.push({ ...transaction, ...result });
        }
      }
    }
    
    return categorized;
  }

  private groupSimilarTransactions(transactions: Transaction[]): Transaction[][] {
    const groups: Transaction[][] = [];
    const processed = new Set<number>();
    
    for (let i = 0; i < transactions.length; i++) {
      if (processed.has(i)) continue;
      
      const group = [transactions[i]];
      processed.add(i);
      
      // Find similar transactions
      for (let j = i + 1; j < transactions.length; j++) {
        if (processed.has(j)) continue;
        
        if (this.areSimilar(transactions[i], transactions[j])) {
          group.push(transactions[j]);
          processed.add(j);
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }

  private areSimilar(t1: Transaction, t2: Transaction): boolean {
    // Same merchant
    if (t1.merchant.toLowerCase() === t2.merchant.toLowerCase()) {
      return true;
    }
    
    // Similar amount (within 20%)
    const amountDiff = Math.abs(t1.amount - t2.amount) / Math.max(t1.amount, t2.amount);
    if (amountDiff < 0.2) {
      return true;
    }
    
    return false;
  }

  // Smart rule creation
  async createSmartRule(userId: string, pattern: {
    name: string;
    merchant?: string;
    merchantExact?: boolean;
    amountRange?: {min: number; max: number};
    keywords?: string[];
    category: string;
    subcategory: string;
    priority?: number;
  }): Promise<CustomRule> {
    const rule: CustomRule = {
      id: `smart_${Date.now()}`,
      userId: userId,
      name: pattern.name,
      conditions: [],
      category: pattern.category,
      subcategory: pattern.subcategory,
      priority: pattern.priority || 0,
      created: Date.now(),
      usage: 0
    };
    
    // Build conditions
    if (pattern.merchant) {
      rule.conditions.push({
        field: 'merchant',
        operator: pattern.merchantExact ? 'equals' : 'contains',
        value: pattern.merchant
      });
    }
    
    if (pattern.amountRange) {
      rule.conditions.push({
        field: 'amount',
        operator: 'between',
        min: pattern.amountRange.min,
        max: pattern.amountRange.max
      });
    }
    
    if (pattern.keywords) {
      rule.conditions.push({
        field: 'description',
        operator: 'contains_any',
        values: pattern.keywords
      });
    }
    
    const userRules = this.customRules.get(userId) || [];
    userRules.push(rule);
    this.customRules.set(userId, userRules);
    
    // Save to localStorage
    localStorage.setItem(`tag_rules_${userId}`, JSON.stringify(userRules));
    
    console.log(`🏷️ Tag: Created smart rule: ${pattern.name}`);
    return rule;
  }

  // Load user data from localStorage
  loadUserData(userId: string): void {
    try {
      const patternsData = localStorage.getItem(`tag_patterns_${userId}`);
      if (patternsData) {
        this.userPatterns.set(userId, JSON.parse(patternsData));
      }
      
      const rulesData = localStorage.getItem(`tag_rules_${userId}`);
      if (rulesData) {
        this.customRules.set(userId, JSON.parse(rulesData));
      }
    } catch (error) {
      console.error('🏷️ Tag: Error loading user data:', error);
    }
  }

  // Get user statistics
  getUserStats(userId: string): {
    totalPatterns: number;
    totalRules: number;
    accuracy: number;
    mostUsedCategory: string;
  } {
    const patterns = this.userPatterns.get(userId) || [];
    const rules = this.customRules.get(userId) || [];
    
    const categoryUsage = new Map<string, number>();
    patterns.forEach(pattern => {
      const count = categoryUsage.get(pattern.category) || 0;
      categoryUsage.set(pattern.category, count + pattern.usage);
    });
    
    const mostUsedCategory = Array.from(categoryUsage.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';
    
    return {
      totalPatterns: patterns.length,
      totalRules: rules.length,
      accuracy: patterns.length > 0 ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length : 0,
      mostUsedCategory
    };
  }
}

// Export singleton instance
export const tagCategorizationBrain = new TagCategorizationBrain();
