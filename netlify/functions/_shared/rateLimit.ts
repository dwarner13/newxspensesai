import { Ratelimit } from "@upstash/ratelimit";
import { getRedis, isRedisEnabled } from "./redis.js";

// ─── Limiter config (no Redis instance yet - lazy-created) ──────────────────
// We keep these as opaque keys. `checkRateLimit` resolves them to real
// Ratelimit instances on first use, via getRedis(). When REDIS_ENABLED is
// false, the limiters are never instantiated and checkRateLimit fails open.

type LimiterKey = 'ai' | 'upload' | 'general';

interface LimiterConfig {
  key: LimiterKey;
  tokens: number;
  window: `${number} ${'s' | 'm' | 'h'}`;
  prefix: string;
}

const LIMITER_CONFIGS: Record<LimiterKey, LimiterConfig> = {
  // AI endpoints (expensive) - 20 requests per minute per user
  ai: { key: 'ai', tokens: 20, window: '1 m', prefix: 'xai:ai' },
  // Upload endpoints - 10 per minute per user
  upload: { key: 'upload', tokens: 10, window: '1 m', prefix: 'xai:upload' },
  // General endpoints - 60 per minute per user
  general: { key: 'general', tokens: 60, window: '1 m', prefix: 'xai:general' },
};

export const aiLimiter = LIMITER_CONFIGS.ai;
export const uploadLimiter = LIMITER_CONFIGS.upload;
export const generalLimiter = LIMITER_CONFIGS.general;

// Cache of materialized Ratelimit instances keyed by config.key.
const limiterInstances: Partial<Record<LimiterKey, Ratelimit>> = {};

async function resolveLimiter(cfg: LimiterConfig): Promise<Ratelimit | null> {
  if (!isRedisEnabled) return null;
  if (limiterInstances[cfg.key]) return limiterInstances[cfg.key]!;

  const redis = await getRedis();
  if (!redis) return null;

  const rl = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window),
    prefix: cfg.prefix,
  });
  limiterInstances[cfg.key] = rl;
  return rl;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export async function checkRateLimit(
  limiter: LimiterConfig,
  identifier: string
): Promise<RateLimitResult> {
  // Fail-open when Redis is disabled or unavailable - the app runs normally.
  const rl = await resolveLimiter(limiter);
  if (!rl) {
    return {
      allowed: true,
      limit: limiter.tokens,
      remaining: limiter.tokens,
      reset: Date.now() + 60_000,
    };
  }
  try {
    const { success, limit, remaining, reset } = await rl.limit(identifier);
    return { allowed: success, limit, remaining, reset };
  } catch {
    // If Redis throws at runtime, fail open rather than hard-blocking traffic.
    return {
      allowed: true,
      limit: limiter.tokens,
      remaining: limiter.tokens,
      reset: Date.now() + 60_000,
    };
  }
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
