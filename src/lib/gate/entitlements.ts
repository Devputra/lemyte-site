// src/lib/gate/entitlements.ts

import { supabaseAdmin } from "@/lib/supabase/admin";

export type EntitlementAction =
  | "START_ATTEMPT"
  | "VIEW_REPORT"
  | "VIEW_SOLUTIONS";

export interface EntitlementResult {
  allowed: boolean;
  reason?: string;
  accessPass?: {
    id: string;
    planId: string | null;
    startsAt: string | null;
    endsAt: string | null;
  };
}

export async function checkEntitlement(
  userId: string,
  _action: EntitlementAction
): Promise<EntitlementResult> {
  const nowIso = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("access_passes")
    .select("id, status, plan_id, starts_at, ends_at")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .gt("ends_at", nowIso)
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[gate/entitlements] access_pass lookup failed", {
      userId,
      error,
    });

    return {
      allowed: false,
      reason: "Could not verify access right now. Please retry in a moment.",
    };
  }

  if (!data) {
    return {
      allowed: false,
      reason: "No active plan found. Please purchase access to continue.",
    };
  }

  if (data.starts_at && new Date(data.starts_at) > new Date()) {
    return {
      allowed: false,
      reason: "Your plan has not started yet.",
    };
  }

  return {
    allowed: true,
    accessPass: {
      id: data.id as string,
      planId: (data.plan_id as string | null) ?? null,
      startsAt: (data.starts_at as string | null) ?? null,
      endsAt: (data.ends_at as string | null) ?? null,
    },
  };
}

export async function getActiveAttempt(
  userId: string
): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("attempts")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("status", "IN_PROGRESS")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[gate/entitlements] getActiveAttempt failed", {
      userId,
      error,
    });
    return null;
  }

  return (data?.id as string | undefined) ?? null;
}

export async function checkRetentionCap(
  userId: string
): Promise<{ exceeded: boolean; deleteAttemptId?: string }> {
  const { count, error } = await supabaseAdmin
    .schema("gate")
    .from("attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  if (error) {
    console.error("[gate/entitlements] checkRetentionCap count failed", {
      userId,
      error,
    });
    return { exceeded: false };
  }

  if (count === null || count < 100) {
    return { exceeded: false };
  }

  const { data: oldestPractice, error: oldestErr } = await supabaseAdmin
    .schema("gate")
    .from("attempts")
    .select("id, created_at")
    .eq("user_id", userId)
    .eq("mode", "PRACTICE")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (oldestErr) {
    console.error(
      "[gate/entitlements] checkRetentionCap oldest practice lookup failed",
      { userId, error: oldestErr }
    );
    return { exceeded: true };
  }

  if (!oldestPractice) {
    return { exceeded: true };
  }

  return {
    exceeded: true,
    deleteAttemptId: oldestPractice.id as string,
  };
}

export async function hasCountedRankedAttempt(
  userId: string,
  testVersionId: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("attempts")
    .select("id")
    .eq("user_id", userId)
    .eq("test_version_id", testVersionId)
    .eq("mode", "RANKED")
    .in("status", ["SUBMITTED", "EXPIRED"])
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[gate/entitlements] hasCountedRankedAttempt failed", {
      userId,
      testVersionId,
      error,
    });
    return true;
  }

  return !!data;
}
