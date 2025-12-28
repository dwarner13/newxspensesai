/**
 * Log AI Activity Event Helper
 * 
 * Logs activity events to ai_activity_events table using RLS with auth.uid().
 * Do NOT manually pass user_id - RLS policy enforces auth.uid() automatically.
 * 
 * This helper uses a client-side Supabase client (not admin) so RLS policies apply.
 * The RLS policy should set user_id = auth.uid() automatically.
 */

import { createClient } from '@supabase/supabase-js';

export interface LogAiActivityParams {
  /** Employee ID/slug (e.g., 'prime-boss', 'tag-ai', 'byte-docs') */
  employeeId: string;
  
  /** Event type (e.g., 'message_sent', 'message_received', 'tool_executed') */
  eventType: string;
  
  /** Status - will be normalized to allowed values: 'started' | 'success' | 'completed' | 'error' | 'warning' | 'info' | 'pending' */
  status: string;
  
  /** Label/description */
  label: string;
  
  /** Optional details */
  details?: Record<string, unknown>;
}

/**
 * Get Supabase client with user's auth context (for RLS)
 * This requires the Authorization Bearer token from the request
 */
function getSupabaseClient(authToken: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or anon key not configured');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    },
  });
}

// In-memory cache to track logged errors (prevents spam)
// Key: error code + employeeId, Value: timestamp of first log
const loggedErrors = new Map<string, number>();
const ERROR_LOG_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Allowed status values for ai_activity_events table (matches database constraint)
 */
const ALLOWED_STATUSES = ['started', 'success', 'completed', 'error', 'warning', 'info', 'pending'] as const;

/**
 * Status synonym mapping
 */
const STATUS_SYNONYMS: Record<string, string> = {
  'ok': 'success',
  'done': 'completed',
  'finished': 'completed',
  'failed': 'error',
  'warn': 'warning',
  'information': 'info',
};

/**
 * Normalize status value to match database constraint
 * 
 * Rules:
 * 1. If status contains ".", extract last segment (e.g., "chat.started" -> "started")
 * 2. Map synonyms (e.g., "ok" -> "success", "done" -> "completed")
 * 3. Default to "info" if normalization fails
 * 
 * @param status - Raw status value (may contain dots or synonyms)
 * @returns Normalized status value and original value (if it was dotted)
 */
function normalizeStatus(status: string): { normalized: string; wasDotted: boolean; original?: string } {
  const original = status.trim();
  let normalized = original.toLowerCase();
  let wasDotted = false;
  
  // Step 1: Extract last segment if status contains "."
  if (normalized.includes('.')) {
    wasDotted = true;
    const segments = normalized.split('.');
    normalized = segments[segments.length - 1]; // Take last segment
  }
  
  // Step 2: Map synonyms
  if (STATUS_SYNONYMS[normalized]) {
    normalized = STATUS_SYNONYMS[normalized];
  }
  
  // Step 3: Validate against allowed values, default to "info" if invalid
  if (!ALLOWED_STATUSES.includes(normalized as any)) {
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      console.warn(`[logAiActivity] Status "${original}" normalized to "info" (not in allowed list: ${ALLOWED_STATUSES.join(', ')})`);
    }
    normalized = 'info';
  }
  
  return {
    normalized,
    wasDotted,
    original: wasDotted ? original : undefined,
  };
}

/**
 * Log AI activity event
 * 
 * Uses RLS with auth.uid() - do NOT pass user_id manually.
 * The RLS policy should automatically set user_id = auth.uid().
 * 
 * @param authToken - Authorization Bearer token from request headers (required)
 * @param params - Activity event parameters
 */
