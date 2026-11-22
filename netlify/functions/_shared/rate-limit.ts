/**
 * 🚦 Rate Limiting
 * 
 * Simple sliding window rate limiter using Supabase.
 * No external dependencies, works with service role key.
 * 
 * Database table required:
 *   CREATE TABLE public.chat_rate_limits (
 *     user_id text PRIMARY KEY,
 *     window_start timestamptz NOT NULL,
 *     count int NOT NULL
 *   );
 * 
 * Keep RLS disabled - accessed with service role only.
 * 
 * NOTE: Updated from rate_limits to chat_rate_limits to match actual table name.
 */

import { createClient } from '@supabase/supabase-js';

// COLLAB-1: created on first use, so a missing configuration falls back to the in-memory
// limiter instead of failing at import time.
let cachedClient: ReturnType<typeof createClient> | null = null;
function getClient() {
  if (!cachedClient) cachedClient = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!); // server-side only
  return cachedClient;
}

/**
 * Check if a string is a valid UUID format
 */
function isValidUuid(value: string | null | undefined): boolean {
  if (!value) return false;
  // UUID format: 8-4-4-4-12 hex digits with hyphens
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(value);
}

/**
 * COLLAB-1: in-memory fallback limiter. Used whenever the database limiter is unavailable
 * (table missing, query error, non-UUID id) so the limit no longer "fails open" to
 * unlimited requests. Per warm function instance; same per-user budget; bounded map.
 */
const FALLBACK_MAX_USERS = 5000;
const fallbackWindows = new Map<string, { start: number; count: number }>();

function rateLimitError(maxPerMinute: number, retryAfter: number): Error {
  const err: any = new Error(`Rate limit exceeded. You can make ${maxPerMinute} requests per minute. Try again in ${retryAfter}s.`);
  err.statusCode = 429;
  err.retryAfter = retryAfter;
  return err;
}

export function assertWithinFallbackRateLimit(userId: string, maxPerMinute = 20, nowMs = Date.now()): void {
  const windowMs = 60_000;
  const key = String(userId || 'anonymous');
  const w = fallbackWindows.get(key);
  if (!w || nowMs - w.start > windowMs) {
    if (!w && fallbackWindows.size >= FALLBACK_MAX_USERS) {
      const oldest = fallbackWindows.keys().next().value;
      if (oldest !== undefined) fallbackWindows.delete(oldest);
    }
    fallbackWindows.set(key, { start: nowMs, count: 1 });
    return;
  }
  if (w.count + 1 > maxPerMinute) throw rateLimitError(maxPerMinute, Math.max(1, Math.ceil((windowMs - (nowMs - w.start)) / 1000)));
  w.count += 1;
}

/** Test hook only. */
export function __resetFallbackRateLimitForTests(): void { fallbackWindows.clear(); }

/**
 * Assert that user is within rate limit
 * @param userId - User ID to check
 * @param maxPerMinute - Maximum requests per minute (default: 20)
 * @throws Error with statusCode 429 if rate limit exceeded
 *
 * COLLAB-1: when the database limiter cannot be used, the in-memory fallback limiter is
 * applied instead of allowing the request unconditionally.
 */
export async function assertWithinRateLimit(userId: string, maxPerMinute = 20, injectedClient?: any) {
  const fallback = (reason: string) => {
    console.warn(`[Rate Limit] database limiter unavailable (${reason}) — using in-memory fallback`);
    assertWithinFallbackRateLimit(userId, maxPerMinute);
  };
  if (!isValidUuid(userId)) return fallback('non_uuid_user');

  const now = new Date();
  const windowMs = 60_000;
  try {
    const client = injectedClient ?? getClient();
    const { data, error: fetchError } = await client
      .from('chat_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    if (fetchError) return fallback('fetch_error');

    // First request from this user - create new window
    if (!data) {
      const { error: insertError } = await client
        .from('chat_rate_limits')
        .insert({ user_id: userId, window_start: now.toISOString(), count: 1 });
      if (insertError) return fallback('insert_error');
      return;
    }

    const elapsed = now.getTime() - new Date(data.window_start).getTime();

    // Window expired - reset with new window
    if (elapsed > windowMs) {
      const { error: resetError } = await client
        .from('chat_rate_limits')
        .update({ window_start: now.toISOString(), count: 1 })
        .eq('user_id', userId);
      if (resetError) return fallback('reset_error');
      return;
    }

    // Check if next request would exceed limit
    if (data.count + 1 > maxPerMinute) {
      throw rateLimitError(maxPerMinute, Math.ceil((windowMs - elapsed) / 1000));
    }

    // Increment counter
    const { error: updateError } = await client
      .from('chat_rate_limits')
      .update({ count: data.count + 1 })
      .eq('user_id', userId);
    if (updateError) return fallback('update_error');
  } catch (err: any) {
    if (err?.statusCode === 429) throw err;
    return fallback('exception');
  }
}

/**
 * Get current rate limit status for a user (for monitoring/debugging)
 * @param userId - User ID to check
 * @returns Rate limit info or null if no record exists
 */
export async function getRateLimitStatus(userId: string) {
  let data: any = null;
  let error: any = null;
  
  try {
    const result = await getClient()
      .from('chat_rate_limits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    data = result.data;
    error = result.error;
  } catch (err: any) {
    if (err.code === 'PGRST205' || err.message?.includes('table') || err.message?.includes('not found')) {
      console.warn('[Rate Limit] chat_rate_limits table not found, returning null');
      return null;
    }
    throw err;
  }

  if (error) {
    if (error.code === 'PGRST205' || error.message?.includes('table') || error.message?.includes('not found')) {
      console.warn('[Rate Limit] chat_rate_limits table not found, returning null');
      return null;
    }
  }
  
  if (error || !data) return null;

  const now = new Date();
  const start = new Date(data.window_start);
  const elapsed = now.getTime() - start.getTime();
  const windowMs = 60_000;

  return {
    userId: data.user_id,
    count: data.count,
    windowStart: data.window_start,
    elapsedMs: elapsed,
    resetInSeconds: Math.max(0, Math.ceil((windowMs - elapsed) / 1000)),
    isExpired: elapsed > windowMs
  };
}


