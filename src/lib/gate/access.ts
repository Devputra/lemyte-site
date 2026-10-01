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
  const existing = await supabaseAdmin
    .schema("gate")
    .from("access_passes")
    .select("id, user_id, plan_id, payment_order_id, status, starts_at, ends_at")
    .eq("payment_order_id", args.paymentOrderId)
    .maybeSingle();

  if (existing.error) {
    throw new Error(
      `[gate/access] existing access_pass lookup failed: ${existing.error.message}`
    );
  }

  if (existing.data) {
    // Make sure payment order is also marked CAPTURED if this was a webhook/verify race.
    await supabaseAdmin
      .schema("gate")
      .from("payment_orders")
      .update({
        status: "CAPTURED",
        provider_payment_id: args.paymentId ?? undefined,
        updated_at: new Date().toISOString(),
      })
      .eq("id", args.paymentOrderId);

    return toAccessPass(existing.data);
  }

  const ordRes = await supabaseAdmin
    .schema("gate")
    .from("payment_orders")
    .select("id, user_id, plan_id, status")
    .eq("id", args.paymentOrderId)
    .maybeSingle();

  if (ordRes.error) {
    throw new Error(
      `[gate/access] payment_order lookup failed: ${ordRes.error.message}`
    );
  }
  if (!ordRes.data) {
    throw new Error("[gate/access] payment_order not found");
  }

  const order = ordRes.data;

  const planRes = await supabaseAdmin
    .schema("gate")
    .from("plans")
    .select("id, duration_months, ends_at")
    .eq("id", order.plan_id)
    .single();

  if (planRes.error || !planRes.data) {
    throw new Error(
      `[gate/access] plan lookup failed: ${planRes.error?.message ?? "missing plan"}`
    );
  }

  const now = new Date();

  // Extend from existing active pass if present.
  const currentEnd = await latestActiveEnd(order.user_id, now);
  const startsAt = currentEnd && currentEnd > now ? currentEnd : now;
  const endsAt = planEnd(planRes.data, startsAt);

  const markOrder = await supabaseAdmin
    .schema("gate")
    .from("payment_orders")
    .update({
      status: "CAPTURED",
      provider_payment_id: args.paymentId ?? undefined,
      updated_at: now.toISOString(),
    })
    .eq("id", order.id);

  if (markOrder.error) {
    throw new Error(
      `[gate/access] payment_order update failed: ${markOrder.error.message}`
    );
  }

  const insertRes = await supabaseAdmin
    .schema("gate")
    .from("access_passes")
    .insert({
      user_id: order.user_id,
      plan_id: order.plan_id,
      payment_order_id: order.id,
      status: "ACTIVE",
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      updated_at: now.toISOString(),
    })
    .select("id, user_id, plan_id, payment_order_id, status, starts_at, ends_at")
    .single();

  if (!insertRes.error && insertRes.data) {
    return toAccessPass(insertRes.data);
  }

  // Handle duplicate insert from verify/webhook race.
  if (insertRes.error?.code === "23505") {
    const raceWinner = await supabaseAdmin
      .schema("gate")
      .from("access_passes")
      .select("id, user_id, plan_id, payment_order_id, status, starts_at, ends_at")
      .eq("payment_order_id", order.id)
      .single();

    if (raceWinner.error || !raceWinner.data) {
      throw new Error(
        `[gate/access] unique race recovery failed: ${raceWinner.error?.message ?? "missing"}`
      );
    }

    return toAccessPass(raceWinner.data);
  }

  throw new Error(
    `[gate/access] access_pass insert failed: ${insertRes.error?.message ?? "unknown"}`
  );
}

/**
 * A fully refunded order loses its access: the order is marked REFUNDED and its pass ends now.
 * A pass that was stacked to start in the future also gets its start pulled back (the table requires
 * ends_at > starts_at), and any passes stacked after it move earlier by the refunded time, so the
 * student doesn't lose days they still paid for.
 */
export async function revokeAccessForRefundedOrder(paymentOrderId: string): Promise<void> {
  const now = new Date();
  const db = supabaseAdmin.schema("gate");
  const ord = await db.from("payment_orders").update({ status: "REFUNDED", updated_at: now.toISOString() }).eq("id", paymentOrderId);
  if (ord.error) throw new Error(`[gate/access] refund order update failed: ${ord.error.message}`);

  const { data: passes, error } = await db
    .from("access_passes")
    .select("id, user_id, starts_at, ends_at")
    .eq("payment_order_id", paymentOrderId);
  if (error) throw new Error(`[gate/access] refund pass lookup failed: ${error.message}`);

  for (const p of passes ?? []) {
    const start = new Date(p.starts_at);
    const end = new Date(p.ends_at);
    if (end <= now) continue; // already over
    const removedMs = end.getTime() - Math.max(start.getTime(), now.getTime());
    const patch = {
      starts_at: new Date(Math.min(start.getTime(), now.getTime() - 1000)).toISOString(),
      ends_at: now.toISOString(),
      updated_at: now.toISOString(),
    };
    let upd = await db.from("access_passes").update({ ...patch, status: "REFUNDED" }).eq("id", p.id);
    if (upd.error) upd = await db.from("access_passes").update(patch).eq("id", p.id); // status value not allowed: ending it is enough
    if (upd.error) throw new Error(`[gate/access] refund pass update failed: ${upd.error.message}`);

    // Close the gap: passes stacked after this one start earlier by the refunded time.
    const { data: later } = await db
      .from("access_passes")
      .select("id, starts_at, ends_at")
      .eq("user_id", p.user_id)
      .eq("status", "ACTIVE")
      .gte("starts_at", end.toISOString())
      .order("starts_at");
    for (const l of later ?? []) {
      await db
        .from("access_passes")
        .update({
          starts_at: new Date(new Date(l.starts_at).getTime() - removedMs).toISOString(),
          ends_at: new Date(new Date(l.ends_at).getTime() - removedMs).toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", l.id);
    }
  }
}
