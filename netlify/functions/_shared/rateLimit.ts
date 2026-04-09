import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Initialize Redis client from env vars
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Different limiters for different endpoint costs
// AI endpoints (expensive) — 20 requests per minute per user
export const aiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  prefix: "xai:ai",
});

// Upload endpoints — 10 per minute per user
export const uploadLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "xai:upload",
});

// General endpoints — 60 per minute per user
export const generalLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"),
  prefix: "xai:general",
});

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string
): Promise<RateLimitResult> {
  const { success, limit, remaining, reset } = await limiter.limit(identifier);
  return { allowed: success, limit, remaining, reset };
}

// Standard rate limit exceeded response
export function rateLimitResponse(result: RateLimitResult) {
  return {
    statusCode: 429,
    headers: {
      "Content-Type": "application/json",
      "X-RateLimit-Limit": String(result.limit),
      "X-RateLimit-Remaining": String(result.remaining),
      "X-RateLimit-Reset": String(result.reset),
      "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
    },
    body: JSON.stringify({
      error: "Too many requests. Please slow down.",
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
    }),
  };
}