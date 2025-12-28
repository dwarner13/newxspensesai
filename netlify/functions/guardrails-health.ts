/**
 * Guardrails Health Check Endpoint
 * 
 * Returns the current status of the guardrails system without making OpenAI calls.
 * Fast health check (<100ms) that verifies:
 * - Guardrails modules are loadable
 * - Supabase connection is reachable
 * - Configuration is accessible
 * 
 * This endpoint does NOT require auth (public health check).
 * However, if auth is provided, it can return user-specific status.
 */

// ====== GUARDRAILS HEALTH ======

import type { Handler } from '@netlify/functions';
import { admin } from './_shared/supabase.js';

interface HealthCheckResult {
  ok: boolean;
  status: 'online' | 'offline';
  enabled: boolean;
  pii_masking: boolean;
  moderation: boolean;
  policy_version: string;
  checked_at: string;
  error?: string;
}

export const handler: Handler = async (event) => {
  const startTime = Date.now();
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow GET or POST
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    let enabled = false;
    let pii_masking = false;
    let moderation = false;
    let policy_version = 'balanced';
    let error: string | undefined;

    // Check 1: Guardrails modules are loadable and functional
    try {
      // Try to import guardrails modules (this verifies they exist and are loadable)
      const { getGuardrailConfig, runInputGuardrails } = await import('./_shared/guardrails-unified.js');
      const { PII_DETECTORS } = await import('./_shared/pii.js');
      
      // Verify PII detectors are available
      if (PII_DETECTORS && Object.keys(PII_DETECTORS).length > 0) {
        pii_masking = true;
      }
      
      // Verify guardrails functions are callable and get config
      if (typeof getGuardrailConfig === 'function' && typeof runInputGuardrails === 'function') {
        try {
          // Try to get config with a dummy userId (health check doesn't have auth)
          // Use a test user ID or empty string - config should still load
          const config = await getGuardrailConfig('health-check-user');
          if (config && typeof config === 'object') {
            moderation = config.chat?.moderation === true || config.ingestion?.moderation === true;
            pii_masking = (config.chat?.pii !== false && config.ingestion?.pii !== false) && pii_masking;
            policy_version = config.preset || 'balanced';
            enabled = true; // Config loaded successfully
          }
        } catch (configError: any) {
          console.warn('[guardrails-health] Config check failed:', configError.message);
          // If config fails but modules exist, mark as degraded
          enabled = false;
          error = `Config load failed: ${configError.message.substring(0, 100)}`;
        }
      }
    } catch (moduleError: any) {
      error = `Module load failed: ${moduleError.message.substring(0, 100)}`;
      console.error('[guardrails-health] Module check failed:', moduleError);
    }

    // Check 2: OpenAI API key is configured (for moderation)
    // Note: We don't actually call OpenAI, just check env var exists
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.length === 0) {
      // No OpenAI key - moderation cannot work
      moderation = false;
      if (enabled && !error) {
        error = 'OpenAI API key not configured';
      }
    }

    // Check 3: Supabase connection is reachable (for logging) - non-blocking
    try {
      const supabase = admin();
      const { error: dbError } = await supabase
        .from('guardrail_events')
        .select('id')
        .limit(1);
      
      // If we can query (even if empty), connection is good
      // Error code PGRST116 means "no rows" which is fine - connection works
      if (dbError && dbError.code !== 'PGRST116') {
        console.warn('[guardrails-health] Supabase check failed:', dbError);
        // Don't fail health check if DB is down - guardrails can still work
      }
    } catch (dbError: any) {
      console.warn('[guardrails-health] Supabase connection check failed:', dbError.message);
      // Don't fail health check if DB is down
    }

    // Build result object with defensive boolean coercion
    const isOnline = Boolean(enabled && (pii_masking || moderation)); // At least one protection must be enabled
    const result: HealthCheckResult = {
      ok: isOnline,
      status: isOnline ? 'online' : 'offline',
      enabled: Boolean(enabled),
      pii_masking: Boolean(pii_masking),
      moderation: Boolean(moderation),
      policy_version: policy_version || 'balanced',
      checked_at: new Date().toISOString(),
      ...(error ? { error } : {}),
    };

    const duration = Date.now() - startTime;
    
    // Log health check result (dev only) - ensure no undefined variables
    if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
      try {
        console.log('[guardrails-health] Health check completed:', {
          ok: Boolean(result?.ok),
          enabled: Boolean(result?.enabled),
          pii_masking: Boolean(result?.pii_masking),
          moderation: Boolean(result?.moderation),
          duration: `${duration}ms`,
        });
      } catch (logErr: any) {
        // Ignore logging errors - don't break the response
        console.warn('[guardrails-health] Logging failed:', logErr?.message);
      }
    }

    // Canonical response construction with defensive defaults
    // CRITICAL: Only reference variables that are guaranteed to exist
    const ok = Boolean(result?.ok ?? false);
    const status_result: 'online' | 'offline' = result?.status ?? (ok ? 'online' : 'offline');
    const enabled_result = Boolean(result?.enabled ?? false);
    const pii_masking_result = Boolean(result?.pii_masking ?? false);
    const moderation_result = Boolean(result?.moderation ?? false);
    const policy_version_result = String(result?.policy_version ?? 'balanced');
    const checked_at_result = String(result?.checked_at ?? new Date().toISOString());
    const error_result = result?.error ? String(result.error) : undefined;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({
        ok,
        status: status_result,
        enabled: enabled_result,
        pii_masking: pii_masking_result,
        moderation: moderation_result,
        policy_version: policy_version_result,
        checked_at: checked_at_result,
        ...(error_result ? { error: error_result } : {}),
      }),
    };
  } catch (err: any) {
    // CRITICAL: Never return 500 - always return 200 with offline status
    // This ensures the endpoint is always accessible and UI can handle gracefully
    // IMPORTANT: Do NOT reference any variables from try block (error, result, headers, etc.)
    console.error('[guardrails-health] Unexpected error:', err);
    const errorMessage = err?.message ?? String(err ?? 'Unknown error');
    const errorSummary = errorMessage.length > 100 ? errorMessage.substring(0, 100) + '...' : errorMessage;
    
    return {
      statusCode: 200, // Always return 200, never 500
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify({
        ok: false,
        status: 'offline',
        enabled: false,
        pii_masking: false,
        moderation: false,
        policy_version: 'balanced',
        checked_at: new Date().toISOString(),
        error: errorSummary,
        stack: err?.stack ?? null,
      }),
    };
  }
};

