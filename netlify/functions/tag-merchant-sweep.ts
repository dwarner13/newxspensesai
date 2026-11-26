/**
 * tag-merchant-sweep - Surfaces transactions with unknown merchants.
 * Marks them as Needs Review with subcategory 'Unknown Merchant - Verify'
 * and returns details for display in Tag's chat interface.
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { partitionAutoWritable, AUTO_UPDATE_CATEGORY_FILTER, AUTO_UPDATE_SOURCE_FILTER } from './_shared/categorySource.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const userId = auth.userId;
  const sb = serverSupabase();

  try {
    // 1. Find transactions with null/empty merchant that aren't already flagged
    //    and aren't Transfers/Income (those legitimately lack merchant names)
    const { data: txs, error } = await sb
      .from('transactions')
      .select('id, merchant_name, merchant, description, amount, date, posted_at, category, category_source, import_id')
      .eq('user_id', userId)
      .not('category', 'in', '("Transfers","Income")')
      .or('merchant_name.is.null,merchant_name.eq.')
      .not('subcategory', 'eq', 'Unknown Merchant - Verify')
      .order('posted_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[tag-merchant-sweep] Query error:', error.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }

    // Owner GO 2026-11-25 / C4 Batch 1: a missing merchant name never overwrites a category the
    // customer set (or one with possibly-approved / unknown provenance). Only gap rows are flagged.
    const { writable, skippedProtected } = partitionAutoWritable(txs ?? []);
    if (writable.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, queued: 0, transactions: [], skippedProtected }) };
    }

    // 2. Mark each as Needs Review with subcategory flag
    const queued: Array<{ id: string; amount: number; date: string; description: string; category: string | null }> = [];

    for (const tx of writable) {
      const { data: done, error: updateErr } = await sb
        .from('transactions')
        .update({
          category: 'Needs Review',
          subcategory: 'Unknown Merchant - Verify',
          category_source: 'merchant_sweep',
          updated_at: new Date().toISOString(),
        })
        .eq('id', tx.id)
        .eq('user_id', userId)
        .or(AUTO_UPDATE_CATEGORY_FILTER)
        .or(AUTO_UPDATE_SOURCE_FILTER)
        .select('id');

      if (!updateErr && Array.isArray(done) && done.length === 1) {
        queued.push({
          id: tx.id,
          amount: Number(tx.amount || 0),
          date: tx.date || tx.posted_at?.split('T')[0] || 'unknown',
          description: tx.description || '(no description)',
          category: tx.category,
        });
      }
    }

    // 3. Get total count of remaining unknown-merchant transactions
    const { count: remaining } = await sb
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .not('category', 'in', '("Transfers","Income")')
      .or('merchant_name.is.null,merchant_name.eq.')
      .not('subcategory', 'eq', 'Unknown Merchant - Verify');

    console.log(`[tag-merchant-sweep] Queued ${queued.length} unknown-merchant txs for user ${String(userId).slice(0, 8)}..., ${remaining || 0} remaining`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        queued: queued.length,
        remaining: remaining || 0,
        transactions: queued,
        skippedProtected,
      }),
    };
  } catch (err: any) {
    console.error('[tag-merchant-sweep] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
