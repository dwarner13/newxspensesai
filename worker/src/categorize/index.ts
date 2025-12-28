import { config } from '../config.js';
import { logUtils } from '../logging.js';
import { SupabaseDatabase } from '../supabase.js';

// Transaction interface
export interface Transaction {
  id?: string;
  date: string;
  merchant: string;
  description: string;
  amount: number;
  direction: 'debit' | 'credit';
  category?: string;
  subcategory?: string;
}

// Categorization result interface
export interface CategorizationResult {
  transactions: Transaction[];
  rulesUsed: number;
  llmUsed: boolean;
  confidence: number;
}

// Rules-based categorizer
export class RulesBasedCategorizer {
  rules: Array<{
    id: string;
    keyword: string;
    category: string;
    subcategory?: string;
    matchCount: number;
  }> = [];
  
  async loadRules(userId: string): Promise<void> {
    try {
      this.rules = await SupabaseDatabase.getCategorizationRules(userId);
      if (this.rules.length === 0) {
        console.log(`[RulesBasedCategorizer] No categorization rules found for user ${userId}`);
      } else {
        console.log(`[RulesBasedCategorizer] Loaded ${this.rules.length} categorization rules`);
      }
    } catch (error) {
      // Check if error indicates missing table
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (errorMessage.includes('categorization_rules') || 
          errorMessage.includes('schema cache') ||
          errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        console.warn(`[RulesBasedCategorizer] Rules table not found, skipping rules-based categorization: ${error instanceof Error ? error.message : String(error)}`);
        this.rules = []; // Set empty rules array
        return; // Don't throw, just return with empty rules
      }
      // For other errors (e.g., connection issues, corrupt data), throw as before
      throw new Error(`Failed to load categorization rules: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async categorizeTransactions(transactions: Transaction[], userId: string): Promise<CategorizationResult> {
    try {
      // Try to load rules - if table doesn't exist, this will log a warning and set rules to []
      await this.loadRules(userId);
      
      // If no rules available, return transactions unchanged
      if (this.rules.length === 0) {
        console.log(`[RulesBasedCategorizer] No rules available, returning transactions without categorization`);
        return {
          transactions,
          rulesUsed: 0,
          llmUsed: false,
          confidence: 0, // No categorization performed
        };
      }
      
      let rulesUsed = 0;
      let categorizedCount = 0;
      
      for (const transaction of transactions) {
        const category = await this.categorizeTransaction(transaction, userId);
        if (category) {
          transaction.category = category.category;
          transaction.subcategory = category.subcategory;
          categorizedCount++;
          rulesUsed++;
        }
      }
      
      const confidence = transactions.length > 0 ? categorizedCount / transactions.length : 0;
      
      logUtils.logCategorizationResults(categorizedCount, rulesUsed, false);
      
      return {
        transactions,
        rulesUsed,
        llmUsed: false,
        confidence,
      };
    } catch (error) {
      // Check if error is due to missing table (shouldn't happen if loadRules handled it, but just in case)
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (errorMessage.includes('categorization_rules') || 
          errorMessage.includes('schema cache') ||
          errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        console.warn(`[RulesBasedCategorizer] Rules table not found, returning transactions without categorization: ${error instanceof Error ? error.message : String(error)}`);
        return {
          transactions,
          rulesUsed: 0,
          llmUsed: false,
          confidence: 0,
        };
      }
      // For other errors (e.g., corrupt rule data, DB connection issues), throw as before
      throw new Error(`Rules-based categorization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async categorizeTransaction(transaction: Transaction, userId: string): Promise<{
    category: string;
    subcategory?: string;
  } | null> {
    const searchText = `${transaction.merchant} ${transaction.description}`.toLowerCase();
    
    // Find matching rules
    const matchingRules = this.rules.filter(rule => 
      searchText.includes(rule.keyword.toLowerCase())
    );
    
    if (matchingRules.length === 0) {
      return null;
    }
    
    // Use the rule with the highest match count (most trusted)
    const bestRule = matchingRules.reduce((best, current) => 
      current.matchCount > best.matchCount ? current : best
    );
    
    // Update rule match count
    await SupabaseDatabase.updateRuleMatchCount(bestRule.id);
    
    return {
      category: bestRule.category,
      subcategory: bestRule.subcategory,
    };
  }
}

// Vendor examples for batch categorization
export interface VendorExamples {
  vendor: string;
  examples: Transaction[]; // Up to 3 representative transactions
}

// Standard categories list with descriptions for better AI understanding
const STANDARD_CATEGORIES = [
  'Groceries',
  'Restaurants',
  'Entertainment',
  'Transport',
  'Utilities',
  'Shopping',
  'Healthcare',
  'Education',
  'Subscriptions',
  'Fees',
  'Income',
  'Other',
];

// Category descriptions for enhanced AI understanding
const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Groceries': 'Supermarkets, grocery stores, food markets, farmers markets',
  'Restaurants': 'Restaurants, cafes, fast food, dining out, food delivery',
  'Entertainment': 'Movies, concerts, streaming services, games, hobbies, events',
  'Transport': 'Gas stations, public transit, ride-sharing (Uber, Lyft), parking, car maintenance',
  'Utilities': 'Electricity, water, gas, internet, phone bills, home services',
  'Shopping': 'Retail stores, online shopping (Amazon, eBay), clothing, electronics, general merchandise',
  'Healthcare': 'Doctors, pharmacies, medical services, health insurance, wellness',
  'Education': 'Schools, courses, books, educational services, tuition',
  'Subscriptions': 'Monthly/annual subscriptions (Netflix, Spotify, software), memberships',
  'Fees': 'Bank fees, service charges, late fees, transaction fees',
  'Income': 'Salary, wages, refunds, deposits, transfers in',
  'Other': 'Miscellaneous expenses that don\'t fit other categories',
};

// In-memory vendor cache (per user session)
const vendorCategoryCache = new Map<string, Map<string, string>>(); // userId -> vendor -> category

// Enhanced category learning system
// Tracks user corrections and improves categorization over time

interface CategoryLearning {
  vendor: string;
  category: string;
  confidence: number;
  lastUsed: Date;
  correctionCount: number; // How many times user corrected this vendor
}

// In-memory learning store (per user)
const categoryLearningStore = new Map<string, Map<string, CategoryLearning>>(); // userId -> vendor -> learning

/**
 * Learn from user correction
 */
export function learnFromUserCorrection(
  userId: string,
  vendor: string,
  category: string
): void {
  if (!categoryLearningStore.has(userId)) {
    categoryLearningStore.set(userId, new Map());
  }
  
  const userLearning = categoryLearningStore.get(userId)!;
  const existing = userLearning.get(vendor.toLowerCase());
  
  if (existing) {
    // Update existing learning - increase confidence with each correction
    existing.category = category;
    existing.confidence = Math.min(existing.confidence + 0.1, 1.0);
    existing.correctionCount += 1;
    existing.lastUsed = new Date();
  } else {
    // New learning
    userLearning.set(vendor.toLowerCase(), {
      vendor: vendor.toLowerCase(),
      category,
      confidence: 0.9, // High confidence for user corrections
      lastUsed: new Date(),
      correctionCount: 1,
    });
  }
  
  console.log(`[CategoryLearning] Learned: ${vendor} → ${category} (confidence: ${userLearning.get(vendor.toLowerCase())?.confidence})`);
}

/**
 * Get learned category for vendor
 */
export function getLearnedCategory(
  userId: string,
  vendor: string
): string | null {
  const userLearning = categoryLearningStore.get(userId);
  if (!userLearning) {
    return null;
  }
  
  const learning = userLearning.get(vendor.toLowerCase());
  return learning ? learning.category : null;
}

/**
 * Check if vendor has high-confidence learning
 */
export function hasHighConfidenceLearning(
  userId: string,
  vendor: string
): boolean {
  const learning = categoryLearningStore.get(userId)?.get(vendor.toLowerCase());
  return learning ? learning.confidence >= 0.8 : false;
}

// LLM-based categorizer
export class LLMCategorizer {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  /**
   * Vendor-level categorization - categorizes multiple vendors in a single LLM call
   */
  async categorizeVendorsWithLLM(
    vendorExamples: VendorExamples[],
    userId: string
  ): Promise<Record<string, string>> {
    if (vendorExamples.length === 0) {
      return {};
    }
    
    const startTime = Date.now();
    
    try {
      // Check cache first
      const userCache = vendorCategoryCache.get(userId) || new Map<string, string>();
      const cached: Record<string, string> = {};
      const uncachedVendors: VendorExamples[] = [];
      
      // Also check learned categories (user corrections)
      for (const vendorExample of vendorExamples) {
        const cachedCategory = userCache.get(vendorExample.vendor.toLowerCase());
        const learnedCategory = getLearnedCategory(userId, vendorExample.vendor);
        
        if (cachedCategory) {
          cached[vendorExample.vendor] = cachedCategory;
        } else if (learnedCategory && hasHighConfidenceLearning(userId, vendorExample.vendor)) {
          // Use learned category if high confidence
          cached[vendorExample.vendor] = learnedCategory;
          userCache.set(vendorExample.vendor.toLowerCase(), learnedCategory); // Update cache
        } else {
          uncachedVendors.push(vendorExample);
        }
      }
      
      // If all vendors are cached, return immediately
      if (uncachedVendors.length === 0) {
        const cacheTime = Date.now() - startTime;
        console.log(`[LLMCategorizer] All ${vendorExamples.length} vendors found in cache (${cacheTime}ms)`);
        return cached;
      }
      
      console.log(`[LLMCategorizer] Categorizing ${uncachedVendors.length} vendors with LLM (${vendorExamples.length - uncachedVendors.length} from cache)`);
      
      // Build prompt for batch vendor categorization
      const vendorList = uncachedVendors.map(ve => {
        const examples = ve.examples.slice(0, 3).map(txn => 
          `- ${txn.date} | ${txn.description || txn.merchant} | $${txn.amount}`
        ).join('\n');
        return `${ve.vendor}:\n${examples}`;
      }).join('\n\n');
      
      const prompt = `You are a financial transaction categorizer with deep understanding of spending patterns. Categorize each vendor below by choosing exactly one category from this list:

${STANDARD_CATEGORIES.map(c => {
  const desc = CATEGORY_DESCRIPTIONS[c] || '';
  return `- **${c}**: ${desc}`;
}).join('\n')}

Guidelines:
- **Groceries**: Food shopping at supermarkets, grocery stores
- **Restaurants**: Any dining out, cafes, fast food, food delivery
- **Entertainment**: Movies, concerts, streaming, games, events
- **Transport**: Gas, public transit, ride-sharing, parking, car services
- **Utilities**: Home utilities (electric, water, gas, internet, phone)
- **Shopping**: Retail purchases, online shopping, general merchandise
- **Healthcare**: Medical services, pharmacies, health-related expenses
- **Education**: Schools, courses, educational materials
- **Subscriptions**: Recurring monthly/annual services
- **Fees**: Bank fees, service charges, penalties
- **Income**: Money coming in (salary, refunds, deposits)
- **Other**: Anything that doesn't clearly fit above categories

Vendors and example transactions:
${vendorList}

Return ONLY a JSON object mapping vendor name to category. Example:
{"Starbucks": "Restaurants", "Amazon": "Shopping", "Uber": "Transport", "Shell": "Transport"}

Be consistent and accurate. Do not include explanations or other text.`;

      const llmStartTime = Date.now();
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a financial transaction categorizer. Return only JSON mapping vendor names to categories.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });
      
      const llmTime = Date.now() - llmStartTime;
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      const result: any = await response.json();
      const content = result.choices?.[0]?.message?.content;
      
      if (!content) {
        return cached;
      }
      
      try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = content.trim();
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        
        const vendorCategories = JSON.parse(jsonStr);
        
        // Update cache
        if (!vendorCategoryCache.has(userId)) {
          vendorCategoryCache.set(userId, new Map());
        }
        const userCacheMap = vendorCategoryCache.get(userId)!;
        
        for (const [vendor, category] of Object.entries(vendorCategories)) {
          if (typeof category === 'string' && STANDARD_CATEGORIES.includes(category)) {
            userCacheMap.set(vendor.toLowerCase(), category);
            cached[vendor] = category;
          }
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`[LLMCategorizer] Categorized ${Object.keys(vendorCategories).length} vendors in ${totalTime}ms (LLM call: ${llmTime}ms)`);
        return cached;
      } catch (parseError) {
        console.warn('[LLMCategorizer] Failed to parse vendor categories:', parseError);
        return cached;
      }
    } catch (error) {
      const totalTime = Date.now() - startTime;
      console.warn(`[LLMCategorizer] Vendor categorization failed after ${totalTime}ms:`, error);
      return {};
    }
  }
  
  /**
   * Legacy method - kept for backward compatibility but now uses vendor-level categorization
   */
  async categorizeTransactions(transactions: Transaction[]): Promise<CategorizationResult> {
    try {
      // Group uncategorized transactions by vendor
      const uncategorized = transactions.filter(t => !t.category || t.category === 'Uncategorized');
      
      if (uncategorized.length === 0) {
        return {
          transactions,
          rulesUsed: 0,
          llmUsed: false,
          confidence: 0.8,
        };
      }
      
      // Build vendor examples
      const vendorMap = new Map<string, Transaction[]>();
      for (const txn of uncategorized) {
        const vendor = txn.merchant || 'Unknown';
        if (!vendorMap.has(vendor)) {
          vendorMap.set(vendor, []);
        }
        vendorMap.get(vendor)!.push(txn);
      }
      
      const vendorExamples: VendorExamples[] = Array.from(vendorMap.entries()).map(([vendor, txns]) => ({
        vendor,
        examples: txns.slice(0, 3), // Up to 3 examples per vendor
      }));
      
      // Use vendor-level categorization (requires userId, but we'll use a default for now)
      // In practice, this should be called from CategorizationProcessor which has userId
      const DEMO_USER_ID = '00000000-0000-4000-8000-000000000001';
      const vendorCategories = await this.categorizeVendorsWithLLM(vendorExamples, DEMO_USER_ID);
      
      // Apply categories to transactions
      const categorizedTransactions = transactions.map(txn => {
        if (!txn.category || txn.category === 'Uncategorized') {
          const vendor = txn.merchant || 'Unknown';
          const category = vendorCategories[vendor];
          if (category) {
            return {
              ...txn,
              category,
            };
          }
        }
        return txn;
      });
      
      const llmUsed = Object.keys(vendorCategories).length > 0;
      
      logUtils.logCategorizationResults(categorizedTransactions.length, 0, llmUsed);
      
      return {
        transactions: categorizedTransactions,
        rulesUsed: 0,
        llmUsed,
        confidence: 0.8,
      };
    } catch (error) {
      throw new Error(`LLM categorization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async categorizeTransaction(transaction: Transaction): Promise<{
    category: string;
    subcategory?: string;
  } | null> {
    // Legacy method - no longer used, vendor-level categorization is preferred
    try {
      const prompt = this.buildCategorizationPrompt(transaction);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a financial transaction categorizer. Output strictly this JSON schema: {category: string, subcategory?: string} with standard financial categories like Food, Transportation, Entertainment, etc. Do not include explanations.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.1,
          max_tokens: 100,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      const result: any = await response.json();
      const content = result.choices?.[0]?.message?.content;
      
      if (!content) {
        return null;
      }
      
      try {
        const categoryData = JSON.parse(content);
        return {
          category: categoryData.category,
          subcategory: categoryData.subcategory,
        };
      } catch (parseError) {
        return null;
      }
    } catch (error) {
      throw new Error(`LLM categorization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private buildCategorizationPrompt(transaction: Transaction): string {
    return `Categorize this transaction:
Merchant: ${transaction.merchant}
Description: ${transaction.description}
Amount: $${transaction.amount}
Direction: ${transaction.direction}

Return JSON: {category: string, subcategory?: string}`;
  }
}

// Main categorization processor
export class CategorizationProcessor {
  private rulesCategorizer: RulesBasedCategorizer;
  private llmCategorizer?: LLMCategorizer;
  
  constructor() {
    this.rulesCategorizer = new RulesBasedCategorizer();
    
    // Always initialize LLM categorizer if API key is available (for ensuring all transactions are categorized)
    if (config.ai.openai.apiKey) {
      this.llmCategorizer = new LLMCategorizer(config.ai.openai.apiKey);
    }
  }
  
  async categorizeTransactions(
    transactions: Transaction[],
    userId: string
  ): Promise<CategorizationResult> {
    try {
      // First, try rules-based categorization
      // If rules table doesn't exist, this will return transactions unchanged with rulesUsed: 0
      const rulesResult = await this.rulesCategorizer.categorizeTransactions(transactions, userId);
      
      // Ensure ALL transactions are categorized - use vendor-level LLM fallback for any uncategorized transactions
      const uncategorizedTransactions = rulesResult.transactions.filter(t => !t.category || t.category === 'Uncategorized');
      
      if (uncategorizedTransactions.length > 0) {
        if (this.llmCategorizer) {
          console.log(`[CategorizationProcessor] Categorizing ${uncategorizedTransactions.length} uncategorized transactions with vendor-level LLM`);
          
          // Group by vendor
          const vendorMap = new Map<string, Transaction[]>();
          for (const txn of uncategorizedTransactions) {
            const vendor = txn.merchant || 'Unknown';
            if (!vendorMap.has(vendor)) {
              vendorMap.set(vendor, []);
            }
            vendorMap.get(vendor)!.push(txn);
          }
          
          // Build vendor examples
          const vendorExamples: VendorExamples[] = Array.from(vendorMap.entries()).map(([vendor, txns]) => ({
            vendor,
            examples: txns.slice(0, 3), // Up to 3 examples per vendor
          }));
          
          // Check rules table for vendor-based rules before calling LLM
          const rules = this.rulesCategorizer.rules || [];
          const vendorCategories: Record<string, string> = {};
          
          // Check existing rules for vendor matches
          for (const vendorExample of vendorExamples) {
            const matchingRule = rules.find(rule => 
              vendorExample.vendor.toLowerCase().includes(rule.keyword.toLowerCase()) ||
              rule.keyword.toLowerCase().includes(vendorExample.vendor.toLowerCase())
            );
            if (matchingRule) {
              vendorCategories[vendorExample.vendor] = matchingRule.category;
            }
          }
          
          // Only send vendors without rules to LLM
          const vendorsNeedingLLM = vendorExamples.filter(ve => !vendorCategories[ve.vendor]);
          
          if (vendorsNeedingLLM.length > 0) {
            const llmCategories = await this.llmCategorizer.categorizeVendorsWithLLM(vendorsNeedingLLM, userId);
            Object.assign(vendorCategories, llmCategories);
            
            // Save new vendor→category mappings as rules
            for (const [vendor, category] of Object.entries(llmCategories)) {
              try {
                await this.createRule(userId, vendor.toLowerCase(), category);
                // Also update learning store
                learnFromUserCorrection(userId, vendor, category);
              } catch (ruleError) {
                // If rules table doesn't exist, just log and continue
                const errorMsg = ruleError instanceof Error ? ruleError.message.toLowerCase() : String(ruleError).toLowerCase();
                if (!errorMsg.includes('categorization_rules') && !errorMsg.includes('schema cache')) {
                  console.warn(`[CategorizationProcessor] Failed to save vendor rule: ${ruleError}`);
                }
                // Still update learning store even if DB save fails
                learnFromUserCorrection(userId, vendor, category);
              }
            }
          }
          
          // Apply vendor categories to all uncategorized transactions
          const finalTransactions = rulesResult.transactions.map(transaction => {
            if (!transaction.category || transaction.category === 'Uncategorized') {
              const vendor = transaction.merchant || 'Unknown';
              const category = vendorCategories[vendor];
              if (category) {
                return {
                  ...transaction,
                  category,
                };
              }
            }
            return transaction;
          });
          
          // Ensure any remaining uncategorized transactions get a default category
          const fullyCategorized = finalTransactions.map(t => ({
            ...t,
            category: t.category || 'Uncategorized',
          }));
          
          return {
            transactions: fullyCategorized,
            rulesUsed: rulesResult.rulesUsed,
            llmUsed: vendorsNeedingLLM.length > 0,
            confidence: Math.max(rulesResult.confidence, 0.8),
          };
        } else {
          // No LLM available - assign default category to uncategorized transactions
          console.log(`[CategorizationProcessor] No LLM available, assigning default category to ${uncategorizedTransactions.length} uncategorized transactions`);
          const defaultCategorized = rulesResult.transactions.map(t => ({
            ...t,
            category: t.category || 'Uncategorized',
          }));
          
          return {
            transactions: defaultCategorized,
            rulesUsed: rulesResult.rulesUsed,
            llmUsed: false,
            confidence: rulesResult.confidence,
          };
        }
      }
      
      // All transactions already categorized
      return rulesResult;
    } catch (error) {
      // Check if error is due to missing rules table
      const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
      if (errorMessage.includes('categorization_rules') || 
          errorMessage.includes('schema cache') ||
          errorMessage.includes('relation') && errorMessage.includes('does not exist')) {
        console.warn(`[CategorizationProcessor] Rules table not found, returning transactions without categorization: ${error instanceof Error ? error.message : String(error)}`);
        return {
          transactions,
          rulesUsed: 0,
          llmUsed: false,
          confidence: 0,
        };
      }
      // For other errors (e.g., LLM API failures, corrupt data), throw as before
      throw new Error(`Categorization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Create new categorization rule
  async createRule(userId: string, keyword: string, category: string, subcategory?: string): Promise<void> {
    try {
      await SupabaseDatabase.createCategorizationRule({
        user_id: userId,
        keyword,
        category,
        subcategory,
      });
      // Update learning store
      learnFromUserCorrection(userId, keyword, category);
    } catch (error) {
      // Still update learning store even if DB save fails
      learnFromUserCorrection(userId, keyword, category);
      throw new Error(`Failed to create categorization rule: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Learn from user correction (called from API endpoint)
   */
  async learnFromCorrection(userId: string, vendor: string, category: string): Promise<void> {
    learnFromUserCorrection(userId, vendor, category);
    
    // Also save as rule for persistence
    try {
      await this.createRule(userId, vendor.toLowerCase(), category);
    } catch (error) {
      // Learning store is updated even if DB save fails
      console.warn(`[CategorizationProcessor] Failed to save correction rule: ${error}`);
    }
  }
}





