// src/lib/gate/redis.ts
// Redis key schema + optimistic-concurrency update helpers for GATE attempt sessions

import "server-only";
import Redis from "ioredis";
import type { AttemptSession, AttemptEvent } from "./contracts";
import { casUpdate, RATE_SCRIPT } from "./redis-cas";

// Singleton Redis client
let redisClient: Redis | null = null;

function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL || process.env.GATE_REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL (or GATE_REDIS_URL) environment variable is required");
    }

    redisClient = new Redis(url, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        return Math.min(times * 100, 3000);
      },
    });
  }

  return redisClient;
}

// ============================================================================
// KEY NAMING
// ============================================================================

/** Canonical attempt session key */
function attemptKey(attemptId: string): string {
  return `lm:attempt:${attemptId}`;
}

/** Event stream key */
const ATTEMPT_EVENTS_STREAM = "lm:attempt_events";

// ============================================================================
// SESSION OPERATIONS
// ============================================================================

/**
 * Store an attempt session in Redis with TTL.
 * TTL = duration_seconds + 6 hours (survives transient outages).
 */
export async function setAttemptSession(
  session: AttemptSession,
  durationSeconds: number
): Promise<void> {
  const redis = getRedis();
  const key = attemptKey(session.attemptId);
  const ttl = durationSeconds + 6 * 3600;

  await redis.set(key, JSON.stringify(session), "EX", ttl);
}

/**
 * Retrieve an attempt session from Redis.
 * Returns null if not found.
 */
export async function getAttemptSession(
  attemptId: string
): Promise<AttemptSession | null> {
  const redis = getRedis();
  const raw = await redis.get(attemptKey(attemptId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AttemptSession;
  } catch (err) {
    console.error("[gate/redis] Failed to parse attempt session", {
      attemptId,
      err,
    });
    throw new Error("Corrupted attempt session in Redis");
  }
}

/**
 * Atomically update an attempt session (compare-and-swap in a Lua script; see redis-cas.ts).
 * The updater may run more than once if another request changed the session meanwhile, so it must only
 * modify the session it is given. Returns the updated session, or null if the session does not exist.
 */
export async function atomicUpdateSession(
  attemptId: string,
  updater: (session: AttemptSession) => AttemptSession
): Promise<AttemptSession | null> {
  return casUpdate<AttemptSession>(getRedis(), attemptKey(attemptId), (session) => {
    const updated = updater(session);
    updated.versionCounter = (updated.versionCounter ?? 0) + 1;
    return updated;
  });
}

/**
 * Fixed-window rate limit. Returns true if this hit is allowed (at most `limit` hits per `windowSeconds`
 * for `bucket` + `id`). Fails open: if Redis is unreachable, the request is allowed.
 */
export async function rateLimit(bucket: string, id: string, limit: number, windowSeconds: number): Promise<boolean> {
  try {
    const n = Number(await getRedis().eval(RATE_SCRIPT, 1, `lm:rl:${bucket}:${id}`, String(windowSeconds)));
    return n <= limit;
  } catch (err) {
    console.error("[gate/redis] rate limit check failed; allowing", { bucket, err });
    return true;
  }
}

/**
 * Delete an attempt session from Redis.
 */
export async function deleteAttemptSession(attemptId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(attemptKey(attemptId));
}

// ============================================================================
// EVENT STREAM
// ============================================================================

/**
 * Emit an event to the attempt event stream for worker drain.
 */
export async function emitAttemptEvent(event: AttemptEvent): Promise<void> {
  const redis = getRedis();

  await redis.xadd(
    ATTEMPT_EVENTS_STREAM,
    "*",
    "eventId", event.eventId,
    "attemptId", event.attemptId,
    "userId", event.userId ?? "",
    "type", event.type,
    "occurredAt", event.occurredAt,
    "payload", JSON.stringify(event.payload)
  );
}
