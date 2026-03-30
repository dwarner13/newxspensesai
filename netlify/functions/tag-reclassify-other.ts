/**
 * tag-reclassify-other — Backfill "Other" transactions using merchant map + rules.
 *
 * SQL migration (run manually in Supabase):
 * UPDATE transactions
 * SET category = 'Needs Review', category_source = 'needs_review'
 * WHERE user_id = '938a2e17-0e49-45ff-bb98-810db46e5e65'
 *   AND category = 'Other';
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { normalizeMerchant } from './_shared/merchantUtils.js';
import { matchMerchantMap } from './_shared/merchantCategoryMap.js';

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
    .select('id, merchant_name, amount')
    .eq('user_id', auth.userId)
    .or('category.eq.Other,category.eq.Needs Review,category.eq.Uncategorized,category.is.null')
    .limit(1000);

  // Classify all transactions
  const confidentMatches: Array<{ id: string; merchant_name: string; newCategory: string; subcategory?: string }> = [];
  let needsReviewCount = 0;

  for (const tx of otherTxs ?? []) {
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
      }),
    };
  }

  // Execute updates
  let reclassified = 0;
  for (const tx of confidentMatches) {
    await sb.from('transactions').update({
      category: tx.newCategory,
      subcategory: tx.subcategory ?? null,
      category_source: 'tag_rule',
      updated_at: new Date().toISOString(),
    }).eq('id', tx.id).eq('user_id', auth.userId);
    reclassified++;
  }

  // Mark remaining as Needs Review
  let needsReviewUpdated = 0;
  for (const tx of otherTxs ?? []) {
    if (confidentMatches.some(m => m.id === tx.id)) continue;
    await sb.from('transactions').update({
      category: 'Needs Review',
      category_source: 'needs_review',
      updated_at: new Date().toISOString(),
    }).eq('id', tx.id).eq('user_id', auth.userId);
    needsReviewUpdated++;
  }

  return {
    statusCode: 200, headers,
    body: JSON.stringify({ ok: true, reclassified, needs_review: needsReviewUpdated, total: (otherTxs ?? []).length }),
  };
};
