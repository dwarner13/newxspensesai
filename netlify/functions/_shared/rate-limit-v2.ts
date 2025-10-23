/**
 * 🚦 Advanced Rate Limiting (Token Bucket + Distributed Cache)
 *
 * Features:
 * - Token bucket algorithm (burst-safe, per-second refill)
 * - In-memory cache (fast local state for Netlify instances)
 * - Supabase fallback (for cross-instance consistency)
 * - Custom key function (user ID, IP, API key, etc.)
 * - Per-endpoint configuration
 * - Jitter support (prevent thundering herd)
 * - Monitoring & telemetry
 * - Graceful degradation on DB failure
 *
 * Algorithm:
 * - Tokens refill at: limitPerMinute / 60 tokens per second
 * - Max burst capacity: `burst` parameter
 * - Each request costs 1 token
 * - If tokens < 1, request rejected with 429
 *
 * Usage:
 *   const handler = withRateLimit(myHandler, {
 *     key: 'api-endpoint',
 *     limitPerMinute: 60,
 *     burst: 20,
 *     keyFn: (evt) => evt.headers['x-user-id'] || 'anon',
 *   });
 */

import { safeLog } from "./guardrail-log";

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitOptions {
  /** Endpoint name for logging & monitoring */
  key: string;

  /** Maximum requests per minute (sustained rate) */
  limitPerMinute: number;

  /** Burst capacity (max tokens in bucket) */
  burst: number;

  /** Function to extract rate limit key from event */
  keyFn?: (event: any) => string;

  /** Enable Supabase DB fallback for consistency */
  useDbFallback?: boolean;

  /** Jitter window (ms) to prevent thundering herd */
  jitterMs?: number;

  /** Custom error response */
  errorResponse?: (retryAfter: number) => any;

  /** Telemetry callback */
  onRateLimited?: (data: RateLimitEvent) => void;
}

export interface RateLimitEvent {
  key: string;
  id: string;
  endpoint: string;
  timestamp: number;
  tokensRemaining: number;
  retryAfter: number;
  source: "memory" | "db";
}

export interface TokenBucketState {
  tokens: number;
  ts: number;
  hits: number;
  lastHit: number;
}

// ============================================================================
// IN-MEMORY CACHE
// ============================================================================

class TokenBucketCache {
  private cache = new Map<string, TokenBucketState>();
  private cleanup: NodeJS.Timer | null = null;

  constructor(private cleanupIntervalMs: number = 300000) {
    // Auto-cleanup every 5 minutes
    this.startCleanup();
  }

