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
  private rules: Array<{
    id: string;
    keyword: string;
    category: string;
    subcategory?: string;
    matchCount: number;
  }> = [];
  
  async loadRules(userId: string): Promise<void> {
    try {
      this.rules = await SupabaseDatabase.getCategorizationRules(userId);
    } catch (error) {
      throw new Error(`Failed to load categorization rules: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  async categorizeTransactions(transactions: Transaction[], userId: string): Promise<CategorizationResult> {
    try {
      await this.loadRules(userId);
      
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
      
      const confidence = categorizedCount / transactions.length;
      
      logUtils.logCategorizationResults(categorizedCount, rulesUsed, false);
      
      return {
        transactions,
        rulesUsed,
        llmUsed: false,
        confidence,
      };
    } catch (error) {
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

// LLM-based categorizer
export class LLMCategorizer {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async categorizeTransactions(transactions: Transaction[]): Promise<CategorizationResult> {
    try {
      const categorizedTransactions: Transaction[] = [];
      let llmUsed = false;
      
      for (const transaction of transactions) {
        // Only use LLM if transaction is not already categorized
        if (!transaction.category) {
          const category = await this.categorizeTransaction(transaction);
          if (category) {
            transaction.category = category.category;
            transaction.subcategory = category.subcategory;
            llmUsed = true;
          }
        }
        categorizedTransactions.push(transaction);
      }
      
      const confidence = 0.8; // LLM categorization has high confidence
      
      logUtils.logCategorizationResults(categorizedTransactions.length, 0, true);
      
      return {
        transactions: categorizedTransactions,
        rulesUsed: 0,
        llmUsed,
        confidence,
      };
    } catch (error) {
      throw new Error(`LLM categorization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private async categorizeTransaction(transaction: Transaction): Promise<{
    category: string;
    subcategory?: string;
  } | null> {
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
      
      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
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
    
    if (config.ai.useLlmFallback && config.ai.openai.apiKey) {
      this.llmCategorizer = new LLMCategorizer(config.ai.openai.apiKey);
    }
  }
  
  async categorizeTransactions(
    transactions: Transaction[],
    userId: string
  ): Promise<CategorizationResult> {
    try {
      // First, try rules-based categorization
      const rulesResult = await this.rulesCategorizer.categorizeTransactions(transactions, userId);
      
      // If LLM fallback is enabled and confidence is low, use LLM
      if (this.llmCategorizer && rulesResult.confidence < 0.7) {
        const uncategorizedTransactions = rulesResult.transactions.filter(t => !t.category);
        
        if (uncategorizedTransactions.length > 0) {
          const llmResult = await this.llmCategorizer.categorizeTransactions(uncategorizedTransactions);
          
          // Merge results
          const finalTransactions = rulesResult.transactions.map(transaction => {
            const llmTransaction = llmResult.transactions.find(t => 
              t.merchant === transaction.merchant && 
              t.description === transaction.description && 
              t.amount === transaction.amount
            );
            
            if (llmTransaction && !transaction.category) {
              return llmTransaction;
            }
            
            return transaction;
          });
          
          return {
            transactions: finalTransactions,
            rulesUsed: rulesResult.rulesUsed,
            llmUsed: llmResult.llmUsed,
            confidence: Math.max(rulesResult.confidence, llmResult.confidence),
          };
        }
      }
      
      return rulesResult;
    } catch (error) {
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
    } catch (error) {
      throw new Error(`Failed to create categorization rule: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}


