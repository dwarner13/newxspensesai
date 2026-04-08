/**
 * tag-background-sweep - Post-import categorization sweep.
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

    // 6. Build statement completion report + persist to user_notifications
    try {
      const { data: importData } = await sb
        .from('imports').select('file_url, created_at').eq('id', importId).eq('user_id', userId).maybeSingle();

      const filename = String(importData?.file_url || '').split('/').pop() || 'Statement';
      const month = importData?.created_at
        ? new Date(importData.created_at).toLocaleString('en-CA', { month: 'long', year: 'numeric' })
        : 'Recent';

      // All transactions from this import for breakdown
      const { data: allImportTxs } = await sb
        .from('transactions').select('id, category, amount, merchant_name').eq('user_id', userId).eq('import_id', importId);

      const totalCount = allImportTxs?.length ?? 0;

      // Category breakdown
      const catMap: Record<string, { count: number; total: number }> = {};
      for (const tx of allImportTxs ?? []) {
        const cat = tx.category || 'Needs Review';
        if (!catMap[cat]) catMap[cat] = { count: 0, total: 0 };
        catMap[cat].count++;
        catMap[cat].total += Math.abs(Number(tx.amount || 0));
      }
      const topCategories = Object.entries(catMap)
        .filter(([cat]) => cat !== 'Needs Review' && cat !== 'Transfers')
        .sort((a, b) => b[1].total - a[1].total).slice(0, 4)
        .map(([category, d]) => ({ category, count: d.count, total: d.total }));

      // Top merchant
      const merchantMap: Record<string, number> = {};
      for (const tx of allImportTxs ?? []) { const m = tx.merchant_name || 'Unknown'; merchantMap[m] = (merchantMap[m] || 0) + 1; }
      const topMerchant = Object.entries(merchantMap).sort((a, b) => b[1] - a[1])[0] ?? null;

      const autoCount = confident.length;
      const needsInputCount = allImportTxs?.filter(t => !t.category || t.category === 'Needs Review' || t.category === 'Other' || t.category === 'Uncategorized').length ?? 0;

      const catLines = topCategories.map(c => `   ${c.category} - $${c.total.toFixed(2)} (${c.count} txns)`).join('\n');
      const reportMessage = [
        `I finished processing your ${month} statement (${filename}).`,
        '',
        `${totalCount} transactions reviewed:`,
        `   \u2705 ${autoCount} categorized automatically`,
        needsInputCount > 0 ? `   \u26A0\uFE0F  ${needsInputCount} need your input` : '   \u2705 All categorized',
        '',
        topCategories.length > 0 ? `Top spending:\n${catLines}` : '',
        topMerchant ? `\nTop merchant: ${topMerchant[0]} \u00d7${topMerchant[1]}` : '',
        needsInputCount > 0 ? `\nReady to handle the ${needsInputCount} flagged ones?` : '\nYour books are up to date \u2713',
      ].filter(Boolean).join('\n');

      await sb.from('user_notifications').insert({
        user_id: userId,
        employee_slug: 'tag-ai',
        type: 'import_complete',
        title: `${month} statement processed`,
        message: reportMessage,
        priority: 'high',
        payload: {
          import_id: importId, filename, month, total_count: totalCount,
          auto_count: autoCount, needs_input_count: needsInputCount,
          top_categories: topCategories,
          top_merchant: topMerchant ? { name: topMerchant[0], count: topMerchant[1] } : null,
          confident_groups: confidentGroups, unsure_count: Object.keys(unsureMap).length,
        },
        sent_at: new Date().toISOString(),
      });
    } catch { /* non-blocking */ }

    // Trigger Prime briefing (fire and forget)
    try {
      const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'http://localhost:8888';
      const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
      fetch(`${baseUrl}/.netlify/functions/prime-briefing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: authHeader },
        body: JSON.stringify({ importId }),
      }).catch(() => {});
    } catch { /* non-fatal */ }

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
