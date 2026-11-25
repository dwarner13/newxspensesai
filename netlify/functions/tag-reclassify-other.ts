/**
 * tag-reclassify-other - Backfill "Other" transactions using merchant map + rules.
 *
 * SQL migration (run manually in Supabase, substitute $USER_ID):
 * UPDATE transactions
 * SET category = 'Needs Review', category_source = 'needs_review'
 * WHERE user_id = '$USER_ID'
 *   AND category = 'Other';
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { normalizeMerchant } from './_shared/merchantUtils.js';
import { matchMerchantMap } from './_shared/merchantCategoryMap.js';
import { partitionAutoWritable, AUTO_UPDATE_CATEGORY_FILTER, AUTO_UPDATE_SOURCE_FILTER } from './_shared/categorySource.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Merchant map imported from shared module

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const sb = serverSupabase();
  const preview = event.queryStringParameters?.preview === 'true';

  const { data: otherTxs } = await sb
    .from('transactions')
    .select('id, merchant_name, amount, category, category_source')
    .eq('user_id', auth.userId)
    .or('category.eq.Other,category.eq.Needs Review,category.eq.Uncategorized,category.is.null')
    .limit(1000);
  // Owner GO 2026-11-25 / C4 Batch 1: never touch a customer-confirmed, possibly-approved or
  // unknown-provenance classification — an approved "Other" included. They are reported, not changed.
  const { writable: candidateTxs, skippedProtected } = partitionAutoWritable(otherTxs ?? []);

  // Classify all transactions
  const confidentMatches: Array<{ id: string; merchant_name: string; newCategory: string; subcategory?: string }> = [];
  let needsReviewCount = 0;

  for (const tx of candidateTxs) {
    const match = matchMerchantMap(tx.merchant_name || '');
    if (match) {
      confidentMatches.push({ id: tx.id, merchant_name: tx.merchant_name, newCategory: match.category, subcategory: match.subcategory });
    } else {
      needsReviewCount++;
    }
  }

  // Group confident by merchant+category
  const confidentGrouped = Object.values(
    confidentMatches.reduce((acc: Record<string, { merchant_name: string; category: string; count: number; ids: string[] }>, tx) => {
      const key = `${tx.merchant_name}|${tx.newCategory}`;
      if (!acc[key]) acc[key] = { merchant_name: tx.merchant_name, category: tx.newCategory, count: 0, ids: [] };
      acc[key].count++;
      acc[key].ids.push(tx.id);
      return acc;
    }, {})
  ).sort((a, b) => b.count - a.count);

  if (preview) {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        ok: true, preview: true,
        confident_groups: confidentGrouped,
        confident_count: confidentMatches.length,
        needs_review_count: needsReviewCount,
        total_scanned: (otherTxs ?? []).length,
        skipped_protected: skippedProtected,
      }),
    };
  }

  // Execute updates. The protection is re-checked inside each update (a customer edit landing after
  // the select is never overwritten); counts are rows the database actually updated.
  // An automatic map match is labelled 'merchant_map' (an existing automatic value), never 'tag_rule'
  // (which implies the customer approved it).
  const guarded = async (payload: Record<string, unknown>, id: string): Promise<boolean> => {
    const { data, error } = await sb.from('transactions').update(payload)
      .eq('id', id).eq('user_id', auth.userId)
      .or(AUTO_UPDATE_CATEGORY_FILTER).or(AUTO_UPDATE_SOURCE_FILTER)
      .select('id');
    return !error && Array.isArray(data) && data.length === 1;
  };
  let reclassified = 0;
  for (const tx of confidentMatches) {
    if (await guarded({
      category: tx.newCategory,
      subcategory: tx.subcategory ?? null,
      category_source: 'merchant_map',
      updated_at: new Date().toISOString(),
    }, tx.id)) reclassified++;
  }

  // Mark remaining (unprotected) rows as Needs Review — unresolved, never a silent "Other".
  let needsReviewUpdated = 0;
  for (const tx of candidateTxs) {
    if (confidentMatches.some(m => m.id === tx.id)) continue;
    if (await guarded({ category: 'Needs Review', category_source: 'needs_review', updated_at: new Date().toISOString() }, tx.id)) needsReviewUpdated++;
  }

  return {
    statusCode: 200, headers,
    body: JSON.stringify({ ok: true, reclassified, needs_review: needsReviewUpdated, total: (otherTxs ?? []).length, skipped_protected: skippedProtected }),
  };
};
