/**
 * receipt-match - Scan pending receipts and attempt to match against transactions.
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

// NOTE: This function should be called after imports complete.
// Integration with post-import pipeline is manual for now.

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const userId = auth.userId;
  const sb = serverSupabase();

  try {
    const { data: pending } = await sb.from('receipts')
      .select('id, merchant_name, amount, receipt_date')
      .eq('user_id', userId)
      .eq('match_status', 'pending')
      .not('merchant_name', 'is', null)
      .not('amount', 'is', null)
      .limit(50);

    if (!pending || pending.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, matched: 0, still_pending: 0, matches: [] }) };
    }

    const matches: { receipt_id: string; transaction_id: string; merchant_name: string }[] = [];

    for (const r of pending) {
      try {
        const merchantSearch = (r.merchant_name || '').replace(/'/g, "''");
        const receiptAmount = Number(r.amount);
        let q = sb.from('transactions')
          .select('id, merchant_name, amount, date')
          .eq('user_id', userId)
          .or(`merchant_name.ilike.%${merchantSearch}%,description.ilike.%${merchantSearch}%`)
          .gte('amount', receiptAmount - 1.00)
          .lte('amount', receiptAmount + 1.00)
          .order('date', { ascending: false })
          .limit(3);
        if (r.receipt_date) {
          const d = new Date(r.receipt_date);
          const dayMinus5 = new Date(d.getTime() - 5 * 86400000).toISOString().split('T')[0];
          const dayPlus5 = new Date(d.getTime() + 5 * 86400000).toISOString().split('T')[0];
          q = q.gte('date', dayMinus5).lte('date', dayPlus5);
        }
        const { data: txMatches } = await q;
        const best = txMatches?.[0];
        if (best) {
          const conf = Math.abs(Number(best.amount) - receiptAmount) < 0.01 ? 0.95 : 0.8;
          await sb.from('receipts').update({ transaction_id: best.id, match_status: 'matched', match_confidence: conf }).eq('id', r.id);
          await sb.from('transactions').update({ receipt_id: r.id, has_receipt: true }).eq('id', best.id);
          matches.push({ receipt_id: r.id, transaction_id: best.id, merchant_name: r.merchant_name });
        }
      } catch { /* skip individual failures */ }
    }

    const stillPending = pending.length - matches.length;
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, matched: matches.length, still_pending: stillPending, matches }) };
  } catch (err: any) {
    console.error('[receipt-match] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
