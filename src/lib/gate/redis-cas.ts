// src/lib/gate/redis-cas.ts — compare-and-swap update of a JSON value in Redis.
//
// Read the value, apply the change in JS, then write it back only if the stored value is still exactly what we
// read (checked and written inside one Lua script, which Redis runs atomically). Unlike WATCH/MULTI this does not
// depend on connection state, so it is safe when many requests share one connection. The key's remaining TTL is kept.
import type Redis from "ioredis";

// KEYS[1] key · ARGV[1] value we read · ARGV[2] new value · ARGV[3] TTL (seconds) if the key has none
// Returns 1 written, 0 changed by someone else (retry), -1 key gone.
export const CAS_SCRIPT = `
local cur = redis.call('GET', KEYS[1])
if not cur then return -1 end
if cur ~= ARGV[1] then return 0 end
local ttl = redis.call('PTTL', KEYS[1])
if ttl > 0 then redis.call('SET', KEYS[1], ARGV[2], 'PX', ttl)
else redis.call('SET', KEYS[1], ARGV[2], 'EX', tonumber(ARGV[3])) end
return 1`;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Returns the stored new value, or null if the key does not exist. Throws after `retries` conflicts. */
export async function casUpdate<T>(
  redis: Redis,
  key: string,
  update: (value: T) => T,
  { retries = 30, defaultTtlSeconds = 7 * 3600 }: { retries?: number; defaultTtlSeconds?: number } = {},
): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    const raw = await redis.get(key);
    if (raw === null) return null;
    const next = update(JSON.parse(raw) as T);
    const res = Number(await redis.eval(CAS_SCRIPT, 1, key, raw, JSON.stringify(next), String(defaultTtlSeconds)));
    if (res === 1) return next;
    if (res === -1) return null;
    // Conflict: someone else wrote first. Back off (randomised, growing, capped) and re-read.
    await sleep(Math.random() * Math.min(250, 10 * 2 ** i));
  }
  throw new Error(`casUpdate: too many concurrent updates for ${key}`);
}

// Fixed-window counter: INCR, and set the expiry on the first hit of the window.
export const RATE_SCRIPT = `
local n = redis.call('INCR', KEYS[1])
if n == 1 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[1])) end
return n`;
