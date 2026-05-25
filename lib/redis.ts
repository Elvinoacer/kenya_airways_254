/**
 * Small Redis helper that lazily requires a Redis client (ioredis).
 * If `ioredis` is not installed, `getRedis()` returns null and callers
 * should gracefully fall back to in-memory caching.
 */
let redisClient: any = null;

export function getRedis(): any {
  if (redisClient) return redisClient;
  try {
    // eslint-disable-next-line no-eval
    const IORedis: any = eval("require")("ioredis");
    const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
    redisClient = new IORedis(url);
  } catch (err) {
    // ioredis not installed — keep warning but do not throw
    // eslint-disable-next-line no-console
    console.warn(
      "ioredis not available. Install ioredis to enable Redis caching.",
    );
    redisClient = null;
  }
  return redisClient;
}

export default getRedis;
