/**
 * tag-background-sweep - Post-import categorization sweep.
 * Checks Needs Review transactions against rules + merchant history.
 * Returns confident matches for bulk apply + unsure merchants for user input.
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { computeImportSuggestions } from './_shared/tagImportSuggestions.js';

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
    // 1-5. Owner GO 2026-11-25: one suggestion engine (shared with the signed "apply suggestions"
    // proposal). Suggestions come only from the customer's own rules / history; protected rows are
    // never suggested; reads are complete. NOTHING is applied here — applying is a confirmed proposal.
    const sug = await computeImportSuggestions(sb as unknown as Parameters<typeof computeImportSuggestions>[0], userId, importId);
    if (!sug.complete || (sug.groups.length === 0 && sug.unsure.length === 0)) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true, confident_count: 0, unsure_count: 0, confident_groups: [], unsure_merchants: [], complete: sug.complete }) };
    }
    const confidentGroups = sug.groups.map(g => ({ merchant_name: g.merchant_name, category: g.category, subcategory: g.subcategory, ids: g.ids, count: g.count }));
    const confident = confidentGroups.flatMap(g => g.ids);
    const unsureMerchants = sug.unsure;
    const unsureMap = Object.fromEntries(sug.unsure.map(u => [u.merchant_name, u]));

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
        // Nothing has been applied yet: these are suggestions awaiting the customer's confirmation.
        `   \u2728 ${autoCount} ready to categorize from your own rules and history (confirm to apply)`,
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
