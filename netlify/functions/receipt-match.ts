/**
 * receipt-match - Scan pending receipts and attempt to match against transactions.
 */
import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { findReceiptMatchCandidates, linkReceiptToTransaction } from './_shared/receiptMatching.js';

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
        // C2-A2: value-bound, user-scoped matching (no `.or()` string built from OCR output).
        const txMatches = await findReceiptMatchCandidates(
          sb,
          userId,
          { merchantName: r.merchant_name, amount: r.amount, receiptDate: r.receipt_date },
          3,
        );
        const best = txMatches[0];
        if (best) {
          const receiptAmount = Number(r.amount);
          const conf = Math.abs(Number(best.amount) - receiptAmount) < 0.01 ? 0.95 : 0.8;
          if (await linkReceiptToTransaction(sb, userId, r.id, best.id, conf)) {
            matches.push({ receipt_id: r.id, transaction_id: best.id, merchant_name: r.merchant_name });
          }
        }
      } catch { /* skip individual failures */ }
    }

    const stillPending = pending.length - matches.length;
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, matched: matches.length, still_pending: stillPending, matches }) };
  } catch (err: unknown) {
    console.error('[receipt-match] Failed', { name: err instanceof Error ? err.name : 'Error' });
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Receipt matching failed. Please try again.' }) };
  }
};
