/**
 * Chat Threads Endpoint
 *
 * Returns recent conversation threads for the authenticated user.
 * GET /.netlify/functions/chat-threads
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';
import { verifyAuth } from './_shared/verifyAuth.js';

type ChatThread = {
  threadId: string;
  employeeSlug: string;
  title: string;
  lastMessagePreview: string;
  updatedAt: string | null;
  messageCount: number;
};

function isSchemaError(error: any): boolean {
  if (!error) return false;
  const code = error.code || error.error?.code || '';
  const message = (error.message || error.error?.message || '').toLowerCase();
  return (
    code === '42703' || // undefined_column
    code === '42P01' || // undefined_table
    code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('could not find the table')
  );
}

function toPreview(content: string | null | undefined): string {
  const normalized = (content || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
}

export const handler: Handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const { userId, error: authError } = await verifyAuth(event);
    if (authError || !userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: authError || 'Authentication required' }),
      };
    }

    const sb = admin();

    const { data: summaryRows, error: summaryError } = await sb
      .from('chat_convo_summaries')
      .select('thread_id, employee_slug, title, last_message_preview, updated_at, message_count')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (!summaryError && summaryRows) {
      const threads: ChatThread[] = summaryRows.map((row: any) => ({
        threadId: String(row.thread_id),
        employeeSlug: row.employee_slug || 'prime-boss',
        title: row.title || 'Conversation',
        lastMessagePreview: row.last_message_preview || '',
        updatedAt: row.updated_at || null,
        messageCount: Number(row.message_count || 0),
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ threads }),
      };
    }

    if (summaryError && !isSchemaError(summaryError)) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to load chat threads' }),
      };
    }

    const { data: messages, error: messagesError } = await sb
      .from('chat_messages')
      .select('thread_id, employee_slug, content, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (messagesError || !messages) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ threads: [] }),
      };
    }

    const threadMap = new Map<string, ChatThread>();
    for (const msg of messages) {
      const threadId = msg.thread_id;
      const employeeSlug = msg.employee_slug || 'prime-boss';
      if (!threadId) continue;
      const key = `${threadId}:${employeeSlug}`;
      const existing = threadMap.get(key);
      if (!existing) {
        threadMap.set(key, {
          threadId: String(threadId),
          employeeSlug,
          title: toPreview(msg.content) || 'Conversation',
          lastMessagePreview: toPreview(msg.content),
          updatedAt: msg.created_at || null,
          messageCount: 1,
        });
      } else {
        existing.messageCount += 1;
      }
      if (threadMap.size >= 50) {
        break;
      }
    }

    const threads = Array.from(threadMap.values()).sort((a, b) => {
      const aTime = new Date(a.updatedAt || 0).getTime();
      const bTime = new Date(b.updatedAt || 0).getTime();
      return bTime - aTime;
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ threads }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
