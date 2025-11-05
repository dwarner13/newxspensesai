/**
 * History Endpoint - Fetch conversation message history
 * 
 * POST /.netlify/functions/history
 * Body: { convoId }
 * 
 * Returns: { messages: [{ role, agent?, content, created_at }] }
 */

import type { Handler } from "@netlify/functions";
import { supabaseAdmin } from "./supabase";

interface HistoryRequest {
  convoId: string;
}

interface HistoryMessage {
  role: string;
  agent?: string;
  content: string;
  created_at: string;
}

interface HistoryResponse {
  messages: HistoryMessage[];
}

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || '{}') as HistoryRequest;
    const { convoId } = body;

    // Validate required fields
    if (!convoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'convoId is required' })
      };
    }

    // Query Supabase for last 20 messages
    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('convo_id', convoId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[history] Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database query failed', details: error.message })
      };
    }

    // Transform messages (handle jsonb content, extract agent if stored separately)
    const transformedMessages: HistoryMessage[] = (messages || []).map((msg: any) => {
      // Handle content (could be jsonb or text)
      let content = msg.content;
      if (typeof content === 'object') {
        content = JSON.stringify(content);
      } else if (typeof content !== 'string') {
        content = String(content || '');
      }

      return {
        role: msg.role,
        content: content,
        created_at: msg.created_at
      };
    });

    // Reverse to show oldest first (since we queried desc)
    transformedMessages.reverse();

    const response: HistoryResponse = {
      messages: transformedMessages
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('[history] Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error?.message || 'Unknown error'
      })
    };
  }
};


