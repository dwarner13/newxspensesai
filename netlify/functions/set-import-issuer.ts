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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: auth.error || 'Unauthorized' }) };

  let body: { importId?: string; issuer?: string };
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { importId, issuer } = body;
  if (!importId || !issuer) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing importId or issuer' }) };
  }

  const sb = serverSupabase();
  const { error } = await sb
    .from('imports')
    .update({ issuer, updated_at: new Date().toISOString() })
    .eq('id', importId)
    .eq('user_id', auth.userId);

  if (error) {
    console.error('[set-import-issuer] update failed:', error.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
};
