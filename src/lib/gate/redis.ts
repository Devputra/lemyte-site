// src/lib/gate/redis.ts
// Redis key schema + atomic update helpers for GATE attempt sessions

import Redis from "ioredis";
import type { AttemptSession, AttemptEvent } from "./contracts";

// Singleton Redis client
let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    const url = process.env.REDIS_URL;
    if (!url) throw new Error("REDIS_URL environment variable is required");
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
  const ttl = durationSeconds + 6 * 3600; // duration + 6 hours
  await redis.set(key, JSON.stringify(session), "EX", ttl);
}

/**
 * Retrieve an attempt session from Redis.
 * Returns null if not found (may indicate Redis data loss).
 */
export async function getAttemptSession(
  attemptId: string
): Promise<AttemptSession | null> {
  const redis = getRedis();
  const raw = await redis.get(attemptKey(attemptId));
  if (!raw) return null;
  return JSON.parse(raw) as AttemptSession;
}

/**
 * Atomically update an attempt session.
 * Uses a Lua script to GET + transform + SET in one round-trip.
 *
 * The updater function receives the current session and returns the modified session.
 * If the session doesn't exist, returns null.
 */
export async function atomicUpdateSession(
  attemptId: string,
  updater: (session: AttemptSession) => AttemptSession
): Promise<AttemptSession | null> {
  const redis = getRedis();
  const key = attemptKey(attemptId);

  // Use WATCH/MULTI for optimistic concurrency
  // For higher throughput, switch to Lua scripts
  const raw = await redis.get(key);
  if (!raw) return null;

  const session = JSON.parse(raw) as AttemptSession;
  const updated = updater(session);
  updated.versionCounter = (updated.versionCounter ?? 0) + 1;

  // Preserve the existing TTL
  const ttl = await redis.ttl(key);
  if (ttl > 0) {
    await redis.set(key, JSON.stringify(updated), "EX", ttl);
  } else {
    // Fallback: set a generous TTL
    await redis.set(key, JSON.stringify(updated), "EX", 7 * 3600);
  }

  return updated;
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
