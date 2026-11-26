/**
 * Tag Learning Helper
 * 
 * Queries tag_category_feedback to find learned category mappings
 * from user corrections. Used by Tag's categorization engine to
 * prioritize learned patterns over AI guesses.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { merchantGroupingKey } from './merchantNormalize.js';
import { resolveCategoryRequest } from './tagCategories.js';
import { pagedSelectAll, type PagedQuery } from '../../../src/shared/paged-select';

/**
 * The customer's corrections for EXACTLY this merchant (AI Architecture HQ follow-up, 2026-11-26;
 * owner GO "Tag reliability" 2026-11-26). A complete, paged read narrowed by merchantGroupingKey, so a
 * correction for a similar-named merchant is never applied to, or claimed for, another one. ILIKE is
 * only a superset prefilter. Newest first. `complete: false` when the read failed or was truncated.
 */
export async function exactMerchantCorrections(
  supabase: SupabaseClient, userId: string, merchant: string,
): Promise<{ rows: Array<{ new_category: string | null; created_at: string | null }>; complete: boolean }> {
  const key = merchant.trim() ? merchantGroupingKey(merchant) : '';
  if (!key) return { rows: [], complete: true };
  const read = await pagedSelectAll<{ id: string; merchant: string | null; new_category: string | null; created_at: string | null }>(() =>
    supabase.from('tag_category_feedback')
      .select('id, merchant, new_category, created_at')
      .eq('user_id', userId)
      .ilike('merchant', `%${merchant.trim()}%`)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false }) as unknown as PagedQuery);
  if (read.error) return { rows: [], complete: false };
  return { rows: read.rows.filter(f => merchantGroupingKey(f.merchant || '') === key), complete: read.complete };
}
import { committedImportIds } from './importLifecycle.js';

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

    // Step 2: the customer's corrections for EXACTLY this merchant (owner GO 2026-11-26). The old
    // ILIKE '%merchant%' match let corrections for a similar-named merchant become a 0.95-0.99
    // "learned" category for this one at import time.
    const { rows: feedback, complete } = await exactMerchantCorrections(supabase, userId, merchant);
    if (!complete && feedback.length === 0) return null; // unreadable: fall back, never guess

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

/** Outcome of the retroactive staging apply (logged as counts only; never shown as "learned"). */
export type StagingApplyOutcome = { applied: number; complete: boolean; skipped?: 'unknown_category' };

const STAGING_PAGE = 500;
const STAGING_MAX_ROWS = 20_000;

/**
 * Staging rows still awaiting review (tag_status 'needs_review') for this vendor get the customer's
 * corrected category. Non-blocking; never part of the "learned" claim (that is the vendor memory).
 *
 * Owner GO "Tag reliability" 2026-11-26 — the two learning flaws, corrected:
 *  1. Skipped rows: it paged by OFFSET over tag_status='needs_review' while moving matched rows OUT of
 *     that filter, so every later page started past rows it had never read; it also stopped silently
 *     after 10 pages. Now: keyset paging by id (rows already updated are behind the cursor), and a
 *     stated ceiling that reports complete:false instead of stopping silently.
 *  2. Check-then-write window: import status (S-1) was read once per page and the rows were then
 *     updated one by one without error checks. Now: candidates are collected first, import status is
 *     re-read immediately before ONE guarded, verified update per page that itself carries the
 *     conditions (only these ids, still needs_review, only imports still open). A residual window of a
 *     single statement remains; closing it entirely needs a database-side guard (migration, not
 *     authorized). It cannot affect money: staging rows are history after commit.
 *  Also: a category that is not a recognised Tag category is never auto-applied (the rows stay in
 *  review), and rows a customer already decided (not needs_review) are never touched.
 */
export async function applyMemoryToNeedsReviewStaging(supabase: SupabaseClient, userId: string, vendorKey: string, category: string): Promise<StagingApplyOutcome> {
  const resolved = resolveCategoryRequest(category);
  if (resolved.status !== 'exact') return { applied: 0, complete: true, skipped: 'unknown_category' };
  const target = resolved.category;
  let applied = 0;
  let lastId: string | null = null;
  let read = 0;
  for (;;) {
    if (read >= STAGING_MAX_ROWS) return { applied, complete: false };
    let q = supabase.from('transactions_staging').select('id, import_id, data_json, tag_status')
      .eq('user_id', userId).eq('tag_status', 'needs_review');
    if (lastId) q = q.gt('id', lastId);
    const { data, error } = await q.order('id', { ascending: true }).limit(STAGING_PAGE);
    if (error) return { applied, complete: false };
    const rows = (data || []) as Array<{ id: string; import_id?: string | null; data_json?: Record<string, unknown> | null }>;
    if (rows.length === 0) return { applied, complete: true };
    read += rows.length;
    lastId = String(rows[rows.length - 1].id);

    const matches = rows.filter(r => normalizeVendorKey(vendorFromDataJson(r?.data_json)) === vendorKey);
    if (matches.length > 0) {
      // Re-read import status right before the write (S-1; fail closed: unknown → write nothing).
      const lifecycle = await committedImportIds(supabase as unknown as Parameters<typeof committedImportIds>[0], userId, matches.map(r => r.import_id));
      if (!lifecycle.ok) return { applied, complete: false };
      const open = matches.filter(r => !(r.import_id && lifecycle.committed.has(r.import_id)));
      const openImports = [...new Set(open.map(r => r.import_id).filter((v): v is string => typeof v === 'string' && v.length > 0))];
      const withImport = open.filter(r => r.import_id).map(r => String(r.id));
      const noImport = open.filter(r => !r.import_id).map(r => String(r.id));
      const payload = {
        tag_category: target, tag_subcategory: resolved.subcategory ?? null, tag_rule_source: 'vendor_memory', tag_confidence: 0.95, tag_status: 'auto',
        tag_reason: 'Learned from confirmed correction', tag_version: 'v1', tag_updated_at: new Date().toISOString(),
      };
      if (withImport.length > 0) {
        const { data: done, error: upErr } = await supabase.from('transactions_staging').update(payload)
          .in('id', withImport).eq('user_id', userId).eq('tag_status', 'needs_review').in('import_id', openImports).select('id');
        if (upErr) return { applied, complete: false };
        applied += Array.isArray(done) ? done.length : 0;
      }
      if (noImport.length > 0) {
        const { data: done, error: upErr } = await supabase.from('transactions_staging').update(payload)
          .in('id', noImport).eq('user_id', userId).eq('tag_status', 'needs_review').is('import_id', null).select('id');
        if (upErr) return { applied, complete: false };
        applied += Array.isArray(done) ? done.length : 0;
      }
    }
    if (rows.length < STAGING_PAGE) return { applied, complete: true };
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
    // Non-blocking; its outcome is logged as counts only and is never reported as "learned".
    applyMemoryToNeedsReviewStaging(supabase, userId, vendorKey, newCategory)
      .then(o => { if (!o.complete || o.skipped) console.warn('[tag-learning] retroactive staging apply incomplete', { applied: o.applied, skipped: o.skipped ?? null }); })
      .catch(() => { console.warn('[tag-learning] retroactive staging apply failed (non-blocking)'); });
    return { feedbackSaved: true, feedbackId, memory: 'saved' };
  } catch {
    return { feedbackSaved: true, feedbackId, memory: 'failed' };
  }
}
