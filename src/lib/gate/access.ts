// src/lib/gate/access.ts

import { supabaseAdmin } from "@/lib/supabase/admin";

export type AccessPassRecord = {
  id: string;
  userId: string;
  planId: string;
  paymentOrderId: string;
  status: string;
  startsAt: string;
  endsAt: string;
};

export function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}

interface AccessPassRow {
  id: unknown;
  user_id: unknown;
  plan_id: unknown;
  payment_order_id: unknown;
  status: unknown;
  starts_at: unknown;
  ends_at: unknown;
}

function toAccessPass(row: AccessPassRow): AccessPassRecord {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    planId: String(row.plan_id),
    paymentOrderId: String(row.payment_order_id),
    status: String(row.status),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
  };
}

/**
 * Idempotent grant for a one-time paid order.
 *
 * Rules:
 * - one payment_order creates one access_pass
 * - if the user already has active access, extend from the later ends_at
 * - duplicate verify/webhook calls return the existing pass
 */
/** End of access for a plan bought now: a fixed date (e.g. "Until GATE 2027") or N months after `startsAt`. */
export function planEnd(plan: { duration_months: number; ends_at?: string | null }, startsAt: Date): Date {
  return plan.ends_at ? new Date(plan.ends_at) : addMonths(startsAt, Number(plan.duration_months));
}

/** When the user's latest active access pass ends (null if none). */
export async function latestActiveEnd(userId: string, now = new Date()): Promise<Date | null> {
  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("access_passes")
    .select("ends_at")
    .eq("user_id", userId)
    .eq("status", "ACTIVE")
    .gt("ends_at", now.toISOString())
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`[gate/access] active access lookup failed: ${error.message}`);
  return data?.ends_at ? new Date(data.ends_at) : null;
}

export async function grantAccessForPaidOrder(args: {
  paymentOrderId: string;
  paymentId?: string | null;
}): Promise<AccessPassRecord> {
  const { data, error } = await supabaseAdmin.schema("gate").rpc("grant_access_for_order", {
    p_order_id: args.paymentOrderId,
    p_provider_payment_id: args.paymentId ?? null,
  });
  if (error) throw new Error(`[gate/access] grant failed: ${error.message}`);
  if (!data?.granted) {
    const reason = data?.reason ?? "UNKNOWN";
    if (reason === "NO_TIME_TO_ADD") {
      console.error("[gate/access] NO_TIME_TO_ADD: captured payment needs a manual refund", args.paymentOrderId);
    }
    throw new AccessGrantError(reason);
  }
  return toAccessPass(data.pass);
}

export class AccessGrantError extends Error {
  constructor(public readonly reason: string) {
    super(reason === "NO_TIME_TO_ADD"
      ? "This payment adds no access time. A manual refund is required; please contact support."
      : `Access cannot be granted: ${reason}`);
  }
}

/** Refund and close gaps between stacked passes in one transaction. */
export async function revokeAccessForRefundedOrder(paymentOrderId: string): Promise<void> {
  const { error } = await supabaseAdmin.schema("gate").rpc("revoke_access_for_order", {
    p_order_id: paymentOrderId,
  });
  if (error) throw new Error(`[gate/access] refund failed: ${error.message}`);
}
