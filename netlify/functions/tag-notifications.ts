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

  // Owner 2026-11-26 (smallest safe notifications fix, no migration): Tag's notices are stored in the
  // `notifications` table (live columns employee_slug / message / payload). Errors are reported as
  // errors — never "200 with an empty list", which would look like "no news".
  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await sb
        .from('notifications')
        .select('*')
        .eq('user_id', auth.userId)
        .eq('employee_slug', 'tag-ai')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) return { statusCode: 503, headers, body: JSON.stringify({ error: 'notifications_unavailable', retryable: true }) };
      return { statusCode: 200, headers, body: JSON.stringify({ notifications: data ?? [] }) };
    } catch {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'notifications_unavailable', retryable: true }) };
    }
  }

  if (event.httpMethod === 'POST') {
    const body = JSON.parse(event.body || '{}');
    const { id } = body;
    if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) };
    try {
      const { data, error } = await sb.from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', auth.userId)
        .select('id');
      if (error) return { statusCode: 503, headers, body: JSON.stringify({ error: 'not_updated', retryable: true }) };
      if (!Array.isArray(data) || data.length === 0) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Notification not found' }) };
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    } catch {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'not_updated', retryable: true }) };
    }
  }

  return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
};
