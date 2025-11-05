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
import { moderate, maskPII } from "./shared/guardrails";
import { pickAgent } from "./_shared/agent-router";
import { saveMsg, saveSummary } from "./shared/memory";
import { summarizeConvo } from "./shared/summarizer";
import { runAgent } from "./shared/llm";
import { urlFetchTool } from "./tools/url-fetch";

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
    usedTools?: string[];
    model?: string;
    error?: boolean;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================



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
    if (!moderationResult.ok) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Content not allowed.'
        })
      };
    }

    // Mask PII on user input before processing
    const maskedMessage = maskPII(message);
    const piiMasked = maskedMessage !== message;

    // ========================================================================
    // 2. Pick agent using pickAgent()
    // ========================================================================
    const agent = pickAgent(maskedMessage, preferredAgent);

    // ========================================================================
    // 3. Save user message to Supabase via saveMsg()
    // ========================================================================
    await saveMsg({
      role: 'user',
      agent,
      convoId,
      content: maskedMessage,
      userId
    });

    // ========================================================================
    // 4. Run agent with tools (only 'url.fetch' for now)
    // ========================================================================
    const tools = {
      'url.fetch': urlFetchTool
    };

    const agentResult = await runAgent({
      agent,
      message: maskedMessage,
      convoId,
      tools,
      userId
    });

    const assistantReplyRaw = agentResult.text;

    // Mask PII on assistant reply before saving and returning
    const assistantReply = maskPII(assistantReplyRaw);

    // ========================================================================
    // 5. Save assistant reply (with masked PII)
    // ========================================================================
    await saveMsg({
      role: 'assistant',
      agent,
      convoId,
      content: assistantReply,
      userId
    });

    // ========================================================================
    // 6. Update conversation summary using saveSummary() + summarizeConvo()
    // ========================================================================
    let summaryUpdated = false;
    try {
      const newSummary = await summarizeConvo({
        convoId
      });
      
      if (newSummary && newSummary !== 'Conversation just started.' && !newSummary.includes('unavailable')) {
        await saveSummary({
          convoId,
          agent,
          summary: newSummary,
          userId
        });
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
      reply: assistantReply, // Already masked
      meta: {
        piiMasked: piiMasked || (assistantReply !== assistantReplyRaw),
        moderationFlagged: !moderationResult.ok,
        summaryUpdated,
        usedTools: agentResult.meta.usedTools,
        model: agentResult.meta.model,
        error: agentResult.meta.error
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

