/**
 * Shared Redis (Upstash) accessor for Netlify functions.
 *
 * Gated on REDIS_ENABLED env var. When REDIS_ENABLED !== 'true', getRedis()
 * returns null and ALL callers are expected to guard their usage:
 *
 *   const redis = await getRedis();
 *   if (redis) { await redis.set(key, value); }
 *
 * This makes it safe to disable Redis entirely without ripping out call
 * sites or uninstalling @upstash/redis. Re-enable by setting
 * REDIS_ENABLED=true in the environment.
 */

export const isRedisEnabled = process.env.REDIS_ENABLED === 'true';

let redisInstance: any = null;

export async function getRedis(): Promise<any | null> {
  if (!isRedisEnabled) return null;
  if (redisInstance) return redisInstance;

  const { Redis } = await import('@upstash/redis');
  redisInstance = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return redisInstance;
}
