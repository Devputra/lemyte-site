// services/gate-worker/src/index.ts
// Event drain loop: Redis events → Postgres durability + finalize grading

import { createClient } from "@supabase/supabase-js";
import Redis from "ioredis";
import { finalizeAttempt } from "./finalize";
import { sweepExpiredAttempts } from "./sweeper";

const REDIS_URL = process.env.REDIS_URL!;
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EVENTS_STREAM = "lm:attempt_events";

if (!REDIS_URL || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars: REDIS_URL, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const redis = new Redis(REDIS_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let lastEventId = "0-0";

async function drainEvents() {
  while (true) {
    try {
      const result = await redis.xread(
        "COUNT", 200,
        "BLOCK", 5000,
        "STREAMS", EVENTS_STREAM, lastEventId
      );

      if (!result) continue;

      for (const [, entries] of result) {
        for (const [id, fieldArray] of entries) {
          const fields: Record<string, string> = {};
          for (let i = 0; i < fieldArray.length; i += 2) {
            fields[fieldArray[i]] = fieldArray[i + 1];
          }

          try {
            await processEvent(fields);
          } catch (err) {
            console.error(`[worker] Failed to process event ${id}:`, err);
          }

          lastEventId = id;
        }
      }
    } catch (err) {
      console.error("[worker] Drain loop error:", err);
      await sleep(1000);
    }
  }
}

async function processEvent(fields: Record<string, string>) {
  const type = fields.type;
  const attemptId = fields.attemptId;
  const payload = fields.payload ? JSON.parse(fields.payload) : {};

  switch (type) {
    case "HEARTBEAT": {
      // Upsert attempt_metadata with last_seen_at
      await supabase
        .from("gate.attempt_metadata" as any)
        .update({ /* last_seen_at would go here if column existed */ })
        .eq("attempt_id", attemptId);
      break;
    }

    case "ANSWER_COMMIT": {
      // Upsert answer to Postgres for durability
      if (payload.questionId) {
        const sessionRaw = await redis.get(`lm:attempt:${attemptId}`);
        if (sessionRaw) {
          const session = JSON.parse(sessionRaw);
          const committed = session.committed?.[payload.questionId];
          if (committed) {
            await supabase
              .from("gate.attempt_answers" as any)
              .upsert({
                attempt_id: attemptId,
                question_version_id: payload.questionId,
                selected_option_ids: committed.selectedOptionIds ?? null,
                nat_value_raw: committed.natRaw ?? null,
                nat_value_normalized: committed.natNormalized ?? null,
                saved_at: committed.savedAt ?? new Date().toISOString(),
              }, { onConflict: "attempt_id,question_version_id" });
          }
        }
      }
      break;
    }

    case "SUBMIT": {
      // Mark attempt as SUBMITTED in Postgres
      await supabase
        .from("gate.attempts" as any)
        .update({
          status: "SUBMITTED",
          submitted_at: fields.occurredAt ?? new Date().toISOString(),
        })
        .eq("id", attemptId)
        .eq("status", "IN_PROGRESS");

      // Finalize grading
      await finalizeAttempt(attemptId, redis, supabase);
      break;
    }

    case "INVALIDATE": {
      await supabase
        .from("gate.attempts" as any)
        .update({
          status: "INVALIDATED",
          invalidated_at: fields.occurredAt ?? new Date().toISOString(),
          invalidation_reason: payload.reason ?? "UNKNOWN",
        })
        .eq("id", attemptId);
      break;
    }

    case "PALETTE_UPDATE":
      // No Postgres write needed for palette-only updates
      break;

    default:
      console.warn(`[worker] Unknown event type: ${type}`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ========== MAIN ==========
async function main() {
  console.log("[gate-worker] Starting event drain loop...");

  // Start drain loop
  const drainPromise = drainEvents();

  // Start orphan sweeper (every 90 seconds)
  const sweeperInterval = setInterval(async () => {
    try {
      await sweepExpiredAttempts(redis, supabase);
    } catch (err) {
      console.error("[gate-worker] Sweeper error:", err);
    }
  }, 90_000);

  // Initial sweep on startup
  await sweepExpiredAttempts(redis, supabase);

  // Handle graceful shutdown
  process.on("SIGTERM", () => {
    console.log("[gate-worker] SIGTERM received, shutting down...");
    clearInterval(sweeperInterval);
    redis.disconnect();
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("[gate-worker] SIGINT received, shutting down...");
    clearInterval(sweeperInterval);
    redis.disconnect();
    process.exit(0);
  });

  await drainPromise;
}

main().catch((err) => {
  console.error("[gate-worker] Fatal error:", err);
  process.exit(1);
});
