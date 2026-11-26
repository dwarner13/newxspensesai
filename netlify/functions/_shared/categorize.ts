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
import { resolveCategoryRequest } from './tagCategories';

/** Category the customer must review (owner GO 2026-11-26: unknown AI categories require review). */
export const REVIEW_CATEGORY = 'Needs Review';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// Simple rule-based categories
const CATEGORY_RULES: Record<string, RegExp> = {
  'Food & Dining': /(restaurant|cafe|coffee|starbucks|mcdonald|pizza|burger|food|dining|uber eats|doordash|tim horton|second cup)/i,
  'Groceries': /(grocery|supermarket|walmart|costco|whole foods|safeway|kroger|trader joe|sobeys|save on foods|loblaws)/i,
  'Transportation': /(uber|lyft|taxi|gas|fuel|transit|parking|metro|subway|petro|shell|esso)/i,
  'Shopping': /(amazon|ebay|target|best buy|apple store|shopping|retail)/i,
  'Entertainment': /(netflix|spotify|movie|theater|concert|gaming|steam|playstation|disney)/i,
  'Utilities': /(electric|water|internet|bell|rogers|telus|hydro|shaw|fido|koodo)/i,
  'Healthcare': /(pharmacy|doctor|dental|hospital|medical|health|prescription|shoppers drug|rexall)/i,
  'Travel': /(hotel|airline|flight|airbnb|booking|expedia|travel|westjet|air canada)/i,
  'Subscriptions': /(subscription|membership|monthly|annual|recurring|adobe|microsoft|google one|apple.com|netlify|dreamhost|canva|openai|cursor)/i,
  'Bank Fees': /(service fee|service charge|interest charge|overdraft|nsf|balance protector|annual fee)/i,
  'Transfers': /(payment|e-transfer|interac|transfer)/i,
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
  /** 'none' = no learned, rule or AI answer: the row stays Uncategorized (never a silent "Other"). */
  source: 'learned' | 'rule' | 'ai' | 'none';
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

  // Step 2b: Do NOT use amount sign to infer income — credit card purchases
  // are always positive amounts in our pipeline. Amount sign is not a reliable
  // income indicator. Fall through to AI for unknown merchants.
  
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
            content: 'Categorize this transaction into ONE category: Income, Groceries, Food & Dining, Transportation, Shopping, Entertainment, Utilities, Healthcare, Travel, Subscriptions, Bank Fees, Transfers, Personal Care, Insurance, Debt Payments, or Needs Review. Reply with ONLY the category name, nothing else.'
          },
          {
            role: 'user',
            content: `Transaction: ${description}\nMerchant: ${merchant}\nAmount: $${Math.abs(amount)}`
          }
        ]
      });
      
      // Owner GO 2026-11-26: the model's answer is used only when it is a recognised Tag category
      // (exact name or alias). Anything else — an invented category, a sentence, an empty reply — goes
      // to review; it is never stored as if it were a real category.
      const raw = response.choices[0]?.message?.content?.trim() || '';
      const resolved = resolveCategoryRequest(raw.replace(/^category:\s*/i, ''));
      if (resolved.status !== 'exact') {
        return { category: REVIEW_CATEGORY, confidence: 0, source: 'ai' };
      }
      return {
        category: resolved.category,
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

  // Step 4 (owner GO 2026-11-26): report what actually decided the category. With no answer the row
  // stays Uncategorized for Tag / the customer — it used to become "Other" at 0.8 labelled 'ai', a
  // decision nobody made.
  if (!aiResult.category) {
    return { category: 'Uncategorized', confidence: 0, source: 'none' };
  }
  return {
    category: aiResult.category,
    confidence: aiResult.confidence,
    source: aiResult.source === 'rule' ? 'rule' : 'ai',
  };
}

