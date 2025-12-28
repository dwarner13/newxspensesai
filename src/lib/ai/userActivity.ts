/**
 * User Activity Logging
 * =====================
 * Logs user events for AI fluency calculation and analytics
 */

/**
 * Get service Supabase client
 * Uses existing admin() function from netlify/functions/_shared/supabase.ts
 * This ensures we don't duplicate Supabase client creation
 * 
 * NOTE: This file is server-only (Netlify functions), so admin() is always available
 */
function getServiceSupabase() {
  // Use admin() from shared supabase module (server-only)
  // Dynamic import to avoid circular dependencies
  try {
    // Try relative path from src/lib/ai/ to netlify/functions/_shared/
    const { admin } = require('../../../netlify/functions/_shared/supabase.js');
    return admin();
  } catch (e) {
    // Fallback if admin() not available (shouldn't happen in server context)
    const { createClient } = require("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    return createClient(url, key, { auth: { persistSession: false } });
  }
}

export type UserEventType =
  | "doc_processed"
  | "receipt_uploaded"
  | "statement_uploaded"
  | "category_correction"
  | "rule_created"
  | "export_used"
  | "forecast_used"
  | "multi_step_chat"
  | "memory_enabled";

export interface LogUserEventParams {
  userId: string;
  eventType: UserEventType;
  eventValue?: number;
  meta?: Record<string, any>;
}

/**
 * Log a user activity event
 * 
 * @param params - Event parameters
 */
export async function logUserEvent(params: LogUserEventParams) {
  const supabase = getServiceSupabase();
  
  try {
    const { error } = await supabase.from("user_activity_events").insert({
      user_id: params.userId,
      event_type: params.eventType,
      event_value: params.eventValue ?? 1,
      meta: params.meta ?? {},
    });

    if (error) {
      console.error('[UserActivity] Failed to log event:', error);
      // Don't throw - logging failures shouldn't break the app
    }
  } catch (error: any) {
    console.error('[UserActivity] Error logging event:', error);
    // Don't throw - logging failures shouldn't break the app
  }
}

/**
 * Recalculate AI fluency level and score based on user activity
 * 
 * Calls the SQL function: public.recalculate_ai_fluency(text)
 * 
 * @param userId - User ID
 */
export async function recalcFluency(userId: string) {
  const supabase = getServiceSupabase();
  
  try {
    const { error } = await supabase.rpc("recalculate_ai_fluency", { 
      p_user_id: userId 
    });

    if (error) {
      console.error('[UserActivity] Failed to recalculate fluency:', error);
      // Don't throw - recalculation failures shouldn't break the app
    }
  } catch (error: any) {
    console.error('[UserActivity] Error recalculating fluency:', error);
    // Don't throw - recalculation failures shouldn't break the app
  }
}

