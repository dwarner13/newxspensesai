/**
 * tag-activity-log — Returns Tag's categorization activity history for a user.
 * Supports pagination, month filtering, and monthly summary stats.
 */

import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

const ok = (body: any) => ({ statusCode: 200, headers, body: JSON.stringify(body) });
const err = (msg: string, status = 400) => ({ statusCode: status, headers, body: JSON.stringify({ ok: false, error: msg }) });

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'GET') return err('Method not allowed', 405);

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return err('Unauthorized', 401);

  const userId = auth.userId;
  const sb = serverSupabase();

  try {
    const params = event.queryStringParameters || {};
    const limit = Math.min(Number(params.limit) || 100, 500);
    const offset = Number(params.offset) || 0;
    const month = params.month || null; // YYYY-MM format

    // Fetch activity log entries with transaction join
    let q = sb
      .from('tag_activity_log')
      .select('*, transactions!left(date, amount)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (month) {
      const startDate = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const endDate = new Date(y, m, 0).toISOString().split('T')[0]; // last day of month
      q = q.gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`);
    }

    const { data: entries, error: logErr } = await q;
    if (logErr) return err(logErr.message, 500);

    // Flatten joined transaction data
    const logs = (entries || []).map((e: any) => ({
      id: e.id,
      transaction_id: e.transaction_id,
      merchant_name: e.merchant_name,
      previous_category: e.previous_category,
      new_category: e.new_category,
      new_subcategory: e.new_subcategory,
      change_source: e.change_source,
      change_note: e.change_note,
      created_at: e.created_at,
      transaction_date: e.transactions?.date || null,
      transaction_amount: e.transactions?.amount || null,
    }));

    // Monthly summary — aggregate by month and source
    const { data: summaryRows } = await sb
      .from('tag_activity_log')
      .select('created_at, change_source, merchant_name')
      .eq('user_id', userId);

    const monthMap = new Map<string, { changes: number; merchants: Set<string>; sources: Record<string, number> }>();
    for (const row of summaryRows || []) {
      const d = new Date(row.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(key)) monthMap.set(key, { changes: 0, merchants: new Set(), sources: {} });
      const m = monthMap.get(key)!;
      m.changes++;
      if (row.merchant_name) m.merchants.add(row.merchant_name);
      const src = row.change_source || 'unknown';
      m.sources[src] = (m.sources[src] || 0) + 1;
    }

    const monthlySummary = [...monthMap.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, data]) => ({
        month,
        changes: data.changes,
        merchants: data.merchants.size,
        sources: data.sources,
      }));

    // Total count for pagination
    let countQ = sb.from('tag_activity_log').select('id', { count: 'exact', head: true }).eq('user_id', userId);
    if (month) {
      const startDate = `${month}-01`;
      const [y, m] = month.split('-').map(Number);
      const endDate = new Date(y, m, 0).toISOString().split('T')[0];
      countQ = countQ.gte('created_at', `${startDate}T00:00:00`).lte('created_at', `${endDate}T23:59:59`);
    }
    const { count: totalCount } = await countQ;

    return ok({
      ok: true,
      entries: logs,
      total: totalCount || logs.length,
      limit,
      offset,
      monthlySummary,
    });
  } catch (e: any) {
    console.error('[tag-activity-log] Error:', e.message);
    return err(e.message, 500);
  }
};
