// src/lib/gate/redis.ts
// Redis key schema + optimistic-concurrency update helpers for GATE attempt sessions

import "server-only";
import Redis from "ioredis";
import type { AttemptSession, AttemptEvent } from "./contracts";

// Singleton Redis client
let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error("REDIS_URL environment variable is required");
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
export function attemptKey(attemptId: string): string {
  return `lm:attempt:${attemptId}`;
}

/** Event stream key */
export const ATTEMPT_EVENTS_STREAM = "lm:attempt_events";

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
 * Optimistically update an attempt session with WATCH/MULTI.
 *
 * This is not as strong as a Lua script, but it is materially safer than
 * plain GET -> SET and good enough for MVP traffic.
 *
 * Returns:
 * - updated session on success
 * - null if session does not exist
 *
 * Throws if repeated write conflicts occur.
 */
export async function atomicUpdateSession(
  attemptId: string,
  updater: (session: AttemptSession) => AttemptSession
): Promise<AttemptSession | null> {
  const redis = getRedis();
  const key = attemptKey(attemptId);
  const MAX_RETRIES = 5;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    await redis.watch(key);

    const raw = await redis.get(key);
    if (!raw) {
      await redis.unwatch();
      return null;
    }

    let session: AttemptSession;
    try {
      session = JSON.parse(raw) as AttemptSession;
    } catch (err) {
      await redis.unwatch();
      console.error("[gate/redis] Failed to parse session during atomic update", {
        attemptId,
        err,
      });
      throw new Error("Corrupted attempt session in Redis");
    }

    const updated = updater(session);
    updated.versionCounter = (updated.versionCounter ?? 0) + 1;

    const ttl = await redis.ttl(key);
    const nextTtl = ttl > 0 ? ttl : 7 * 3600;

    const multi = redis.multi();
    multi.set(key, JSON.stringify(updated), "EX", nextTtl);

    const execResult = await multi.exec();

    // execResult === null means watched key changed before commit
    if (execResult !== null) {
      return updated;
    }

    // Conflict: retry
    console.warn("[gate/redis] atomicUpdateSession retry due to concurrent modification", {
      attemptId,
      retry: attempt,
    });
  }

  throw new Error("Failed to update attempt session after concurrent retries");
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

/**
 * Read events from the stream (for worker consumption).
 */
export async function readEvents(
  lastId: string,
  count: number = 200,
  blockMs: number = 5000
): Promise<Array<{ id: string; fields: Record<string, string> }>> {
  const redis = getRedis();

  const result = await redis.xread(
    "COUNT", count,
    "BLOCK", blockMs,
    "STREAMS", ATTEMPT_EVENTS_STREAM, lastId
  );

  if (!result) return [];

  const events: Array<{ id: string; fields: Record<string, string> }> = [];

  for (const [, entries] of result) {
    for (const [id, fieldArray] of entries) {
      const fields: Record<string, string> = {};

      for (let i = 0; i < fieldArray.length; i += 2) {
        fields[fieldArray[i]] = fieldArray[i + 1];
      }

      events.push({ id, fields });
    }
  }

  return events;
}
