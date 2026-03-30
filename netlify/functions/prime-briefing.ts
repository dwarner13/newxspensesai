/**
 * prime-briefing — Generates Prime's daily briefing after an import sweep completes.
 * Reads Tag's sweep results + overall financial snapshot, calls Claude Haiku,
 * saves to user_notifications for Inbox + Prime chat.
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

    // 3. Overall financial snapshot
    const { data: allTxs } = await sb.from('transactions')
      .select('category, amount, type, merchant_name').eq('user_id', userId).limit(1500);

    let totalExpenses = 0, totalIncome = 0;
    const catTotals: Record<string, number> = {};
    for (const tx of allTxs ?? []) {
      const amt = Math.abs(Number(tx.amount || 0));
      const isInc = tx.type === 'Credit' || (tx.category || '').toLowerCase() === 'income';
      if (isInc) { totalIncome += amt; } else { totalExpenses += amt; }
      const cat = tx.category || 'Needs Review';
      if (!isInc && cat !== 'Needs Review' && cat !== 'Transfers') catTotals[cat] = (catTotals[cat] || 0) + amt;
    }
    const netFlow = totalIncome - totalExpenses;
    const totalTxs = allTxs?.length ?? 0;
    const uncategorized = allTxs?.filter(t => !t.category || t.category === 'Needs Review' || t.category === 'Other').length ?? 0;
    const categorizedPct = totalTxs > 0 ? Math.round(((totalTxs - uncategorized) / totalTxs) * 100) : 0;
    const topExpenseCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0] ?? null;

    // 4. Generate briefing via Claude Haiku
    const systemPrompt = `You are Prime — XspensesAI's lead financial advisor. You speak directly, confidently, and like a smart CFO giving a morning briefing. You are aware of what your AI teammates Byte and Tag have done. Keep it concise — max 150 words. No bullet points in the intro paragraph. Use emojis sparingly for section headers only. End with ONE specific action item.`;

    const userPrompt = `Generate a briefing for Darrell based on this data:

WHAT JUST HAPPENED:
- Byte processed: ${filename} (${month})
- Total transactions imported: ${tagPayload?.total_count ?? 'unknown'}
- Tag auto-categorized: ${tagPayload?.auto_count ?? 0} transactions
- Still needs input: ${tagPayload?.needs_input_count ?? 0} transactions
- Top spending this import: ${tagPayload?.top_categories?.[0]?.category ?? 'unknown'} ($${tagPayload?.top_categories?.[0]?.total?.toFixed(2) ?? '0'})

OVERALL BOOKS:
- Total income: $${totalIncome.toFixed(2)}
- Total expenses: $${totalExpenses.toFixed(2)}
- Net flow: ${netFlow >= 0 ? '+' : ''}$${netFlow.toFixed(2)}
- Uncategorized: ${uncategorized} of ${totalTxs} (${100 - categorizedPct}%)
- Biggest expense: ${topExpenseCat ? `${topExpenseCat[0]} at $${topExpenseCat[1].toFixed(2)}` : 'unknown'}

Write Prime's briefing. Be specific with numbers. Flag anything concerning. End with one clear action.`;

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
        import_id: importId, month, total_income: totalIncome, total_expenses: totalExpenses,
        net_flow: netFlow, uncategorized, categorized_pct: categorizedPct,
        top_expense_category: topExpenseCat?.[0] ?? null,
      },
      sent_at: new Date().toISOString(),
    });

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, briefing }) };
  } catch (err: any) {
    console.error('[prime-briefing] Error:', err.message);
    return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};
