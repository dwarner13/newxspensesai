/**
 * tag-background-sweep — Post-import categorization sweep.
 * Checks Needs Review transactions against rules + merchant history.
 * Returns confident matches for bulk apply + unsure merchants for user input.
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { normalizeMerchant } from './_shared/merchantUtils.js';

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
  const body = JSON.parse(event.body || '{}');
  const { importId } = body;

  if (!importId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'importId required' }) };

  try {
    // 1. Fetch Needs Review transactions from this import
    const { data: txs } = await sb
      .from('transactions')
      .select('id, merchant_name, amount, category')
      .eq('user_id', userId)
      .eq('import_id', importId)
      .or('category.eq.Needs Review,category.eq.Other,category.eq.Uncategorized,category.is.null')
      .limit(500);

    if (!txs || txs.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, confident_count: 0, unsure_count: 0, confident_groups: [], unsure_merchants: [] }) };
    }

    // 2. Fetch user's category rules
    let rules: any[] = [];
    try {
      const { data } = await sb.from('category_rules').select('*').eq('user_id', userId);
      rules = data ?? [];
    } catch { /* table may not exist */ }

    // 3. Build merchant confidence from history
    const { data: history } = await sb
      .from('transactions')
      .select('merchant_name, category')
      .eq('user_id', userId)
      .not('category', 'eq', 'Needs Review')
      .not('category', 'eq', 'Other')
      .not('category', 'eq', 'Uncategorized')
      .not('category', 'is', null)
      .limit(1000);

    const merchantCats: Record<string, Record<string, number>> = {};
    for (const tx of history ?? []) {
      const key = normalizeMerchant(tx.merchant_name);
      if (!key) continue;
      if (!merchantCats[key]) merchantCats[key] = {};
      merchantCats[key][tx.category] = (merchantCats[key][tx.category] || 0) + 1;
    }

    // 4. Classify each transaction
    const confident: Array<{ id: string; merchant_name: string; category: string }> = [];
    const unsureMap: Record<string, { merchant_name: string; count: number }> = {};

    for (const tx of txs) {
      const normalized = normalizeMerchant(tx.merchant_name);

      // Check rules first
      const rule = rules.find(r => {
        const p = normalizeMerchant(r.match_value || r.merchant_pattern || '');
        return (r.match_type === 'exact') ? normalized === p : normalized.includes(p);
      });
      if (rule) {
        confident.push({ id: tx.id, merchant_name: tx.merchant_name, category: rule.category });
        continue;
      }

      // Check merchant history confidence
      const cats = merchantCats[normalized];
      if (cats) {
        const total = Object.values(cats).reduce((s, n) => s + n, 0);
        const topCat = Object.entries(cats).sort((a, b) => b[1] - a[1])[0];
        const confidence = topCat[1] / total;
        if (confidence >= 0.8 && total >= 3) {
          confident.push({ id: tx.id, merchant_name: tx.merchant_name, category: topCat[0] });
          continue;
        }
      }

      // Unsure
      if (!unsureMap[normalized]) unsureMap[normalized] = { merchant_name: tx.merchant_name, count: 0 };
      unsureMap[normalized].count++;
    }

    // 5. Group confident by merchant+category
    const groupMap: Record<string, { merchant_name: string; category: string; ids: string[]; count: number }> = {};
    for (const tx of confident) {
      const key = `${normalizeMerchant(tx.merchant_name)}|${tx.category}`;
      if (!groupMap[key]) groupMap[key] = { merchant_name: tx.merchant_name, category: tx.category, ids: [], count: 0 };
      groupMap[key].ids.push(tx.id);
      groupMap[key].count++;
    }

    const confidentGroups = Object.values(groupMap);
    const unsureMerchants = Object.values(unsureMap);

    // 6. Persist to user_notifications so T bubble can pick it up from any page
    if (confident.length > 0 || Object.keys(unsureMap).length > 0) {
      try {
        await sb.from('user_notifications').insert({
          user_id: userId,
          employee_slug: 'tag-ai',
          type: 'sweep_result',
          title: 'Import scan complete',
          message: confident.length > 0
            ? `I can categorize ${confident.length} transactions automatically.${Object.keys(unsureMap).length > 0 ? ` ${Object.keys(unsureMap).length} merchants need your input.` : ''}`
            : `${Object.keys(unsureMap).length} merchants need your input.`,
          priority: 'normal',
          payload: { confident_groups: confidentGroups, confident_count: confident.length, unsure_merchants: unsureMerchants, unsure_count: Object.keys(unsureMap).length, import_id: importId },
          sent_at: new Date().toISOString(),
        });
      } catch { /* table may not exist or RLS issue — non-blocking */ }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        confident_count: confident.length,
        unsure_count: Object.keys(unsureMap).length,
        confident_groups: confidentGroups,
        unsure_merchants: unsureMerchants,
      }),
    };
  } catch (err: any) {
    console.error('[tag-background-sweep] Error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: err.message, confident_count: 0, unsure_count: 0, confident_groups: [], unsure_merchants: [] }) };
  }
};
