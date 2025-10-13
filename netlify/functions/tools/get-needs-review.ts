/**
 * Get Needs Review Tool
 * 
 * Returns transactions that need user review (low confidence or no category)
 */

import { Handler } from '@netlify/functions';
import { admin } from '../_shared/upload';

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
    
    const { userId, limit = 50 } = JSON.parse(event.body || '{}');
    if (!userId) return { statusCode: 400, body: JSON.stringify({ error: 'Missing userId' }) };

    const sb = admin();
    
    const { data, error } = await sb
      .from('transactions')
      .select('id, date, merchant, amount, category, review_reason, description')
      .eq('user_id', userId)
      .eq('review_status', 'needs_review')
      .order('date', { ascending: false })
      .limit(Math.min(limit, 200));
    
    if (error) throw error;
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        transactions: data || [],
        count: data?.length || 0
      })
    };
  } catch (e: any) {
    console.error('[Get Needs Review Error]', e);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};

