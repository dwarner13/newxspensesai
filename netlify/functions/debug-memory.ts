/**
 * 🐛 Debug Memory Endpoint (DEV ONLY)
 * 
 * Provides visibility into memory state for debugging.
 * 
 * **PRODUCTION SAFETY**: This endpoint is DISABLED in production builds.
 * 
 * Usage:
 * GET /.netlify/functions/debug-memory?userId=<uuid>
 * 
 * Returns:
 * - Last 5 memory facts
 * - Last summary (if exists)
 * - Which employee routed and why
 * - Memory extraction queue status
 */

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';

export const handler: Handler = async (event, context) => {
  // PRODUCTION SAFETY: Disable in production
  if (process.env.NETLIFY_DEV !== 'true' && process.env.NODE_ENV === 'production') {
    return {
      statusCode: 404,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Not found' }),
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Method not allowed. Use GET.' }),
    };
  }

  const userId = event.queryStringParameters?.userId;
  if (!userId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing userId parameter' }),
    };
  }

  const sb = admin();

  try {
    // 1. Get last 5 memory facts
    const { data: facts, error: factsError } = await sb
      .from('user_memory_facts')
      .select('fact, source, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (factsError) {
      console.warn('[Debug Memory] Facts error:', factsError);
    }

    // 2. Get last summary (try chat_convo_summaries first, fallback to chat_session_summaries)
    let lastSummary: any = null;
    try {
      const { data: convoSummary } = await sb
        .from('chat_convo_summaries')
        .select('text, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (convoSummary) {
        lastSummary = convoSummary;
      }
    } catch (e: any) {
      // Table may not exist, try alternative
      if (e.message?.includes('does not exist') || e.code === 'PGRST205') {
        try {
          const { data: sessionSummary } = await sb
            .from('chat_session_summaries')
            .select('summary, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (sessionSummary) {
            lastSummary = {
              text: sessionSummary.summary,
              created_at: sessionSummary.created_at,
            };
          }
        } catch (e2: any) {
          // Both tables may not exist - that's okay
          console.warn('[Debug Memory] Summary tables not found');
        }
      }
    }

    // 3. Get memory extraction queue status
    const { data: queueStats, error: queueError } = await sb
      .from('memory_extraction_queue')
      .select('status')
      .eq('user_id', userId);

    if (queueError) {
      console.warn('[Debug Memory] Queue error:', queueError);
    }

    const queueStatus = {
      pending: (queueStats || []).filter((q: any) => q.status === 'pending').length,
      processing: (queueStats || []).filter((q: any) => q.status === 'processing').length,
      completed: (queueStats || []).filter((q: any) => q.status === 'completed').length,
      failed: (queueStats || []).filter((q: any) => q.status === 'failed').length,
    };

    // 4. Get memory embeddings count
    const { data: embeddings, error: embeddingsError } = await sb
      .from('memory_embeddings')
      .select('id')
      .eq('user_id', userId);

    if (embeddingsError) {
      console.warn('[Debug Memory] Embeddings error:', embeddingsError);
    }

    // 5. Get recent chat messages (for routing context)
    const { data: recentMessages, error: messagesError } = await sb
      .from('chat_messages')
      .select('role, content, employee_key, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (messagesError) {
      console.warn('[Debug Memory] Messages error:', messagesError);
    }

    // Build response
    const response = {
      userId: userId.substring(0, 8) + '...',
      timestamp: new Date().toISOString(),
      memory: {
        facts: facts || [],
        factCount: facts?.length || 0,
        embeddingsCount: embeddings?.length || 0,
      },
      summaries: {
        lastSummary: lastSummary || null,
        hasSummary: !!lastSummary,
      },
      extractionQueue: queueStatus,
      recentMessages: (recentMessages || []).map((m: any) => ({
        role: m.role,
        employee: m.employee_key,
        contentPreview: (m.content || '').substring(0, 100) + '...',
        createdAt: m.created_at,
      })),
      // Note: Routing decision is not stored, would need to add logging
      routing: {
        note: 'Routing decision is not logged. Add logging to router.ts to track routing decisions.',
      },
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Debug-Endpoint': 'true',
        'X-Production-Disabled': 'true',
      },
      body: JSON.stringify(response, null, 2),
    };
  } catch (error: any) {
    console.error('[Debug Memory] Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        // Only include stack in dev
        ...(process.env.NETLIFY_DEV === 'true' ? { stack: error.stack } : {}),
      }),
    };
  }
};




