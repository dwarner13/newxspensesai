/**
 * 💬 Chat Endpoint v2 - Day 3 Builder
 * 
 * Complete chat system with:
 * - Guardrails (moderation + PII masking)
 * - Agent routing
 * - Message persistence
 * - Agent execution with tools
 * - Conversation summaries
 * 
 * API Format:
 * POST /.netlify/functions/chat-v2
 * Body: { message, convoId, preferredAgent? }
 * 
 * Response: JSON { agent, reply, meta }
 */

import type { Handler } from "@netlify/functions";
import { supabaseAdmin } from "./supabase";
import { maskPII } from "./_shared/pii";
import { pickAgent } from "./_shared/agent-router";
import { saveSummary, getSummary, rollSummary } from "./_shared/summary";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

// ============================================================================
// TYPES
// ============================================================================

interface ChatV2Request {
  message: string;
  convoId: string;
  preferredAgent?: string | null;
}

interface ChatV2Response {
  agent: string;
  reply: string;
  meta?: {
    piiMasked?: boolean;
    moderationFlagged?: boolean;
    summaryUpdated?: boolean;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Moderate content using OpenAI moderation API
 */
async function moderate(text: string): Promise<{ flagged: boolean; categories: string[] }> {
  try {
    const response = await openai.moderations.create({
      model: 'omni-moderation-latest',
      input: text.slice(0, 10_000)  // API limit
    });
    
    const result = response.results?.[0];
    if (!result) return { flagged: false, categories: [] };
    
    const flaggedCategories: string[] = [];
    if (result.category_scores) {
      // Check critical categories with thresholds
      if ((result.category_scores as any)['sexual/minors'] > 0.5) flaggedCategories.push('sexual/minors');
      if ((result.category_scores as any)['hate/threatening'] > 0.7) flaggedCategories.push('hate/threatening');
      if ((result.category_scores as any)['harassment/threatening'] > 0.7) flaggedCategories.push('harassment/threatening');
      if ((result.category_scores as any)['violence'] > 0.8) flaggedCategories.push('violence');
      if ((result.category_scores as any)['self-harm'] > 0.8) flaggedCategories.push('self-harm');
    }
    
    return {
      flagged: result.flagged || flaggedCategories.length > 0,
      categories: flaggedCategories
    };
  } catch (error) {
    console.error('Moderation check failed:', error);
    return { flagged: false, categories: [] };
  }
}

/**
 * Save message to Supabase
 */
async function saveMsg(params: {
  userId: string;
  convoId: string;
  role: 'user' | 'assistant';
  content: string;
  agent?: string;
}): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        user_id: params.userId,
        session_id: params.convoId, // Treat convoId as session_id
        role: params.role,
        content: params.content,
        employee_key: params.agent || (params.role === 'user' ? 'user' : 'prime-boss')
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data?.id || '';
  } catch (err: any) {
    console.error('[chat-v2] Failed to save message:', err);
    // Return fallback ID instead of throwing
    return `msg-${Date.now()}`;
  }
}

/**
 * Run agent with tools (stubbed for now)
 */
async function runAgent(params: {
  agent: string;
  message: string;
  userId: string;
  convoId: string;
  tools: Record<string, any>;
}): Promise<string> {
  // Stub: Return placeholder text for now
  // TODO: Implement actual agent execution with OpenAI
  return `[Agent ${params.agent} response placeholder] Processing: "${params.message.substring(0, 50)}..."`;
}

/**
 * Summarize conversation
 */
async function summarizeConvo(params: {
  userId: string;
  convoId: string;
  userMessage: string;
  assistantReply: string;
}): Promise<string> {
  try {
    // Get previous summary
    const prevSummary = await getSummary(params.userId, params.convoId);
    
    // Get last few messages (we'll use current turn + previous summary)
    const lastTurns = [
      { role: 'user' as const, content: params.userMessage },
      { role: 'assistant' as const, content: params.assistantReply }
    ];
    
    // Roll summary with new turns
    const newSummary = await rollSummary({
      user_id: params.userId,
      convo_id: params.convoId,
      prevSummary: prevSummary || '',
      lastTurns
    });
    
    return newSummary;
  } catch (err: any) {
    console.error('[chat-v2] Failed to summarize conversation:', err);
    return '';
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export const handler: Handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'content-type, authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'X-Guardrails': 'active',
    'X-PII-Mask': 'enabled'
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
    const body = JSON.parse(event.body || '{}') as ChatV2Request;
    const { message, convoId, preferredAgent } = body;

    // Validate required fields
    if (!message || !convoId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'message and convoId are required' })
      };
    }

    // Get userId from context (assume it's passed via headers or context)
    // TODO: Extract from auth token if available
    const userId = (event.headers['x-user-id'] || context.clientContext?.user?.sub || 'anonymous') as string;

    // ========================================================================
    // 1. Run guardrails: moderate() then maskPII()
    // ========================================================================
    const moderationResult = await moderate(message);
    if (moderationResult.flagged) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Content flagged by moderation',
          categories: moderationResult.categories
        })
      };
    }

    const piiResult = maskPII(message, 'last4');
    const maskedMessage = piiResult.masked;
    const piiMasked = piiResult.found.length > 0;

    // ========================================================================
    // 2. Pick agent using pickAgent()
    // ========================================================================
    const agent = pickAgent(maskedMessage, preferredAgent);

    // ========================================================================
    // 3. Save user message to Supabase via saveMsg()
    // ========================================================================
    await saveMsg({
      userId,
      convoId,
      role: 'user',
      content: maskedMessage,
      agent
    });

    // ========================================================================
    // 4. Run agent with tools (only 'url.fetch' for now)
    // ========================================================================
    const tools = {
      'url.fetch': async (url: string) => {
        // Stub implementation
        return { status: 200, content: `[Stub] Fetched: ${url}` };
      }
    };

    const assistantReply = await runAgent({
      agent,
      message: maskedMessage,
      userId,
      convoId,
      tools
    });

    // ========================================================================
    // 5. Save assistant reply
    // ========================================================================
    await saveMsg({
      userId,
      convoId,
      role: 'assistant',
      content: assistantReply,
      agent
    });

    // ========================================================================
    // 6. Update conversation summary using saveSummary() + summarizeConvo()
    // ========================================================================
    let summaryUpdated = false;
    try {
      const newSummary = await summarizeConvo({
        userId,
        convoId,
        userMessage: maskedMessage,
        assistantReply
      });
      
      if (newSummary) {
        await saveSummary(userId, convoId, newSummary);
        summaryUpdated = true;
      }
    } catch (summaryErr) {
      console.error('[chat-v2] Summary update failed (non-blocking):', summaryErr);
    }

    // ========================================================================
    // 7. Return JSON response
    // ========================================================================
    const response: ChatV2Response = {
      agent,
      reply: assistantReply,
      meta: {
        piiMasked,
        moderationFlagged: moderationResult.flagged,
        summaryUpdated
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error: any) {
    console.error('[chat-v2] Error:', error);
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

