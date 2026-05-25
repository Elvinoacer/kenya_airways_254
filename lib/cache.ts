import { LRUCache } from "lru-cache";

let redisClient: any = null;
try {
  // lazy require to avoid hard dependency at build time
  // eslint-disable-next-line no-eval
  const IORedis: any = eval("require")("ioredis");
  const url = process.env.REDIS_URL || "redis://127.0.0.1:6379";
  redisClient = new IORedis(url);
} catch (e) {
  redisClient = null;
}

const memoryCache = new LRUCache<string, { value: any; expiresAt: number }>({
  max: 5000,
});

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  if (redisClient) {
    const v = await redisClient.get(key);
    if (!v) return null;
    try {
      return JSON.parse(v) as T;
    } catch (e) {
      return null;
    }
  }
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds = 60,
): Promise<void> {
  if (redisClient) {
    await redisClient.set(key, JSON.stringify(value), "EX", ttlSeconds);
    return;
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  if (redisClient) {
    await redisClient.del(key);
    return;
  }
  memoryCache.delete(key);
}

// Locks
const localLocks = new Map<
  string,
  { token: string; timeout: NodeJS.Timeout }
>();

function randomToken() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function acquireLock(
  key: string,
  ttlMs = 5000,
): Promise<string | null> {
  if (redisClient) {
    const token = randomToken();
    const res = await redisClient.set(key, token, "NX", "PX", ttlMs);
    if (res === "OK") return token;
    return null;
  }
  if (!localLocks.has(key)) {
    const token = randomToken();
    const timeout = setTimeout(() => localLocks.delete(key), ttlMs + 50);
    localLocks.set(key, { token, timeout });
    return token;
  }
  return null;
}

export async function releaseLock(key: string, token: string): Promise<void> {
  if (redisClient) {
    const lua = `if redis.call('get',KEYS[1]) == ARGV[1] then return redis.call('del',KEYS[1]) else return 0 end`;
    try {
      await redisClient.eval(lua, 1, key, token);
    } catch (e) {
      /* ignore */
    }
    return;
  }
  const entry = localLocks.get(key);
  if (entry && entry.token === token) {
    clearTimeout(entry.timeout);
    localLocks.delete(key);
  }
}

export async function cacheGetOrSet<T = any>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached != null) return cached;
  const val = await fetcher();
  try {
    await cacheSet(key, val, ttlSeconds);
  } catch (e) {
    // ignore
  }
  return val;
}

export default {
  cacheGet,
  cacheSet,
  cacheGetOrSet,
  cacheDel,
  acquireLock,
  releaseLock,
};
