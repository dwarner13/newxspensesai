/**
 * Frontend AI Activity Event Logger
 * 
 * Logs activity events to ai_activity_events table using RLS with auth.uid().
 * Guards against missing userId - never inserts with null user_id.
 */

import { getSupabase } from '../supabase';

export interface LogAiActivityEventParams {
  /** Employee ID/slug (e.g., 'prime-boss', 'tag-ai', 'byte-docs') */
  employeeId: string;
  
  /** Event type (e.g., 'message_sent', 'message_received', 'tool_executed') */
  eventType: string;
  
  /** Status ('success' | 'error' | 'pending') */
  status: 'success' | 'error' | 'pending';
  
  /** Label/description */
  label: string;
  
  /** Optional details */
  details?: Record<string, unknown>;
}

/**
 * Log AI activity event from frontend
 * 
 * Uses authenticated Supabase client so RLS enforces user_id = auth.uid().
 * Never inserts if userId cannot be resolved.
 * 
 * @param params - Activity event parameters
 */
export async function logAiActivityEvent(
  params: LogAiActivityEventParams
): Promise<void> {
  // Guard: Ensure we have required fields
  if (!params.employeeId || !params.eventType || !params.label) {
    console.warn('[logAiActivityEvent] Missing required fields - skipping activity log', params);
    return;
  }
  
  try {
    const supabase = getSupabase();
    if (!supabase) {
      console.warn('[logAiActivityEvent] Supabase client not available - skipping activity log');
      return;
    }
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.id) {
      console.warn('[logAiActivityEvent] User not authenticated - skipping activity log', authError?.message);
      return;
    }
    
    // Insert without user_id - RLS policy should set it automatically
    const { error } = await supabase
      .from('ai_activity_events')
      .insert({
        employee_id: params.employeeId,
        event_type: params.eventType,
        status: params.status,
        label: params.label,
        details: params.details || {},
        // Do NOT set user_id - RLS policy enforces auth.uid()
      });
    
    if (error) {
      console.error('[logAiActivityEvent] Failed to insert event:', error);
      // Don't throw - activity logging should not break main flow
    }
  } catch (error: any) {
    console.error('[logAiActivityEvent] Unexpected error:', error);
    // Don't throw - activity logging should not break main flow
  }
}



