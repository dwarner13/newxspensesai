import type { Handler } from '@netlify/functions';
import { serverSupabase } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  const sb = serverSupabase();

  if (event.httpMethod === 'GET') {
    try {
      const { data } = await sb
        .from('user_notifications')
        .select('*')
        .eq('user_id', auth.userId)
        .eq('employee_slug', 'tag-ai')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      return { statusCode: 200, headers, body: JSON.stringify({ notifications: data ?? [] }) };
    } catch {
      return { statusCode: 200, headers, body: JSON.stringify({ notifications: [] }) };
    }
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { id } = body;
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) };
    try {
      await sb.from('user_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', auth.userId);
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch (e: any) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
