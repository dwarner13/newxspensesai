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


// ─────────────────────────────────────────────────────────────────────────────
// Reliability round 2 (owner GO 2026-11-25): the ONE learning-from-correction implementation.
// Used directly by tag-learn and tx-update-category (no HTTP hop, no legacy fallback). It reports
// exactly what was persisted: Tag "learned" a merchant only when the vendor memory was saved.
// Callers must have verified that the transaction belongs to userId. No merchant text is logged.
// ─────────────────────────────────────────────────────────────────────────────

export type LearnOutcome = {
  feedbackSaved: boolean;
  feedbackId: string | null;
  /** 'saved' = the merchant memory was persisted; 'failed' = it was not; 'skipped' = no merchant. */
  memory: 'saved' | 'failed' | 'skipped';
};

export function normalizeVendorKey(input: string): string {
  return String(input || '').toLowerCase().trim().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function vendorFromDataJson(dataJson: Record<string, unknown> | null | undefined): string {
  const d = dataJson || {};
  return String(d.description || d.merchant || d.vendor || d.payee || d.memo || d.name || d.details || '').trim();
}

/** Staging rows still awaiting review (tag_status 'needs_review') for this vendor. Non-blocking. */
async function applyMemoryToNeedsReviewStaging(supabase: SupabaseClient, userId: string, vendorKey: string, category: string): Promise<void> {
  const pageSize = 500;
  let offset = 0;
  for (let page = 0; page < 10; page++) {
    const { data, error } = await supabase.from('transactions_staging').select('id, data_json, tag_status')
      .eq('user_id', userId).eq('tag_status', 'needs_review').range(offset, offset + pageSize - 1);
    if (error) throw error;
    const rows = (data || []) as Array<{ id: string; data_json?: Record<string, unknown> | null }>;
    if (rows.length === 0) break;
    for (const row of rows) {
      if (normalizeVendorKey(vendorFromDataJson(row?.data_json)) !== vendorKey) continue;
      await supabase.from('transactions_staging').update({
        tag_category: category, tag_rule_source: 'vendor_memory', tag_confidence: 0.95, tag_status: 'auto',
        tag_reason: 'Learned from confirmed correction', tag_version: 'v1', tag_updated_at: new Date().toISOString(),
      }).eq('id', row.id).eq('user_id', userId).eq('tag_status', 'needs_review');
    }
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
}

export async function learnFromCorrection(
  supabase: SupabaseClient,
  input: { userId: string; transactionId: string; merchant?: string | null; description?: string | null; oldCategory: string; newCategory: string },
): Promise<LearnOutcome> {
  const { userId, transactionId, merchant, description, oldCategory, newCategory } = input;
  const { data, error } = await supabase.from('tag_category_feedback').insert({
    user_id: userId, transaction_id: transactionId, merchant: merchant || null, description: description || null,
    old_category: oldCategory, new_category: newCategory,
  }).select().single();
  if (error) return { feedbackSaved: false, feedbackId: null, memory: 'skipped' };
  const feedbackId = (data as { id?: string } | null)?.id ?? null;

  const vendorKey = merchant ? normalizeVendorKey(String(merchant)) : '';
  if (!vendorKey) return { feedbackSaved: true, feedbackId, memory: 'skipped' };
  try {
    // Live vendor_category_memory columns only (AR-SCHEMA 2026-11-26: there is no metadata column, so
    // the earlier metadata write always failed and fell back; the full staging read that fed it is gone).
    const { error: memoryError } = await supabase.from('vendor_category_memory').upsert({
      user_id: userId, vendor_key: vendorKey, category: newCategory, subcategory: null, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,vendor_key' });
    if (memoryError) return { feedbackSaved: true, feedbackId, memory: 'failed' };
    applyMemoryToNeedsReviewStaging(supabase, userId, vendorKey, newCategory).catch(() => {
      console.warn('[tag-learning] retroactive staging apply failed (non-blocking)');
    });
    return { feedbackSaved: true, feedbackId, memory: 'saved' };
  } catch {
    return { feedbackSaved: true, feedbackId, memory: 'failed' };
  }
}
