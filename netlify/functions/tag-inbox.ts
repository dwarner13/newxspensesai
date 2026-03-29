import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const userId = auth.userId;
  const sb = serverSupabase();

  try {
    // 1. Unresolved — uncategorized transactions grouped by merchant
    const { data: uncatTxs } = await sb
      .from('transactions')
      .select('id, merchant_name, amount, category')
      .eq('user_id', userId)
      .or('category.eq.Other,category.eq.Uncategorized,category.is.null')
      .limit(500);

    const map: Record<string, { merchant_name: string; transaction_count: number; total_amount: number; sample_id: string }> = {};
    for (const tx of uncatTxs ?? []) {
      const key = tx.merchant_name || 'Unknown';
      if (!map[key]) map[key] = { merchant_name: key, transaction_count: 0, total_amount: 0, sample_id: tx.id };
      map[key].transaction_count++;
      map[key].total_amount += Math.abs(Number(tx.amount || 0));
    }
    const unresolved = Object.values(map).sort((a, b) => b.transaction_count - a.transaction_count);

    // 2. Resolved — recent rules
    let resolved: any[] = [];
    try {
      const { data: rules } = await sb
        .from('category_rules')
        .select('merchant_pattern, category, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      resolved = (rules ?? []).map(r => ({
        merchant_pattern: r.merchant_pattern,
        category: r.category,
        created_at: r.created_at,
      }));
    } catch { /* table may not exist */ }

    // 3. Imports — recent with tx counts
    const { data: imps } = await sb
      .from('imports')
      .select('id, file_url, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    const imports = await Promise.all((imps ?? []).map(async imp => {
      const { count } = await sb
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('import_id', imp.id);
      return {
        id: imp.id,
        filename: String(imp.file_url || '').split('/').pop() || 'Statement',
        created_at: imp.created_at,
        total_count: count ?? 0,
      };
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        unresolved,
        resolved,
        imports,
        badge_count: unresolved.length,
      }),
    };
  } catch (err: any) {
    console.error('[tag-inbox] Error:', err.message);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ unresolved: [], resolved: [], imports: [], badge_count: 0 }),
    };
  }
};
