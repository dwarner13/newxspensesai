/**
 * Simple Server-Side Categorizer
 * 
 * Uses rule-based matching with AI fallback
 * Called by normalize-transactions.ts
 * 
 * Strategy:
 * 1. Check learned patterns from user corrections (tag_category_feedback)
 * 2. Check rule-based matching (fast, deterministic)
 * 3. AI fallback for unknown vendors
 */

import { OpenAI } from 'openai';
import { admin } from './upload';
import { getLearnedCategoryForTransaction } from './tag-learning';
import { serverSupabase } from './supabase';

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
  source: 'learned' | 'rule' | 'ai' | 'memory' | 'none';
};

/**
 * Simple result type for categorizeTransactionWithLearning wrapper
 */
export type LearningCategorizationResult = {
  category: string;
  confidence: number;
  source: 'learned' | 'ai';
};

/**
 * Categorize a transaction (server-side, simple and fast)
 * 
 * @param description - Transaction description
 * @param merchant - Merchant name
 * @param amount - Transaction amount
 * @param userId - Optional user ID for learned patterns
 */
export async function categorizeTransaction(
  description: string,
  merchant: string | null,
  amount: number,
  userId?: string
): Promise<CategorizationResult> {
  const text = `${description} ${merchant || ''}`.toLowerCase();
  
  // Step 1: Check learned patterns from user corrections (if userId provided)
  if (userId) {
    try {
      const supabase = serverSupabase();
      const learned = await getLearnedCategoryForTransaction(
        supabase,
        userId,
        merchant,
        description
      );

      // If we found a learned category with at least 2 corrections, use it
      if (learned && learned.count >= 2) {
        // Use the learned category! User corrected this merchant before.
        return {
          category: learned.category,
          confidence: 0.95, // High confidence for learned patterns
          source: 'learned'
        };
      }
    } catch (error) {
      // Fail silently - log and continue to other methods
      console.error('[Categorize] Learned pattern check failed:', error);
    }
  }
  
  // Step 2: Rule-based matching (fast, deterministic)
  for (const [category, pattern] of Object.entries(CATEGORY_RULES)) {
    if (pattern.test(text)) {
      return {
        category,
        confidence: 0.85,
        source: 'rule'
      };
    }
  }
  
  // Step 3: Check user's vendor memory (optional, skip for now)
  // TODO: Query categorization_rules table for user-specific patterns
  
  // Step 4: AI fallback for unknown vendors (only if needed)
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

/**
 * Categorize transaction with learning - Simple wrapper
 * 
 * This is the main function to use when you want Tag to categorize a transaction.
 * It first checks if Tag has learned from the user's past corrections, then
 * falls back to AI if needed.
 * 
 * @param input - Transaction details
 * @returns Category with confidence and source ('learned' or 'ai')
 */
export async function categorizeTransactionWithLearning(input: {
  userId: string;
  description?: string;
  merchant?: string | null;
  amount?: number;
}): Promise<LearningCategorizationResult> {
  // Step 1: Check if Tag has learned from user corrections
  try {
    const supabase = serverSupabase();
    const learned = await getLearnedCategoryForTransaction(
      supabase,
      input.userId,
      input.merchant,
      input.description
    );

    // Step 2: If we found a learned category AND user corrected it at least 2 times
    if (learned && learned.count >= 2) {
      // Use the learned category! Tag remembers what the user wants.
      return {
        category: learned.category,
        confidence: 0.99, // Very high confidence - user told us this before
        source: 'learned'
      };
    }
  } catch (error) {
    // If anything goes wrong checking learned patterns, just continue to AI
    console.error('[Tag] Error checking learned patterns:', error);
  }

  // Step 3: No learned pattern found, use AI to guess the category
  // Call the existing categorizeTransaction function (which handles rules + AI)
  const aiResult = await categorizeTransaction(
    input.description || '',
    input.merchant || null,
    input.amount || 0,
    input.userId
  );

  // Step 4: Return result with source 'ai'
  return {
    category: aiResult.category || 'Other',
    confidence: aiResult.confidence || 0.8,
    source: 'ai'
  };
}

