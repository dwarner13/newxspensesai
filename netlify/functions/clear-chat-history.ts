import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth, getUserIdFromBody } from './_shared/verifyAuth.js';

export const handler: Handler = async (event) => {
  const baseHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: baseHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: baseHeaders,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    let { userId, error: authError } = await verifyAuth(event);
    const devMode = process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development';

    if ((authError || !userId) && devMode) {
      const fallbackUserId = getUserIdFromBody(event);
      if (fallbackUserId) {
        userId = fallbackUserId;
        authError = undefined;
      }
    }

    if (authError || !userId) {
      return {
        statusCode: 401,
        headers: baseHeaders,
        body: JSON.stringify({ error: authError || 'Authentication required' }),
      };
    }

    const sb = admin();
    const [{ data: deletedMessages, error: messageError }, { data: deletedThreads, error: threadError }] = await Promise.all([
      sb.from('chat_messages').delete().eq('user_id', userId).select('id'),
      sb.from('chat_threads').delete().eq('user_id', userId).select('id'),
    ]);

    if (messageError || threadError) {
      return {
        statusCode: 500,
        headers: baseHeaders,
        body: JSON.stringify({
          error: 'Failed to clear chat history',
          details: messageError?.message || threadError?.message,
        }),
      };
    }

    return {
      statusCode: 200,
      headers: baseHeaders,
      body: JSON.stringify({
        ok: true,
        deletedMessages: deletedMessages?.length || 0,
        deletedThreads: deletedThreads?.length || 0,
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ error: error?.message || 'Unexpected error' }),
    };
  }
};