  private startCleanup() {
    if (this.cleanup) clearInterval(this.cleanup);
    this.cleanup = setInterval(() => {
      const now = Date.now();
      const maxAge = 600000; // 10 minutes
      let cleaned = 0;

      for (const [key, state] of this.cache.entries()) {
        if (now - state.lastHit > maxAge) {
          this.cache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        safeLog("debug", "rate_limit_cache_cleanup", {
          cleaned,
          remaining: this.cache.size,
        });
      }
    }, this.cleanupIntervalMs);
  }

  get(key: string, now: number): TokenBucketState {
    return (
      this.cache.get(key) || {
        tokens: 0,
        ts: now,
        hits: 0,
        lastHit: now,
      }
    );
  }

  set(key: string, state: TokenBucketState) {
    state.lastHit = Date.now();
    this.cache.set(key, state);
  }

  destroy() {
    if (this.cleanup) clearInterval(this.cleanup);
    this.cache.clear();
  }

  getStats() {
    return {
      buckets: this.cache.size,
      entries: Array.from(this.cache.entries()).map(([k, v]) => ({
        key: k,
        tokens: v.tokens.toFixed(2),
        hits: v.hits,
      })),
    };
  }
}

const globalCache = new TokenBucketCache();

// ============================================================================
// RATE LIMIT CORE
// ============================================================================

/**
 * Check rate limit and update bucket state
 * Returns: [isAllowed, retryAfterSeconds, newState]
 */
export function checkTokenBucket(
  options: {
    limitPerMinute: number;
    burst: number;
    keyId: string;
  },
  now: number
): [boolean, number, TokenBucketState] {
  const { limitPerMinute, burst, keyId } = options;

  // Fetch current state
  const state = globalCache.get(keyId, now);

  // Refill tokens based on time elapsed
  const refillRate = limitPerMinute / 60; // tokens per second
  const elapsedSeconds = (now - state.ts) / 1000;
  const tokensToAdd = elapsedSeconds * refillRate;

  state.tokens = Math.min(burst, state.tokens + tokensToAdd);
  state.ts = now;

  // Check if we have tokens
  const isAllowed = state.tokens >= 1;

  if (isAllowed) {
    state.tokens -= 1;
    state.hits += 1;
  }

  // Calculate retry-after (when next token will be available)
  const retryAfterSeconds = isAllowed ? 0 : Math.ceil((1 - state.tokens) / refillRate);

  globalCache.set(keyId, state);

  return [isAllowed, retryAfterSeconds, state];
}

// ============================================================================
// SUPABASE FALLBACK (for cross-instance consistency)
// ============================================================================

async function checkTokenBucketDb(
  userId: string,
  endpointKey: string,
  options: { limitPerMinute: number; burst: number },
  now: number
): Promise<[boolean, number] | null> {
  try {
    const { serverSupabase } = await import("./supabase");
    const { supabase } = serverSupabase();

    // Try to fetch or create rate limit entry
    const { data, error } = await supabase
      .from("rate_limits")
      .select("*")
      .eq("user_id", userId)
      .eq("endpoint", endpointKey)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    const windowStart = new Date(now - 60000); // 1 minute window
    const isNewWindow = !data || new Date(data.window_start) < windowStart;

    if (isNewWindow) {
      // New window, reset counter
      await supabase.from("rate_limits").upsert(
        {
          user_id: userId,
          endpoint: endpointKey,
          window_start: new Date(now).toISOString(),
          count: 1,
        },
        { onConflict: "user_id,endpoint" }
      );
      return [true, 0];
    }

    const count = (data?.count || 0) + 1;
    const isAllowed = count <= options.limitPerMinute;

    // Update counter
    await supabase
      .from("rate_limits")
      .update({ count })
      .eq("user_id", userId)
      .eq("endpoint", endpointKey);

    const retryAfter = isAllowed
      ? 0
      : Math.ceil((60000 - (now - new Date(data.window_start).getTime())) / 1000);

    return [isAllowed, retryAfter];
  } catch (err) {
    safeLog("warn", "rate_limit_db_fallback_failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null; // Fall back to memory cache
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * HOC to add rate limiting to any Netlify handler
 *
 * @example
 * const handler = withRateLimit(
 *   async (event, context) => {
 *     return { statusCode: 200, body: 'OK' };
 *   },
 *   {
 *     key: 'my-endpoint',
 *     limitPerMinute: 60,
 *     burst: 20,
 *     keyFn: (evt) => evt.headers['x-user-id'] || 'anon',
 *   }
 * );
 */
export function withRateLimit(
  handler: (event: any, context: any) => Promise<any>,
  options: RateLimitOptions
): (event: any, context: any) => Promise<any> {
  const {
    key,
    limitPerMinute,
    burst,
    keyFn,
    useDbFallback = false,
    jitterMs = 0,
    errorResponse,
    onRateLimited,
  } = options;

  return async (event: any, context: any) => {
    try {
      const now = Date.now();

      // Extract rate limit key from event
      const keyId =
        keyFn?.(event) ||
        event?.headers?.["x-user-id"] ||
        event?.headers?.["x-api-key"] ||
        event?.headers?.["x-forwarded-for"] ||
        event?.ip ||
        "ip-unknown";

      const fullKeyId = `${key}:${keyId}`;

      // Check rate limit
      let isAllowed = false;
      let retryAfter = 0;
      let source: "memory" | "db" = "memory";

      // Try DB fallback first if enabled
      if (useDbFallback) {
        const dbResult = await checkTokenBucketDb(keyId, key, { limitPerMinute, burst }, now);
        if (dbResult) {
          [isAllowed, retryAfter] = dbResult;
          source = "db";
        } else {
          // Fall back to memory cache
          const [allowed, retry, state] = checkTokenBucket(
            { limitPerMinute, burst, keyId: fullKeyId },
            now
          );
          [isAllowed, retryAfter] = [allowed, retry];
          source = "memory";
        }
      } else {
        // Use memory cache only
        const [allowed, retry, state] = checkTokenBucket(
          { limitPerMinute, burst, keyId: fullKeyId },
          now
        );
        [isAllowed, retryAfter] = [allowed, retry];
      }

      // If rate limited
      if (!isAllowed) {
        safeLog("warn", "rate_limit_exceeded", {
          endpoint: key,
          keyId,
          limitPerMinute,
          retryAfter,
          source,
        });

        // Emit telemetry
        onRateLimited?.({
          key: fullKeyId,
          id: keyId,
          endpoint: key,
          timestamp: now,
          tokensRemaining: 0,
          retryAfter,
          source,
        });

        // Custom error response or default 429
        const response = errorResponse?.(retryAfter) || {
          statusCode: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(limitPerMinute),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(now / 1000) + retryAfter),
          },
          body: JSON.stringify({
            ok: false,
            error: "Rate limit exceeded",
            retryAfter,
            limitPerMinute,
          }),
        };

        return response;
      }

      // Apply jitter if configured
      if (jitterMs > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * jitterMs)
        );
      }

      // Call handler
      const result = await handler(event, context);

      // Add rate limit headers to response
      return {
        ...result,
        headers: {
          ...result?.headers,
          "X-RateLimit-Limit": String(limitPerMinute),
          "X-RateLimit-Remaining": String(Math.max(0, burst - 1)),
          "X-RateLimit-Reset": String(Math.ceil(now / 1000) + 60),
        },
      };
    } catch (err) {
      safeLog("error", "rate_limit_middleware_error", {
        endpoint: key,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  };
}

// ============================================================================
// MONITORING & STATS
// ============================================================================

/**
 * Get current rate limit cache statistics
 */
export function getRateLimitStats() {
  return globalCache.getStats();
}

/**
 * Manually reset a rate limit bucket (for testing or admin)
 */
export function resetRateLimitBucket(keyId: string) {
  const now = Date.now();
  globalCache.set(keyId, {
    tokens: 0,
    ts: now,
    hits: 0,
    lastHit: now,
  });
  safeLog("info", "rate_limit_reset", { keyId });
}

/**
 * Destroy global cache (cleanup on Netlify cold start, testing)
 */
export function destroyRateLimitCache() {
  globalCache.destroy();
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const RateLimitPresets = {
  /** Relaxed: 600 reqs/min, 100 burst */
  relaxed: {
    limitPerMinute: 600,
    burst: 100,
  },

  /** Normal: 60 reqs/min, 20 burst */
  normal: {
    limitPerMinute: 60,
    burst: 20,
  },

  /** Strict: 20 reqs/min, 5 burst */
  strict: {
    limitPerMinute: 20,
    burst: 5,
  },

  /** Tight: 10 reqs/min, 2 burst */
  tight: {
    limitPerMinute: 10,
    burst: 2,
  },

  /** Chat: 20 reqs/min, 10 burst (OpenAI calls can't be burst too much) */
  chat: {
    limitPerMinute: 20,
    burst: 10,
  },

  /** Auth: 10 reqs/min, 3 burst (security-sensitive) */
  auth: {
    limitPerMinute: 10,
    burst: 3,
  },

  /** Export/Report: 5 reqs/min, 2 burst (expensive operations) */
  export: {
    limitPerMinute: 5,
    burst: 2,
  },

  /** Analytics: 30 reqs/min, 10 burst */
  analytics: {
    limitPerMinute: 30,
    burst: 10,
  },
};

// ============================================================================
// TYPES
// ============================================================================

export type RateLimitPresetKey = keyof typeof RateLimitPresets;

export function getPresetOptions(
  preset: RateLimitPresetKey
): Pick<RateLimitOptions, "limitPerMinute" | "burst"> {
  return RateLimitPresets[preset];
}





