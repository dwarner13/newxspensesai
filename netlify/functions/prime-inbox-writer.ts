/**
 * prime-inbox-writer — Inserts a message into the user's inbox on behalf of Prime.
 * Used by backend pipelines to surface proactive insights, summaries, and CTAs.
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
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const auth = await verifyAuth(event);
  if (auth.error || !auth.userId) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  try {
    const body = JSON.parse(event.body || '{}');
    const { title, message, ctaButtons } = body;

    if (!title || !message) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'title and message are required' }) };
    }

    const sb = serverSupabase();

    const { error } = await sb.from('inbox_messages').insert({
      user_id: auth.userId,
      title,
      body: message,
      cta_buttons: ctaButtons || [],
      is_read: false,
      sender: 'prime',
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('[prime-inbox-writer] Insert error:', error.message);
      return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  } catch (err: any) {
    console.error('[prime-inbox-writer] Error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
