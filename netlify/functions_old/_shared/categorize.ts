/**
 * Simple Server-Side Categorizer
 * 
 * Uses rule-based matching with AI fallback
 * Called by normalize-transactions.ts
 */

import { OpenAI } from 'openai';
import { admin } from './upload';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Simple rule-based categories
const CATEGORY_RULES: Record<string, RegExp> = {
  'Dining': /(restaurant|cafe|coffee|starbucks|mcdonald|pizza|burger|food|dining|uber eats|doordash)/i,
  'Groceries': /(grocery|supermarket|walmart|costco|whole foods|safeway|kroger|trader joe)/i,
  'Transportation': /(uber|lyft|taxi|gas|fuel|transit|parking|metro|subway)/i,
  'Shopping': /(amazon|ebay|target|best buy|apple store|shopping|retail)/i,
  'Entertainment': /(netflix|spotify|movie|theater|concert|gaming|steam|playstation)/i,
  'Utilities': /(electric|gas|water|internet|phone|bell|rogers|telus|hydro)/i,
  'Healthcare': /(pharmacy|doctor|dental|hospital|medical|health|prescription)/i,
  'Travel': /(hotel|airline|flight|airbnb|booking|expedia|travel)/i,
  'Office Supplies': /(staples|office|supplies|paper|ink|printer)/i,
  'Subscription': /(subscription|membership|monthly|annual|recurring)/i,
};

export type CategorizationResult = {
  category: string | null;
  subcategory?: string | null;
  confidence: number;  // 0-1
  source: 'rule' | 'ai' | 'memory' | 'none';
};

/**
 * Categorize a transaction (server-side, simple and fast)
 */
export async function categorizeTransaction(
  description: string,
  merchant: string | null,
  amount: number
): Promise<CategorizationResult> {
  const text = `${description} ${merchant || ''}`.toLowerCase();
  
  // Step 1: Rule-based matching (fast, deterministic)
  for (const [category, pattern] of Object.entries(CATEGORY_RULES)) {
    if (pattern.test(text)) {
      return {
        category,
        confidence: 0.85,
        source: 'rule'
      };
    }
  }
  
  // Step 2: Check user's vendor memory (optional, skip for now)
  // TODO: Query categorization_rules table for user-specific patterns
  
  // Step 3: AI fallback for unknown vendors (only if needed)
  if (Math.abs(amount) > 10) {  // Only use AI for amounts > $10
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          {
            role: 'system',
            content: 'Categorize this transaction into ONE category: Dining, Groceries, Transportation, Shopping, Entertainment, Utilities, Healthcare, Travel, Office Supplies, Subscription, or Other. Reply with ONLY the category name.'
          },
          {
            role: 'user',
            content: `Transaction: ${description}\nMerchant: ${merchant}\nAmount: $${Math.abs(amount)}`
          }
        ]
      });
      
      const category = response.choices[0]?.message?.content?.trim() || 'Other';
      
      return {
        category,
        confidence: 0.70,  // Lower confidence for AI
        source: 'ai'
      };
    } catch (error) {
      console.error('[Categorize] AI failed:', error);
    }
  }
  
  // Step 4: Default fallback
  return {
    category: null,
    confidence: 0,
    source: 'none'
  };
}

