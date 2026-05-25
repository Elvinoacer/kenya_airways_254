import getRedis from "./redis";

type InMemoryRecord = { count: number; expiry: number };
const memoryStore: Map<string, InMemoryRecord> = new Map();

export async function isAllowed(
  key: string,
  limit = 60,
  windowSeconds = 60,
): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    // use INCR with expiry
    const lua = `local current = redis.call('INCR', KEYS[1]); if current == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]); end; return current;`;
    try {
      const res = await redis.eval(lua, 1, key, windowSeconds);
      const count = Number(res);
      return count <= limit;
    } catch (e) {
      // fallthrough to memory
    }
  }

  // in-memory fallback (not suitable for multi-instance)
  const now = Date.now();
  const rec = memoryStore.get(key);
  if (!rec || rec.expiry < now) {
    memoryStore.set(key, { count: 1, expiry: now + windowSeconds * 1000 });
    return true;
  }
  rec.count += 1;
  memoryStore.set(key, rec);
  return rec.count <= limit;
}

export default { isAllowed };
