/**
 * admin-data - Serves all admin dashboard data.
 * Requires is_admin = true on the requesting user's profile.
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

const ok = (body: any) => ({ statusCode: 200, headers, body: JSON.stringify(body) });
const err = (msg: string, status = 400) => ({ statusCode: status, headers, body: JSON.stringify({ ok: false, error: msg }) });

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return err('Method not allowed', 405);

  // Verify auth + admin
  const auth = await verifyAuth(event);
  if (!auth.userId) return err('Unauthorized', 401);
  const supabase = serverSupabase();
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', auth.userId).single();
  if (!profile?.is_admin) return err('Forbidden', 403);

  try {
    const body = JSON.parse(event.body || '{}');
    const section = body.section || 'overview';

    if (section === 'overview') {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];
      const oneDayAgo = new Date(now.getTime() - 86400000).toISOString();

      const [
        totalUsersRes,
        activeTodayRes,
        planBreakdownRes,
        totalImportsRes,
        importsTimelineRes,
        totalTransactionsRes,
        transactionsTimelineRes,
        aiActivityRes,
        recentActivityRes,
        errorCountRes,
      ] = await Promise.all([
        // 1. Total users
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        // 2. Active today
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('last_login_at', today),
        // 3. Users by plan
        supabase.from('profiles').select('plan'),
        // 4. Total imports committed
        supabase.from('imports').select('id', { count: 'exact', head: true }).eq('status', 'committed'),
        // 5. Imports last 30 days
        supabase.from('imports').select('created_at').gte('created_at', thirtyDaysAgo),
        // 6. Total transactions
        supabase.from('transactions').select('id', { count: 'exact', head: true }),
        // 7. Transactions last 30 days
        supabase.from('transactions').select('date').gte('date', thirtyDaysAgo),
        // 8. AI activity last 30 days
        supabase.from('ai_activity_events').select('created_at, employee_id').gte('created_at', thirtyDaysAgo),
        // 9. Recent activity feed
        supabase.from('ai_activity_events').select('*, profiles!left(email, display_name, first_name)').order('created_at', { ascending: false }).limit(50),
        // 10. Error count last 24hrs
        supabase.from('error_log').select('id', { count: 'exact', head: true }).gte('created_at', oneDayAgo).catch(() => ({ count: 0 })),
      ]);

      // Aggregate plan breakdown
      const planCounts: Record<string, number> = {};
      for (const row of planBreakdownRes.data || []) {
        const plan = (row as any).plan || 'free';
        planCounts[plan] = (planCounts[plan] || 0) + 1;
      }

      // Aggregate imports by day
      const importsByDay: Record<string, number> = {};
      for (const row of importsTimelineRes.data || []) {
        const day = (row as any).created_at?.split('T')[0];
        if (day) importsByDay[day] = (importsByDay[day] || 0) + 1;
      }

      // Aggregate transactions by day
      const txByDay: Record<string, number> = {};
      for (const row of transactionsTimelineRes.data || []) {
        const day = (row as any).date;
        if (day) txByDay[day] = (txByDay[day] || 0) + 1;
      }

      // Aggregate AI activity by day + employee
      const aiByDay: Record<string, Record<string, number>> = {};
      for (const row of aiActivityRes.data || []) {
        const day = (row as any).created_at?.split('T')[0];
        const emp = (row as any).employee_id || 'unknown';
        if (!day) continue;
        if (!aiByDay[day]) aiByDay[day] = {};
        aiByDay[day][emp] = (aiByDay[day][emp] || 0) + 1;
      }

      // Format recent activity
      const recentActivity = (recentActivityRes.data || []).map((e: any) => ({
        id: e.id,
        user_id: e.user_id,
        employee_id: e.employee_id,
        action_type: e.action_type,
        description: e.description,
        metadata: e.metadata,
        created_at: e.created_at,
        user_email: e.profiles?.email || null,
        user_name: e.profiles?.display_name || e.profiles?.first_name || null,
      }));

      return ok({
        ok: true,
        section: 'overview',
        overview: {
          totalUsers: totalUsersRes.count || 0,
          activeToday: activeTodayRes.count || 0,
          planBreakdown: planCounts,
          totalImports: totalImportsRes.count || 0,
          importsTimeline: Object.entries(importsByDay).sort((a, b) => a[0].localeCompare(b[0])).map(([day, count]) => ({ day, count })),
          totalTransactions: totalTransactionsRes.count || 0,
          transactionsTimeline: Object.entries(txByDay).sort((a, b) => a[0].localeCompare(b[0])).map(([day, count]) => ({ day, count })),
          aiActivityTimeline: Object.entries(aiByDay).sort((a, b) => a[0].localeCompare(b[0])).map(([day, employees]) => ({ day, ...employees })),
          recentActivity,
          errorsLast24h: (errorCountRes as any).count || 0,
        },
      });
    }

    if (section === 'users') {
      const limit = Math.min(Number(body.limit) || 50, 200);
      const offset = Number(body.offset) || 0;
      const { data: users, count } = await supabase
        .from('profiles')
        .select('id, email, display_name, first_name, full_name, plan, is_admin, last_login_at, created_at, metadata', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // For each user, get transaction + import counts
      const enriched = await Promise.all((users || []).map(async (u: any) => {
        const [{ count: txCount }, { count: importCount }] = await Promise.all([
          supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
          supabase.from('imports').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
        ]);
        return { ...u, transactionCount: txCount || 0, importCount: importCount || 0 };
      }));

      return ok({ ok: true, section: 'users', users: enriched, total: count || 0, limit, offset });
    }

    if (section === 'agents') {
      const { data: events } = await supabase
        .from('ai_activity_events')
        .select('employee_id, action_type, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString());

      const agents: Record<string, { total: number; actions: Record<string, number>; lastActive: string }> = {};
      for (const e of events || []) {
        const emp = (e as any).employee_id || 'unknown';
        if (!agents[emp]) agents[emp] = { total: 0, actions: {}, lastActive: '' };
        agents[emp].total++;
        const action = (e as any).action_type || 'other';
        agents[emp].actions[action] = (agents[emp].actions[action] || 0) + 1;
        if ((e as any).created_at > agents[emp].lastActive) agents[emp].lastActive = (e as any).created_at;
      }

      return ok({ ok: true, section: 'agents', agents });
    }

    if (section === 'errors') {
      const { data: errors } = await supabase
        .from('error_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      return ok({ ok: true, section: 'errors', errors: errors || [] });
    }

    return err(`Unknown section: ${section}`);
  } catch (e: any) {
    console.error('[admin-data] Error:', e.message);
    return err(e.message, 500);
  }
};
