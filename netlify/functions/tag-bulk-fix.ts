/**
 * tag-bulk-fix - Fixes known categorization errors in bulk for a user.
 * Applies merchant-specific category overrides based on common misclassifications.
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

interface BulkFix {
  label: string;
  match: { column: string; op: 'ilike' | 'eq'; value: string };
  extraFilter?: { column: string; op: 'eq'; value: string };
  set: Record<string, string>;
}

const FIXES: BulkFix[] = [
  {
    label: 'GORDON FOOD -> Income',
    match: { column: 'merchant_name', op: 'ilike', value: '%GORDON FOOD%' },
    set: { category: 'Income', subcategory: 'Employment Income', category_source: 'bulk_fix' },
  },
  {
    label: '7-ELEVEN STORE Transfers -> Food & Dining',
    match: { column: 'merchant_name', op: 'eq', value: '7-ELEVEN STORE' },
    extraFilter: { column: 'category', op: 'eq', value: 'Transfers' },
    set: { category: 'Food & Dining', category_source: 'bulk_fix' },
  },
  {
    label: 'TD LOAN -> Debt Payments',
    match: { column: 'merchant_name', op: 'ilike', value: '%TD LOAN%' },
    set: { category: 'Debt Payments', category_source: 'bulk_fix' },
  },
  {
    label: 'EASY FINANCIAL -> Debt Payments',
    match: { column: 'merchant_name', op: 'ilike', value: '%EASY FINANCIAL%' },
    set: { category: 'Debt Payments', category_source: 'bulk_fix' },
  },
  {
    label: 'SHADIFIED / SALON -> Personal Care',
    match: { column: 'merchant_name', op: 'ilike', value: '%SHADIFIED%' },
    set: { category: 'Personal Care', category_source: 'bulk_fix' },
  },
  {
    label: 'MASSAGE -> Personal Care',
    match: { column: 'merchant_name', op: 'ilike', value: '%MASSAGE%' },
    set: { category: 'Personal Care', subcategory: 'Massage & Wellness', category_source: 'bulk_fix' },
  },
  {
    label: 'INTERAC Transfers -> Transfers',
    match: { column: 'merchant_name', op: 'ilike', value: '%INTERAC%' },
    set: { category: 'Transfers', category_source: 'bulk_fix' },
  },
  {
    label: 'NATIONAL MONEY -> Debt Payments',
    match: { column: 'merchant_name', op: 'ilike', value: '%NATIONAL MONEY%' },
    set: { category: 'Debt Payments', category_source: 'bulk_fix' },
  },
  {
    label: 'FLEXITI -> Debt Payments',
    match: { column: 'merchant_name', op: 'ilike', value: '%FLEXITI%' },
    set: { category: 'Debt Payments', category_source: 'bulk_fix' },
  },
  {
    label: 'CAPITAL ONE -> Debt Payments',
    match: { column: 'merchant_name', op: 'ilike', value: '%CAPITAL ONE%' },
    set: { category: 'Debt Payments', category_source: 'bulk_fix' },
  },
];

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const userId = auth.userId;
  const sb = serverSupabase();
  const results: { label: string; affected: number }[] = [];
  let totalFixed = 0;

  try {
    for (const fix of FIXES) {
      try {
        const updatePayload = { ...fix.set, updated_at: new Date().toISOString() };
        let q = sb.from('transactions').update(updatePayload).eq('user_id', userId);

        if (fix.match.op === 'ilike') {
          q = q.ilike(fix.match.column, fix.match.value);
        } else {
          q = q.eq(fix.match.column, fix.match.value);
        }

        if (fix.extraFilter) {
          q = q.eq(fix.extraFilter.column, fix.extraFilter.value);
        }

        const { count } = await q.select('id', { count: 'exact', head: true });
        const affected = count || 0;
        results.push({ label: fix.label, affected });
        totalFixed += affected;
      } catch (err: any) {
        results.push({ label: fix.label, affected: -1 });
        console.warn(`[tag-bulk-fix] Fix "${fix.label}" failed:`, err?.message);
      }
    }

    console.log(`[tag-bulk-fix] Completed for user ${userId}: ${totalFixed} transactions fixed across ${FIXES.length} rules`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, total_fixed: totalFixed, fixes: results }),
    };
  } catch (err: any) {
    console.error('[tag-bulk-fix] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
