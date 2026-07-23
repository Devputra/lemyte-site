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

function addMonths(d: Date, n: number): Date {
  const out = new Date(d);
  out.setMonth(out.getMonth() + n);
  return out;
}

function toAccessPass(row: any): AccessPassRecord {
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
    // Make sure payment order is also marked PAID if this was a webhook/verify race.
    await supabaseAdmin
      .schema("gate")
      .from("payment_orders")
      .update({
        status: "PAID",
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
    .select("id, duration_months")
    .eq("id", order.plan_id)
    .single();

  if (planRes.error || !planRes.data) {
    throw new Error(
      `[gate/access] plan lookup failed: ${planRes.error?.message ?? "missing plan"}`
    );
  }

  const now = new Date();

  // Extend from existing active pass if present.
  const activeRes = await supabaseAdmin
    .schema("gate")
    .from("access_passes")
    .select("id, ends_at")
    .eq("user_id", order.user_id)
    .eq("status", "ACTIVE")
    .gt("ends_at", now.toISOString())
    .order("ends_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (activeRes.error) {
    throw new Error(
      `[gate/access] active access lookup failed: ${activeRes.error.message}`
    );
  }

  const startsAt =
    activeRes.data?.ends_at && new Date(activeRes.data.ends_at) > now
      ? new Date(activeRes.data.ends_at)
      : now;

  const endsAt = addMonths(startsAt, Number(planRes.data.duration_months));

  const markOrder = await supabaseAdmin
    .schema("gate")
    .from("payment_orders")
    .update({
      status: "PAID",
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
