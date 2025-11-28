/**
 * Tool Metrics Logger
 * 
 * Logs tool execution metrics for observability
 * Can be extended to write to DB or external service
 */

import { supabaseAdmin } from '../supabase';

export async function logToolEvent({ 
  userId, 
  tool, 
  ok, 
  elapsed_ms,
  error 
}: { 
  userId: string; 
  tool: string; 
  ok: boolean; 
  elapsed_ms: number;
  error?: string;
}) {
  try {
    // Log to console for now (can extend to metrics DB later)
    console.log('[Tool Metrics]', {
      userId,
      tool,
      ok,
      elapsed_ms,
      error: error ? error.substring(0, 100) : undefined
    });

    // Optional: Store in database for analytics
    // await supabaseAdmin.from('tool_metrics').insert({
    //   user_id: userId,
    //   tool_name: tool,
    //   success: ok,
    //   latency_ms: elapsed_ms,
    //   error_message: error,
    //   created_at: new Date().toISOString()
    // });
  } catch (err) {
    // Don't let metrics failures break the app
    console.error('[Tool Metrics] Failed to log:', err);
  }
}

export async function getToolMetrics(userId: string, days = 7) {
  // Stub for future metrics dashboard
  return {
    total_calls: 0,
    success_rate: 1.0,
    avg_latency_ms: 0,
    by_tool: {}
  };
}

