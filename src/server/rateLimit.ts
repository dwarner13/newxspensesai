import { Result, Ok, Err } from '../types/result';

interface RateLimitEntry {
  count: number;
  resetAt: number;
  burst: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  perMinute: number;
  burst: number;
}

export function checkRateLimit(
  userId: string,
  config: RateLimitConfig = { perMinute: 100, burst: 10 }
): Result<{ remaining: number; resetAt: number }> {
  const now = Date.now();
  const key = `user:${userId}`;
  
  let entry = rateLimitStore.get(key);
  
  // Clean up old entries
  if (entry && entry.resetAt < now) {
    rateLimitStore.delete(key);
    entry = undefined;
  }
  
  if (!entry) {
    entry = {
      count: 0,
      resetAt: now + 60000, // 1 minute
      burst: 0,
    };
    rateLimitStore.set(key, entry);
  }
  
  // Check burst limit
  if (entry.burst >= config.burst) {
    const waitTime = Math.ceil((entry.resetAt - now) / 1000);
    return Err(new Error(`Rate limit exceeded. Try again in ${waitTime} seconds`));
  }
  
  // Check per-minute limit
  if (entry.count >= config.perMinute) {
    return Err(new Error('Rate limit exceeded for this minute'));
  }
  
  // Update counts
  entry.count++;
  entry.burst++;
  
  // Reset burst after 1 second
  setTimeout(() => {
    const e = rateLimitStore.get(key);
    if (e) {
      e.burst = Math.max(0, e.burst - 1);
    }
  }, 1000);
  
  return Ok({
    remaining: config.perMinute - entry.count,
    resetAt: entry.resetAt,
  });
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Every minute
