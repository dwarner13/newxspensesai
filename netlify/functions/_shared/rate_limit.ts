/**
 * 🚦 Rate Limiting Module
 * 
 * Simple per-user/IP rate limiting with in-memory fallback and Supabase persistence.
 * 
 * Usage:
 *   const result = await rateLimit({ key: `${userId}:${ip}`, limit: 30, windowMs: 60000 });
 *   if (!result.ok) {
 *     return { statusCode: 429, body: JSON.stringify({ error: 'rate_limited' }) };
 *   }
 */

import { admin } from './supabase';

// In-memory store fallback (cleared on server restart)
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitEntry>();

/**
 * Rate limit check
 * 
 * @param key - Unique identifier (typically `${userId}:${ip}`)
 * @param limit - Maximum requests allowed in window (default: 30)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns Rate limit result with ok status, remaining count, and reset timestamp
 */
export async function rateLimit({
  key,
  limit = 30,
  windowMs = 60000,
}: {
  key: string;
  limit?: number;
  windowMs?: number;
}): Promise<{ ok: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const resetAt = now + windowMs;

  // Try Supabase first (if available)
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseUrl && supabaseKey) {
    try {
      const sb = admin();

      // Check if table exists (idempotent create)
      // Note: In production, this table should be created via migration
      // For now, we'll try to use it and fall back to memory if it fails

      // Query existing entry
      const { data: existing } = await sb
        .from('rate_limits')
        .select('count, reset_at')
        .eq('key', key)
        .single();

      if (existing) {
        const resetAtTime = new Date(existing.reset_at).getTime();

        // If window expired, reset
        if (now >= resetAtTime) {
          // Reset counter
          await sb
            .from('rate_limits')
            .upsert({
              key,
              count: 1,
              reset_at: new Date(resetAt).toISOString(),
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'key',
            });

          return {
            ok: true,
            remaining: limit - 1,
            resetAt,
          };
        } else {
          // Increment counter
          const newCount = existing.count + 1;
          const ok = newCount <= limit;

          await sb
            .from('rate_limits')
            .update({
              count: newCount,
              updated_at: new Date().toISOString(),
            })
            .eq('key', key);

          return {
            ok,
            remaining: Math.max(0, limit - newCount),
            resetAt: resetAtTime,
          };
        }
      } else {
        // First request for this key
        await sb
          .from('rate_limits')
          .insert({
            key,
            count: 1,
            reset_at: new Date(resetAt).toISOString(),
            updated_at: new Date().toISOString(),
          });

        return {
          ok: true,
          remaining: limit - 1,
          resetAt,
        };
      }
    } catch (err: any) {
      // If table doesn't exist or other DB error, fall back to memory
      console.warn('[RateLimit] Supabase error, falling back to memory:', err.message);
      // Continue to memory fallback below
    }
  }

  // In-memory fallback
  const entry = memoryStore.get(key);

  if (!entry) {
    // First request
    memoryStore.set(key, { count: 1, resetAt });
    return {
      ok: true,
      remaining: limit - 1,
      resetAt,
    };
  }

  // Check if window expired
  if (now >= entry.resetAt) {
    // Reset counter
    memoryStore.set(key, { count: 1, resetAt });
    return {
      ok: true,
      remaining: limit - 1,
      resetAt,
    };
  }

  // Increment counter
  entry.count += 1;
  const ok = entry.count <= limit;

  return {
    ok,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Extract rate limit key from event (userId + IP)
 */
export function getRateLimitKey(event: any, userId?: string): string {
  const ip = event.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
             event.headers?.['x-real-ip'] ||
             event.requestContext?.identity?.sourceIp ||
             'unknown';
  
  const user = userId || event.headers?.['x-user-id'] || event.queryStringParameters?.userId || 'anonymous';
  
  return `${user}:${ip}`;
}

/**
 * Clean up expired entries from memory store (call periodically)
 */
export function cleanupMemoryStore(): void {
  const now = Date.now();
  for (const [key, entry] of memoryStore.entries()) {
    if (now >= entry.resetAt) {
      memoryStore.delete(key);
    }
  }
}

