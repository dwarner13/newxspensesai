/**
 * tx-split — Split a single transaction into multiple with different categories.
 * Does NOT delete the original — updates it with the first split's data,
 * then inserts new rows for the remaining splits.
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

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

  const body = JSON.parse(event.body || '{}');
  const { originalId, splits } = body;

  if (!originalId || !Array.isArray(splits) || splits.length < 2) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Need originalId and at least 2 splits' }) };
  }

  const sb = serverSupabase();

  // Fetch original transaction
  const { data: original, error: fetchErr } = await sb
    .from('transactions')
    .select('*')
    .eq('id', originalId)
    .eq('user_id', auth.userId)
    .single();

  if (fetchErr || !original) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Transaction not found' }) };
  }

  // Verify splits sum to original amount (±$0.01 tolerance)
  const originalAmt = Math.abs(Number(original.amount || 0));
  const splitsTotal = splits.reduce((s: number, sp: any) => s + Math.abs(Number(sp.amount || 0)), 0);
  if (Math.abs(originalAmt - splitsTotal) > 0.02) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: `Splits sum to $${splitsTotal.toFixed(2)} but original is $${originalAmt.toFixed(2)}` }) };
  }

  const now = new Date().toISOString();
  const isNegative = Number(original.amount) < 0;

  // Update original with first split
  const first = splits[0];
  await sb.from('transactions').update({
    amount: isNegative ? -Math.abs(Number(first.amount)) : Math.abs(Number(first.amount)),
    category: first.category,
    subcategory: first.subcategory || null,
    category_source: 'user_split',
    updated_at: now,
  }).eq('id', originalId).eq('user_id', auth.userId);

  // Insert remaining splits as new transactions
  let created = 0;
  for (let i = 1; i < splits.length; i++) {
    const sp = splits[i];
    const { error: insertErr } = await sb.from('transactions').insert({
      user_id: auth.userId,
      merchant_name: original.merchant_name,
      merchant: original.merchant,
      description: original.description,
      amount: isNegative ? -Math.abs(Number(sp.amount)) : Math.abs(Number(sp.amount)),
      category: sp.category,
      subcategory: sp.subcategory || null,
      category_source: 'user_split',
      posted_at: original.posted_at,
      date: original.date,
      type: original.type,
      import_id: original.import_id,
      document_id: original.document_id,
      created_at: now,
      updated_at: now,
    });
    if (!insertErr) created++;
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, created, total_splits: splits.length }),
  };
};
