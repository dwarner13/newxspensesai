/**
 * Tag Learning Helper
 * 
 * Queries tag_category_feedback to find learned category mappings
 * from user corrections. Used by Tag's categorization engine to
 * prioritize learned patterns over AI guesses.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type LearnedCategoryResult = {
  category: string;
  count: number;
} | null;

/**
 * Get learned category for a transaction based on user feedback history
 * 
 * This function looks in the tag_category_feedback table to see if the user
 * has corrected transactions from this merchant before. If they have, it
 * returns the category they used most often.
 * 
 * Simple version: Only matches by merchant name (case-insensitive).
 * 
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param merchant - Merchant name (optional)
 * @param description - Transaction description (optional, not used yet)
 * @returns { category: string, count: number } if found, null if no matches
 */
export async function getLearnedCategoryForTransaction(
  supabase: SupabaseClient,
  userId: string,
  merchant?: string | null,
  description?: string
): Promise<LearnedCategoryResult> {
  try {
    // Step 1: Check if we have a merchant to match
    if (!merchant || !merchant.trim()) {
      // No merchant = can't match, return null
      return null;
    }

    // Step 2: Query tag_category_feedback for this user + merchant
    // Use ILIKE for case-insensitive matching (simple version)
    const merchantSearch = merchant.trim();
    const { data: feedback, error } = await supabase
      .from('tag_category_feedback')
      .select('new_category')
      .eq('user_id', userId)
      .ilike('merchant', `%${merchantSearch}%`);

    if (error) {
      console.error('[Tag Learning] Query error:', error);
      return null; // Fail silently, fall back to AI
    }

    if (!feedback || feedback.length === 0) {
      return null; // No feedback for this merchant yet
    }

    // Step 3: Count how many times each category appears
    const categoryCounts: Record<string, number> = {};
    feedback.forEach((entry) => {
      const category = entry.new_category;
      if (category) {
        categoryCounts[category] = (categoryCounts[category] || 0) + 1;
      }
    });

    // Step 4: Find the category that appears most often
    const entries = Object.entries(categoryCounts);
    
    if (entries.length === 0) {
      return null;
    }

    // Sort by count (biggest first)
    entries.sort((a, b) => b[1] - a[1]);
    const [mostCommonCategory, mostCommonCount] = entries[0];

    // Step 5: Return the most common category and its count
    return {
      category: mostCommonCategory,
      count: mostCommonCount
    };

  } catch (error) {
    console.error('[Tag Learning] Error getting learned category:', error);
    // Fail silently - always fall back to AI on error
    return null;
  }
}

