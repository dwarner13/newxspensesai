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
    // Use chat_rate_limits table (updated from rate_limits)
    let data: any = null;
    let fetchError: any = null;
    
    try {
      const result = await supabase
        .from('chat_rate_limits')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      data = result.data;
      fetchError = result.error;
    } catch (err: any) {
      // If table doesn't exist (PGRST205), log warning and skip rate limiting
      if (err.code === 'PGRST205' || err.message?.includes('table') || err.message?.includes('not found')) {
        console.warn('[Rate Limit] chat_rate_limits table not found, skipping rate limiting in dev');
        return; // Fail open - allow request to proceed
      }
      throw err;
    }

    if (fetchError) {
      // PGRST205 = table not found
      if (fetchError.code === 'PGRST205' || fetchError.message?.includes('table') || fetchError.message?.includes('not found')) {
        console.warn('[Rate Limit] chat_rate_limits table not found, skipping rate limiting in dev');
        return; // Fail open - allow request to proceed
      }
      console.error('[Rate Limit] Fetch error:', fetchError);
      // Fail open - don't block user if rate limit check fails
      return;
    }

    // First request from this user - create new window
    if (!data) {
      try {
        const { error: insertError } = await supabase
          .from('chat_rate_limits')
          .insert({ 
            user_id: userId, 
            window_start: now.toISOString(), 
            count: 1 
          });

        if (insertError) {
          if (insertError.code === 'PGRST205' || insertError.message?.includes('table') || insertError.message?.includes('not found')) {
            console.warn('[Rate Limit] chat_rate_limits table not found, skipping rate limiting in dev');
            return;
          }
          console.error('[Rate Limit] Insert error:', insertError);
          // Fail open
        }
      } catch (err: any) {
        if (err.code === 'PGRST205' || err.message?.includes('table') || err.message?.includes('not found')) {
          console.warn('[Rate Limit] chat_rate_limits table not found, skipping rate limiting in dev');
          return;
        }
        throw err;
      }
      return;
    }

    // Calculate elapsed time since window start
    const start = new Date(data.window_start);
    const elapsed = now.getTime() - start.getTime();

    // Window expired - reset with new window
    if (elapsed > windowMs) {
      try {
        const { error: resetError } = await supabase
          .from('chat_rate_limits')
          .update({ 
            window_start: now.toISOString(), 
            count: 1 
          })
          .eq('user_id', userId);

        if (resetError) {
          if (resetError.code === 'PGRST205' || resetError.message?.includes('table') || resetError.message?.includes('not found')) {
            console.warn('[Rate Limit] chat_rate_limits table not found, skipping rate limiting in dev');
            return;
          }
          console.error('[Rate Limit] Reset error:', resetError);
          // Fail open
        }
      } catch (err: any) {
        if (err.code === 'PGRST205' || err.message?.includes('table') || err.message?.includes('not found')) {
          console.warn('[Rate Limit] chat_rate_limits table not found, skipping rate limiting in dev');
          return;
        }
        throw err;
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
    try {
      const { error: updateError } = await supabase
        .from('chat_rate_limits')
        .update({ count: data.count + 1 })
        .eq('user_id', userId);

      if (updateError) {
        if (updateError.code === 'PGRST205' || updateError.message?.includes('table') || updateError.message?.includes('not found')) {
          console.warn('[Rate Limit] chat_rate_limits table not found, skipping rate limiting in dev');
          return;
        }
        console.error('[Rate Limit] Update error:', updateError);
        // Fail open
      }
    } catch (err: any) {
      if (err.code === 'PGRST205' || err.message?.includes('table') || err.message?.includes('not found')) {
        console.warn('[Rate Limit] chat_rate_limits table not found, skipping rate limiting in dev');
        return;
      }
      throw err;
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
  let data: any = null;
  let error: any = null;
  
  try {
    const result = await supabase
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


