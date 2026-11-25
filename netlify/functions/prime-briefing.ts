/**
 * prime-briefing - Generates Prime's daily briefing after an import sweep completes.
 * Reads Tag's sweep results + overall financial snapshot, calls Claude Haiku,
 * saves to user_notifications for Inbox + Prime chat.
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';
import { fetchTransactionsInRange, type RangeFetchClient } from '../../src/shared/transaction-range-fetch';
import { buildPeriodAggregate } from '../../src/shared/period-aggregate';

// FST-1 / P-G3: totals come from the ONE shared engine (complete paged read +
// buildPeriodAggregate / classifyCashFlow). The previous local classifier (merchant regex,
// Math.abs, an unordered 1,500-row cap) is removed: it counted transfers and card payments as
// expenses, treated any "PAYMENT" merchant as income, and summed an arbitrary subset.
const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const userId = auth.userId;
  const sb = serverSupabase();
  const { importId } = JSON.parse(event.body || '{}');
  if (!importId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'importId required' }) };

  try {
    // 1. Import details
    const { data: imp } = await sb.from('imports').select('file_url, created_at')
      .eq('id', importId).eq('user_id', userId).maybeSingle();
    const filename = String(imp?.file_url || '').split('/').pop() || 'Statement';
    const month = imp?.created_at
      ? new Date(imp.created_at).toLocaleString('en-CA', { month: 'long', year: 'numeric' })
      : 'Recent';

    // 2. Tag's sweep notification for this import
    let tagPayload: any = null;
    try {
      const { data: tagNotif } = await sb.from('user_notifications').select('payload')
        .eq('user_id', userId).eq('employee_slug', 'tag-ai').eq('type', 'import_complete')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      tagPayload = tagNotif?.payload;
    } catch { /* silent */ }

    // 3. Customer profile (never a hard-coded name) + overall books from the shared engine
    let firstName: string | null = null;
    let currency = 'CAD';
    try {
      const { data: profile } = await sb.from('profiles').select('first_name, full_name').eq('id', userId).maybeSingle();
      firstName = (profile?.first_name || String(profile?.full_name || '').split(' ')[0] || '').trim() || null;
    } catch { /* name is optional */ }
    try {
      // Separate read: a missing currency column must never cost the customer's name.
      const { data: cur } = await sb.from('profiles').select('currency').eq('id', userId).maybeSingle();
      if (typeof cur?.currency === 'string' && /^[A-Z]{3}$/.test(cur.currency)) currency = cur.currency;
    } catch { /* default CAD */ }

    const fetched = await fetchTransactionsInRange(sb as unknown as RangeFetchClient,
      { userId, startDate: '1900-01-01', endDate: '9999-12-31' });
    const agg = buildPeriodAggregate(fetched.rows, {
      fetch: { complete: fetched.complete, truncated: fetched.truncated, rowsFetched: fetched.rowsFetched },
      period: null,
    });
    const complete = !fetched.error && agg.completeness.complete;
    const totalIncome = agg.cents.income / 100;
    const totalExpenses = agg.cents.spending / 100;
    const netFlow = agg.cents.netExcludingInternalMovements / 100;
    const totalTxs = fetched.rowsFetched;
    const uncategorized = fetched.rows.filter(t => !t.category || t.category === 'Needs Review' || t.category === 'Uncategorized' || t.category === 'Other').length;
    const categorizedPct = totalTxs > 0 ? Math.round(((totalTxs - uncategorized) / totalTxs) * 100) : 0;
    const topSpend = agg.categories.find(cat => cat.purpose === 'spending') ?? null;
    const dated = fetched.rows.map(t => t.date).filter((x): x is string => typeof x === 'string').map(x => x.slice(0, 10)).sort();
    const scopeLine = totalTxs > 0
      ? `${dated[0]} to ${dated[dated.length - 1]}; all imported accounts; ${currency}; ${totalTxs} transactions; ${complete ? 'complete' : 'PARTIAL (not every transaction could be read)'}`
      : 'no transactions';

    // 4. Generate briefing via Claude Haiku
    const systemPrompt = `You are Prime - XspensesAI's lead financial organizer. You speak directly, confidently, and like a smart CFO giving a morning briefing. You are aware of what your AI teammates Byte and Tag have done. Keep it concise - max 150 words. No bullet points in the intro paragraph. Use emojis sparingly for section headers only. End with ONE specific action item. XspensesAI is a pre-accountant organizer: never give tax advice or say whether anything is tax deductible. If the books are marked PARTIAL, say the figures are partial and never call them totals.`;

    const booksBlock = complete
      ? `OVERALL BOOKS (scope: ${scopeLine}):
- Income: ${money(agg.cents.income)} (${agg.counts.income} transactions)
- Spending (excludes transfers, debt payments, savings/investments): ${money(agg.cents.spending)} (${agg.counts.spending} transactions)
- Net (income minus spending and debt payments): ${netFlow >= 0 ? '+' : '-'}${money(Math.abs(agg.cents.netExcludingInternalMovements))}
- Uncategorized: ${uncategorized} of ${totalTxs} (${100 - categorizedPct}%)
- Biggest spending category: ${topSpend ? `${topSpend.category} at ${money(topSpend.totalCents)}` : 'unknown'}${agg.completeness.excluded.unclassifiedType > 0 ? `
- ${agg.completeness.excluded.unclassifiedType} transactions have an unrecognised type and are in no total` : ''}`
      : `OVERALL BOOKS: PARTIAL (scope: ${scopeLine}). Do not quote income, spending or net totals; say the full books could not be read and suggest opening Prime to retry.`;

    const userPrompt = `Generate a briefing for ${firstName ? firstName : 'the customer (no name on file — do not invent one)'} based on this data:

WHAT JUST HAPPENED:
- Byte processed: ${filename} (${month})
- Total transactions imported: ${tagPayload?.total_count ?? 'unknown'}
- Tag auto-categorized: ${tagPayload?.auto_count ?? 0} transactions
- Still needs input: ${tagPayload?.needs_input_count ?? 0} transactions
- Top spending this import: ${tagPayload?.top_categories?.[0]?.category ?? 'unknown'} ($${tagPayload?.top_categories?.[0]?.total?.toFixed(2) ?? '0'})

${booksBlock}

Write Prime's briefing. Be specific with the numbers given; never invent figures. Flag anything concerning. End with one clear action.`;

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    const claudeData = await claudeRes.json();
    const briefing = claudeData.content?.[0]?.text || 'Import processed successfully.';

    // 5. Save to user_notifications
    await sb.from('user_notifications').insert({
      user_id: userId,
      employee_slug: 'prime',
      type: 'daily_briefing',
      title: `${month} \u2014 Import Complete`,
      message: briefing,
      priority: 'high',
      payload: {
        import_id: importId, month,
        // FST-1: amounts only when the read was complete; scope always recorded.
        total_income: complete ? totalIncome : null, total_expenses: complete ? totalExpenses : null,
        net_flow: complete ? netFlow : null, data_complete: complete, scope: scopeLine, currency,
        uncategorized, categorized_pct: categorizedPct,
        top_expense_category: topSpend?.category ?? null,
      },
      sent_at: new Date().toISOString(),
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, briefing }) };
  } catch (err: any) {
    console.error('[prime-briefing] Error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
