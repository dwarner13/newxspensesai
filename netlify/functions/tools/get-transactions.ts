/**
 * Get Transactions Tool
 * 
 * Query user's transactions with filters
 * Called by Prime/Crystal for spending analysis
 */

import { Handler } from '@netlify/functions';
import { admin } from '../_shared/upload';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    const { userId, from, to, vendor, category, limit = 50 } = JSON.parse(event.body || '{}');
    if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };

    const sb = admin();
    
    let query = sb
      .from('transactions')
      .select('date, merchant, amount, category, review_status, description')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(Math.min(limit, 200));
    
    if (from) query = query.gte('date', from);
    if (to) query = query.lte('date', to);
    if (vendor) query = query.ilike('merchant', `%${vendor}%`);
    if (category) query = query.eq('category', category);
    
    const { data, error } = await query;
    if (error) throw error;
    
    const total = (data || []).reduce((sum, t) => sum + (t.amount || 0), 0);
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        transactions: data || [],
        count: data?.length || 0,
        total
      })
    };
  } catch (e: any) {
    console.error('[Get Transactions Error]', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

