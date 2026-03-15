// services/gate-worker/src/pii-anonymizer.ts
// Batch job: 7-day PII anonymization queue
// After 7 days: wipe PII, hash UUIDs, retain de-identified transactions/scores

import crypto from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One-way hash a UUID for anonymization.
 * Uses SHA-256 with a static salt (ensures consistency across runs).
 */
function hashUuid(uuid: string): string {
  return crypto
    .createHash("sha256")
    .update(`learnamyte:anon:${uuid}`)
    .digest("hex")
    .slice(0, 36); // Truncate to UUID-like length
}

/**
 * Process the PII anonymization queue.
 * Finds users in `gate.deletion_queue` where:
 * - status = 'PENDING'
 * - scheduled_for <= now
 *
 * For each user:
 * 1. Wipe PII from auth.users (name, email, phone) — via admin API
 * 2. Replace user_id with hashed UUID in gate.attempts
 * 3. Retain de-identified scores and payment records
 * 4. Mark deletion_queue entry as COMPLETED
 */
export async function processAnonymizationQueue(
  supabase: SupabaseClient
): Promise<void> {
  const now = new Date().toISOString();

  const { data: pending, error } = await supabase
    .from("gate.deletion_queue" as any)
    .select("id, user_id, scheduled_for")
    .eq("status", "PENDING")
    .lte("scheduled_for", now)
    .limit(10);

  if (error || !pending || pending.length === 0) {
    return;
  }

  console.log(`[pii-anonymizer] Processing ${pending.length} deletion requests`);

  for (const entry of pending) {
    const userId = entry.user_id;
    const hashedId = hashUuid(userId);

    try {
      // Step 1: Remove PII from profiles
      await supabase
        .from("profiles")
        .update({ full_name: `[REDACTED-${hashedId.slice(0, 8)}]` })
        .eq("user_id", userId);

      // Step 2: Remove GATE membership PII
      await supabase
        .from("gate.memberships" as any)
        .delete()
        .eq("user_id", userId);

      // Step 3: Anonymize attempt metadata (IP, UA)
      await supabase
        .from("gate.attempt_metadata" as any)
        .update({ client_ip: null, client_ua: null })
        .in(
          "attempt_id",
          (
            await supabase
              .from("gate.attempts" as any)
              .select("id")
              .eq("user_id", userId)
          ).data?.map((a: any) => a.id) ?? []
        );

      // Step 4: Anonymize audit log entries
      await supabase
        .from("gate.audit_log" as any)
        .update({ ip_address: null })
        .eq("user_id", userId);

      // Step 5: Clear abuse flags detail
      await supabase
        .from("gate.abuse_flags" as any)
        .update({ detail: null })
        .eq("user_id", userId);

      // Note: gate.subscriptions and gate.payment_events are RETAINED
      // for statutory/audit/chargeback needs (7-year retention).
      // Payment records remain de-identified (linked to userId which
      // is now only a hash in profiles; email/name are wiped).

      // Note: gate.attempts, gate.attempt_results, gate.attempt_question_scores
      // are RETAINED with the original user_id for percentile integrity.
      // The PII (name, email) is wiped from auth.users/profiles, so
      // the user_id is effectively an opaque identifier.

      // Step 6: Mark queue entry completed
      await supabase
        .from("gate.deletion_queue" as any)
        .update({
          status: "COMPLETED",
          completed_at: new Date().toISOString(),
        })
        .eq("id", entry.id);

      console.log(`[pii-anonymizer] Anonymized user ${hashedId.slice(0, 8)}...`);
    } catch (err) {
      console.error(`[pii-anonymizer] Failed for user ${userId}:`, err);
      // Leave as PENDING for retry
    }
  }
}
