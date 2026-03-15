// services/gate-worker/src/sweeper.ts
// Orphan sweeper: finalize attempts stuck IN_PROGRESS after ends_at + 5s

import type Redis from "ioredis";
import type { SupabaseClient } from "@supabase/supabase-js";
import { finalizeAttempt } from "./finalize";

/**
 * Find and finalize all attempts that are:
 * - status = 'IN_PROGRESS'
 * - ends_at < now - 5 seconds
 *
 * This prevents permanent lockouts under the "1 active attempt" constraint.
 * Runs every 1-2 minutes.
 */
export async function sweepExpiredAttempts(
  redis: Redis,
  supabase: SupabaseClient
): Promise<void> {
  const cutoff = new Date(Date.now() - 5000).toISOString(); // now - 5s

  const { data: orphans, error } = await supabase
    .from("gate.attempts" as any)
    .select("id, user_id, ends_at, submitted_at")
    .eq("status", "IN_PROGRESS")
    .lt("ends_at", cutoff)
    .limit(50); // Process in batches

  if (error) {
    console.error("[sweeper] Query error:", error);
    return;
  }

  if (!orphans || orphans.length === 0) {
    return;
  }

  console.log(`[sweeper] Found ${orphans.length} orphaned attempts to finalize`);

  for (const attempt of orphans) {
    try {
      // Set submitted_at if missing
      if (!attempt.submitted_at) {
        await supabase
          .from("gate.attempts" as any)
          .update({ submitted_at: new Date().toISOString() })
          .eq("id", attempt.id);
      }

      // Drain any remaining Redis answers to Postgres before grading
      const sessionRaw = await redis.get(`lm:attempt:${attempt.id}`);
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        const committed = session.committed ?? {};

        for (const [qvId, answer] of Object.entries(committed)) {
          const a = answer as any;
          await supabase
            .from("gate.attempt_answers" as any)
            .upsert({
              attempt_id: attempt.id,
              question_version_id: qvId,
              selected_option_ids: a.selectedOptionIds ?? null,
              nat_value_raw: a.natRaw ?? null,
              nat_value_normalized: a.natNormalized ?? null,
              saved_at: a.savedAt ?? new Date().toISOString(),
            }, { onConflict: "attempt_id,question_version_id" });
        }
      }

      // Finalize grading
      await finalizeAttempt(attempt.id, redis, supabase);

      console.log(`[sweeper] Finalized orphan attempt ${attempt.id}`);
    } catch (err) {
      console.error(`[sweeper] Failed to finalize attempt ${attempt.id}:`, err);
    }
  }

  // Also sweep expired demo attempts (cleanup job)
  await sweepExpiredDemos(supabase);
}

/**
 * Clean up expired demo attempts (expires_at < now).
 * Deletes demo attempt data to prevent DB bloat.
 */
async function sweepExpiredDemos(supabase: SupabaseClient): Promise<void> {
  const now = new Date().toISOString();

  const { data: expired } = await supabase
    .from("gate.attempts" as any)
    .select("id")
    .eq("mode", "DEMO")
    .lt("expires_at", now)
    .limit(50);

  if (!expired || expired.length === 0) return;

  console.log(`[sweeper] Cleaning up ${expired.length} expired demo attempts`);

  for (const demo of expired) {
    // Cascade delete handles child records
    await supabase
      .from("gate.attempts" as any)
      .delete()
      .eq("id", demo.id);
  }
}
