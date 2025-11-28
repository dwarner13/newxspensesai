/**
 * 🚦 Rate Limiting
 * 
 * Simple sliding window rate limiter using Supabase.
 * No external dependencies, works with service role key.
 * 
 * Database table required:
 *   CREATE TABLE public.rate_limits (
 *     user_id text PRIMARY KEY,
 *     window_start timestamptz NOT NULL,
 *     count int NOT NULL
 *   );
 * 
 * Keep RLS disabled - accessed with service role only.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // server-side only
);

/**
 * Assert that user is within rate limit
 * @param userId - User ID to check
 * @param maxPerMinute - Maximum requests per minute (default: 20)
 * @throws Error with statusCode 429 if rate limit exceeded
 */
export async function assertWithinRateLimit(userId: string, maxPerMinute = 20) {
  const now = new Date();
  const windowMs = 60_000; // 1 minute in milliseconds

  try {
    // Fetch current rate limit state for user
    const { data, error: fetchError } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('[Rate Limit] Fetch error:', fetchError);
      // Fail open - don't block user if rate limit check fails
      return;
    }

    // First request from this user - create new window
    if (!data) {
      const { error: insertError } = await supabase
        .from('rate_limits')
        .insert({ 
          user_id: userId, 
          window_start: now.toISOString(), 
          count: 1 
        });

      if (insertError) {
        console.error('[Rate Limit] Insert error:', insertError);
        // Fail open
      }
      return;
    }

    // Calculate elapsed time since window start
    const start = new Date(data.window_start);
    const elapsed = now.getTime() - start.getTime();

    // Window expired - reset with new window
    if (elapsed > windowMs) {
      const { error: resetError } = await supabase
        .from('rate_limits')
        .update({ 
          window_start: now.toISOString(), 
          count: 1 
        })
        .eq('user_id', userId);

      if (resetError) {
        console.error('[Rate Limit] Reset error:', resetError);
        // Fail open
      }
      return;
    }

    // Check if next request would exceed limit
    if (data.count + 1 > maxPerMinute) {
      const resetInSeconds = Math.ceil((windowMs - elapsed) / 1000);
      const err: any = new Error(
        `Rate limit exceeded. You can make ${maxPerMinute} requests per minute. Try again in ${resetInSeconds}s.`
      );
      err.statusCode = 429;
      err.retryAfter = resetInSeconds;
      throw err;
    }

    // Increment counter
    const { error: updateError } = await supabase
      .from('rate_limits')
      .update({ count: data.count + 1 })
      .eq('user_id', userId);

    if (updateError) {
      console.error('[Rate Limit] Update error:', updateError);
      // Fail open
    }
  } catch (err: any) {
    // Re-throw rate limit errors
    if (err.statusCode === 429) {
      throw err;
    }
    
    // For all other errors, fail open (don't block user)
    console.error('[Rate Limit] Unexpected error:', err);
  }
}

/**
 * Get current rate limit status for a user (for monitoring/debugging)
 * @param userId - User ID to check
 * @returns Rate limit info or null if no record exists
 */
export async function getRateLimitStatus(userId: string) {
  const { data, error } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

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


