/**
 * Summary Endpoint - Fetch conversation summary
 * 
 * POST /.netlify/functions/summary
 * Body: { convoId }
 * 
 * Returns: { summary: string, agent?: string, updated_at?: string }
 */

import type { Handler } from "@netlify/functions";
import { supabaseAdmin } from "./supabase";

interface SummaryRequest {
  convoId: string;
}

interface SummaryResponse {
  summary?: string;
  agent?: string;
  updated_at?: string;
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
    const body = JSON.parse(event.body || '{}') as SummaryRequest;
    const { convoId } = body;

    // Validate required fields
    if (!convoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'convoId is required' })
      };
    }

    // Query Supabase for summary (get the most recent one if multiple agents)
    const { data: summaries, error } = await supabaseAdmin
      .from('chat_convo_summaries')
      .select('summary, agent, updated_at')
      .eq('convo_id', convoId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[summary] Database error:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Database query failed', details: error.message })
      };
    }

    const response: SummaryResponse = {
      summary: summaries?.summary || undefined,
      agent: summaries?.agent || undefined,
      updated_at: summaries?.updated_at || undefined
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('[summary] Error:', error);
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