export async function logAiActivity(
  authToken: string,
  params: LogAiActivityParams
): Promise<void> {
  if (!authToken || !authToken.trim()) {
    // Log once per session (use employeeId as session identifier)
    const logKey = `no-token-${params.employeeId || 'unknown'}`;
    if (!loggedErrors.has(logKey)) {
      console.warn('[logAiActivity] No auth token provided - skipping activity log');
      loggedErrors.set(logKey, Date.now());
    }
    return;
  }
  
  // Guard: Ensure we have required fields
  if (!params.employeeId || !params.eventType || !params.label) {
    const logKey = `missing-fields-${params.employeeId || 'unknown'}`;
    if (!loggedErrors.has(logKey)) {
      console.warn('[logAiActivity] Missing required fields - skipping activity log', params);
      loggedErrors.set(logKey, Date.now());
    }
    return;
  }
  
  try {
    const supabase = getSupabaseClient(authToken);
    
    // Verify user is authenticated (RLS will enforce user_id = auth.uid())
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.id) {
      const logKey = `auth-failed-${params.employeeId}`;
      if (!loggedErrors.has(logKey)) {
        console.warn('[logAiActivity] Auth verification failed - skipping activity log', authError?.message);
        loggedErrors.set(logKey, Date.now());
      }
      return;
    }
    
    // Normalize status value (handles dotted values like "chat.started" -> "started")
    const statusNormalized = normalizeStatus(params.status);
    
    // DEV-only logging when normalization happens
    if ((process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') && statusNormalized.wasDotted) {
      console.log(`[logAiActivity] Status normalized: "${statusNormalized.original}" -> "${statusNormalized.normalized}"`);
    }
    
    // Build details object: include original dotted status if it was normalized
    const detailsWithStatus: Record<string, unknown> = {
      ...(params.details || {}),
    };
    
    // If status was dotted, store original value in details for reference
    if (statusNormalized.wasDotted && statusNormalized.original) {
      detailsWithStatus.status_original = statusNormalized.original;
    }
    
    // Insert without user_id - RLS policy should set it automatically
    // Handle details column gracefully - if column doesn't exist, omit it
    const insertData: Record<string, unknown> = {
      employee_id: params.employeeId,
      event_type: params.eventType, // Keep original eventType (e.g., "message_sent")
      status: statusNormalized.normalized, // Use normalized status (e.g., "started")
      label: params.label,
      // Do NOT set user_id - RLS policy enforces auth.uid()
    };
    
    // Include details (with original status if it was dotted)
    if (Object.keys(detailsWithStatus).length > 0) {
      insertData.details = detailsWithStatus;
    }
    
    const { error } = await supabase
      .from('ai_activity_events')
      .insert(insertData);
    
    if (error) {
      // Log once per error code + employee (prevents spam)
      const errorCode = error.code || 'unknown';
      const logKey = `${errorCode}-${params.employeeId}`;
      const lastLogged = loggedErrors.get(logKey);
      const now = Date.now();
      
      // Only log if we haven't logged this error recently (within TTL)
      if (!lastLogged || (now - lastLogged) > ERROR_LOG_TTL) {
        // In dev mode, log full error details; in prod, log summary only
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
          console.warn('[logAiActivity] Failed to insert event (will suppress for 5min):', {
            code: error.code,
            message: error.message,
            employeeId: params.employeeId,
            eventType: params.eventType,
          });
        } else {
          console.warn(`[logAiActivity] Failed to insert event (code: ${error.code}, employee: ${params.employeeId}) - suppressing for 5min`);
        }
        loggedErrors.set(logKey, now);
      }
      // Don't throw - activity logging should not break main flow
    }
  } catch (error: any) {
    // Log unexpected errors once per employee
    const logKey = `unexpected-${params.employeeId || 'unknown'}`;
    if (!loggedErrors.has(logKey)) {
      console.error('[logAiActivity] Unexpected error:', error?.message || error);
      loggedErrors.set(logKey, Date.now());
    }
    // Don't throw - activity logging should not break main flow
  }
  
  // Clean up old entries periodically (every 100 calls, roughly)
  if (loggedErrors.size > 100) {
    const now = Date.now();
    for (const [key, timestamp] of loggedErrors.entries()) {
      if (now - timestamp > ERROR_LOG_TTL) {
        loggedErrors.delete(key);
      }
    }
  }
}

