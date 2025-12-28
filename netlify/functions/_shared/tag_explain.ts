/**
 * Tag Explanation Helper
 * 
 * Provides human-friendly explanations for how Tag categorized a transaction.
 * Used by Prime/Crystal/Byte to explain Tag's decisions to users.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type TagExplanationResult = {
  category: string | null;
  categorySource: 'manual' | 'learned' | 'ai' | 'rule' | 'unknown';
  confidence: number | null;
  learnedCount: number;        // how many feedback rows we used
  lastLearnedAt?: string | null;
  message: string;             // human-friendly explanation string
};

/**
 * Explain how Tag categorized a specific transaction
 * 
 * Looks up the transaction and any related feedback to build a friendly explanation.
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param transactionId - Transaction ID to explain
 * @returns Explanation result with category, source, confidence, and message
 */
export async function explainTransactionCategory(
  supabase: SupabaseClient,
  userId: string,
  transactionId: string
): Promise<TagExplanationResult> {
  try {
    // Step 1: Look up the transaction
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .select('id, category, category_source, confidence, merchant, description, user_id')
      .eq('id', transactionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (txError) {
      console.error('[Tag Explain] Transaction lookup error:', txError);
      return {
        category: null,
        categorySource: 'unknown',
        confidence: null,
        learnedCount: 0,
        message: "I couldn't find this transaction. It might not exist or belong to another user."
      };
    }

    if (!transaction) {
      return {
        category: null,
        categorySource: 'unknown',
        confidence: null,
        learnedCount: 0,
        message: "I couldn't find this transaction. It might not exist or belong to another user."
      };
    }

    const category = transaction.category;
    const categorySourceFromDb = transaction.category_source;
    const confidence = transaction.confidence;
    const merchant = transaction.merchant;

    // Step 2: Look up feedback rows for this merchant (to see learning history)
    let learnedCount = 0;
    let lastLearnedAt: string | null = null;

    if (merchant && merchant.trim()) {
      try {
        const { data: feedback } = await supabase
          .from('tag_category_feedback')
          .select('new_category, created_at')
          .eq('user_id', userId)
          .ilike('merchant', `%${merchant.trim()}%`)
          .order('created_at', { ascending: false });

        if (feedback && feedback.length > 0) {
          learnedCount = feedback.length;
          lastLearnedAt = feedback[0]?.created_at || null;
        }
      } catch (error) {
        console.error('[Tag Explain] Feedback lookup error:', error);
        // Continue without feedback data
      }
    }

    // Step 3: Determine categorySource
    let categorySource: 'manual' | 'learned' | 'ai' | 'rule' | 'unknown' = 'unknown';

    if (categorySourceFromDb === 'learned') {
      categorySource = 'learned';
    } else if (categorySourceFromDb === 'ai') {
      categorySource = 'ai';
    } else if (learnedCount >= 2) {
      // If we have feedback but category_source wasn't set, assume it was learned
      categorySource = 'learned';
    } else if (categorySourceFromDb === 'rule' || categorySourceFromDb === 'rules') {
      categorySource = 'rule';
    } else if (categorySourceFromDb === 'manual' || categorySourceFromDb === 'user') {
      categorySource = 'manual';
    } else if (categorySourceFromDb) {
      // Unknown source type, default to 'unknown'
      categorySource = 'unknown';
    }

    // Step 4: Build friendly message
    let message = '';

    if (categorySource === 'learned' && learnedCount >= 2) {
      const merchantName = merchant ? ` (${merchant})` : '';
      message = `I used your past ${learnedCount} correction${learnedCount > 1 ? 's' : ''} for this merchant${merchantName} and now always classify it as ${category || 'this category'}.`;
    } else if (categorySource === 'learned' && learnedCount === 1) {
      const merchantName = merchant ? ` (${merchant})` : '';
      message = `I saw you corrected this merchant${merchantName} once before, so I used that category: ${category || 'this category'}.`;
    } else if (categorySource === 'ai') {
      message = `I used AI to guess this category based on the description and amount.`;
      if (merchant) {
        message += ` The merchant "${merchant}" helped me decide.`;
      }
    } else if (categorySource === 'rule') {
      message = `I used a simple rule to categorize this transaction.`;
      if (merchant) {
        message += ` The merchant "${merchant}" matched a known pattern.`;
      }
    } else if (categorySource === 'manual') {
      message = `You chose this category manually. I'm remembering it for future suggestions.`;
    } else {
      message = `I don't have much history for this transaction yet, so this category might be a guess.`;
      if (merchant) {
        message += ` If you correct it, I'll remember "${merchant}" for next time.`;
      }
    }

    // Step 5: Return explanation
    return {
      category,
      categorySource,
      confidence,
      learnedCount,
      lastLearnedAt,
      message
    };

  } catch (error) {
    console.error('[Tag Explain] Unexpected error:', error);
    return {
      category: null,
      categorySource: 'unknown',
      confidence: null,
      learnedCount: 0,
      message: "I encountered an error while trying to explain this transaction. Please try again."
    };
  }
}

/**
 * Get insights about how a user categorizes a specific merchant
 * 
 * Looks at all feedback for a merchant to show learning patterns.
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param merchant - Merchant name to analyze
 * @returns Merchant insight with top category and correction stats
 */
export type TagMerchantInsight = {
  merchant: string;
  topCategory: string | null;
  totalCorrections: number;
  lastCorrectedAt?: string | null;
};

export async function getMerchantCategoryInsight(
  supabase: SupabaseClient,
  userId: string,
  merchant: string
): Promise<TagMerchantInsight> {
  try {
    if (!merchant || !merchant.trim()) {
      return {
        merchant: merchant || '',
        topCategory: null,
        totalCorrections: 0,
        lastCorrectedAt: null
      };
    }

    // Query tag_category_feedback for this user + merchant
    const { data: feedback, error } = await supabase
      .from('tag_category_feedback')
      .select('new_category, created_at')
      .eq('user_id', userId)
      .ilike('merchant', `%${merchant.trim()}%`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Tag Insights] Query error:', error);
      return {
        merchant: merchant.trim(),
        topCategory: null,
        totalCorrections: 0,
        lastCorrectedAt: null
      };
    }

    if (!feedback || feedback.length === 0) {
      return {
        merchant: merchant.trim(),
        topCategory: null,
        totalCorrections: 0,
        lastCorrectedAt: null
      };
    }

    // Count occurrences of each category
    const categoryCounts: Record<string, number> = {};
    feedback.forEach((entry) => {
      const cat = entry.new_category;
      if (cat) {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
    });

    // Find most common category
    const entries = Object.entries(categoryCounts);
    let topCategory: string | null = null;

    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      topCategory = entries[0][0];
    }

    // Get latest correction date
    const lastCorrectedAt = feedback[0]?.created_at || null;

    return {
      merchant: merchant.trim(),
      topCategory,
      totalCorrections: feedback.length,
      lastCorrectedAt
    };

  } catch (error) {
    console.error('[Tag Insights] Unexpected error:', error);
    return {
      merchant: merchant || '',
      topCategory: null,
      totalCorrections: 0,
      lastCorrectedAt: null
    };
  }
}







