// src/lib/gate/entitlements.ts
// Subscription entitlement checks for GATE

import { supabaseAdmin } from "@/lib/supabase/admin";

export type EntitlementAction = "START_ATTEMPT" | "VIEW_REPORT" | "VIEW_SOLUTIONS";

interface EntitlementResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Check if a user has an active subscription that entitles them to perform the action.
 *
 * Rules:
 * - Active subscription required for START_ATTEMPT (ranked/practice) and VIEW_REPORT/SOLUTIONS
 * - Mid-test expiry: user is allowed to finish and submit, but report access is gated after exit
 * - Demo mode does NOT require subscription
 */
export async function checkEntitlement(
  userId: string,
  action: EntitlementAction
): Promise<EntitlementResult> {
  const { data, error } = await supabaseAdmin
    .from("gate.subscriptions" as any)
    .select("id, status, current_period_end")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[entitlements] Supabase error:", error);
    return { allowed: false, reason: "Failed to verify subscription status" };
  }

  if (!data) {
    return { allowed: false, reason: "No active subscription found" };
  }

  // Check if subscription period has ended
  const periodEnd = data.current_period_end
    ? new Date(data.current_period_end)
    : null;
  const now = new Date();

  if (periodEnd && now > periodEnd) {
    return {
      allowed: false,
      reason: "Subscription period has expired. Please renew to continue.",
    };
  }

  return { allowed: true };
}

/**
 * Check if a user has an active attempt in progress.
 * Returns the attempt ID if one exists, null otherwise.
 */
export async function getActiveAttempt(
  userId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("gate.attempts" as any)
    .select("id")
    .eq("user_id", userId)
    .eq("status", "IN_PROGRESS")
    .maybeSingle();

  if (error || !data) return null;
  return data.id;
}

/**
 * Check the 100-attempt retention cap for a user.
 * If exceeded, returns the ID of the oldest unranked practice attempt to delete.
 */
export async function checkRetentionCap(
  userId: string
): Promise<{ exceeded: boolean; deleteAttemptId?: string }> {
  const { count, error } = await supabaseAdmin
    .from("gate.attempts" as any)
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error || count === null || count < 100) {
    return { exceeded: false };
  }

  // Find oldest unranked practice attempt
  const { data: oldest } = await supabaseAdmin
    .from("gate.attempts" as any)
    .select("id")
    .eq("user_id", userId)
    .eq("mode", "PRACTICE")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!oldest) {
    return { exceeded: true }; // All attempts are ranked; cannot auto-delete
  }

  return { exceeded: true, deleteAttemptId: oldest.id };
}
