/**
 * tag-smart-review - Scans committed transactions for known categorization errors.
 * Returns a list of issues with suggested fixes, grouped by merchant.
 */

import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { randomUUID } from 'crypto';
import { detectReviewIssues, type ReviewTx } from '../../src/shared/tag-review-rules';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ok = (body: any) => ({ statusCode: 200, headers, body: JSON.stringify(body) });
const err = (msg: string, status = 400) => ({ statusCode: status, headers, body: JSON.stringify({ ok: false, error: msg }) });

// COLLAB-2a: detection rules live in src/shared/tag-review-rules.ts (shared with Prime's tag_status).
type Tx = ReviewTx;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return err('Unauthorized', 401);

  const userId = auth.userId;
  const sb = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}` } },
    }
  );

  try {
    const { data: txs, error: fetchErr } = await sb
      .from('transactions')
      .select('id, merchant_name, category, amount, posted_at')
      .eq('user_id', userId)
      .limit(2000);

    if (fetchErr) return err(fetchErr.message, 500);
    const allTxs = (txs || []) as Tx[];
    const issues = detectReviewIssues(allTxs, randomUUID);

    return ok({
      ok: true,
      totalScanned: allTxs.length,
      issues,
      issueCount: issues.length,
      totalAffected: issues.reduce((s, i) => s + i.count, 0),
    });
  } catch (e: any) {
    console.error('[tag-smart-review] Error:', e.message);
    return err(e.message, 500);
  }
};
