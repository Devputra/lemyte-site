// src/app/api/gate/checkout/create-order/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRazorpayOrder, isRazorpayConfigured } from "@/lib/gate/razorpay";
import { priceOn } from "@/lib/gate/plan-price";
import { latestActiveEnd } from "@/lib/gate/access";
import { LEGAL } from "@/lib/legal";
import { handleRouteError, getErrorMessage } from "@/lib/gate/errors";

export const runtime = "nodejs";

const Body = z.object({
  planId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: auth, error: authErr } = await supabase.auth.getUser();

    if (authErr || !auth?.user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }

    // Before live keys exist, say so plainly instead of failing after creating an order row.
    if (!isRazorpayConfigured()) {
      return Response.json(
        {
          error: `Online payments are being activated and will open in a few days. To buy a plan now, write to ${LEGAL.email}.`,
        },
        { status: 503 },
      );
    }

    const userId = auth.user.id;
    const input = Body.parse(await req.json());

    const { data: plan, error: planErr } = await supabaseAdmin
      .schema("gate")
      .from("plans")
      .select("id, code, name, duration_months, price_inr, price_schedule, is_active, ends_at")
      .eq("id", input.planId)
      .maybeSingle();

    if (planErr) {
      console.error("[gate/checkout/create-order] plan lookup failed", planErr);
      return Response.json({ error: "Failed to load plan" }, { status: 500 });
    }

    if (!plan || !plan.is_active || (plan.ends_at && new Date(plan.ends_at) <= new Date())) {
      return Response.json({ error: "Plan not available" }, { status: 404 });
    }

    // A fixed-date plan ("Until GATE 2027") adds nothing if the current plan already runs past that date.
    if (plan.ends_at) {
      const currentEnd = await latestActiveEnd(userId);
      if (currentEnd && currentEnd >= new Date(plan.ends_at)) {
        return Response.json(
          { error: `Your current plan already runs past ${new Date(plan.ends_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}.` },
          { status: 409 },
        );
      }
    }

    // Today's price: a plan with a published schedule gets cheaper over time (src/lib/gate/plan-price.ts).
    const amountInr = priceOn(plan);

    const { data: ord, error: ordErr } = await supabaseAdmin
      .schema("gate")
      .from("payment_orders")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        provider: "razorpay",
        amount_inr: amountInr,
        currency: "INR",
        status: "CREATED",
      })
      .select("id")
      .single();

    if (ordErr || !ord) {
      console.error("[gate/checkout/create-order] payment_orders insert failed", ordErr);
      return Response.json(
        { error: "Failed to create payment order" },
        { status: 500 }
      );
    }

    let rzpOrder;
    try {
      rzpOrder = await createRazorpayOrder({
        amountInr,
        receipt: `lm_${ord.id}`.slice(0, 40),
        notes: {
          user_id: userId,
          plan_id: String(plan.id),
          plan_code: String(plan.code),
          payment_order_id: String(ord.id),
        },
      });
    } catch (err: unknown) {
      console.error("[gate/checkout/create-order] Razorpay create failed", err);

      await supabaseAdmin
        .schema("gate")
        .from("payment_orders")
        .update({
          status: "FAILED",
          raw_payload: { error: getErrorMessage(err) },
          updated_at: new Date().toISOString(),
        })
        .eq("id", ord.id);

      return Response.json(
        { error: "Failed to create Razorpay order" },
        { status: 502 }
      );
    }

    await supabaseAdmin
      .schema("gate")
      .from("payment_orders")
      .update({
        provider_order_id: rzpOrder.id,
        raw_payload: rzpOrder as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ord.id);

    return Response.json({
      paymentOrderId: ord.id,
      razorpayOrderId: rzpOrder.id,
      amountInr,
      amountPaise: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID ?? null, // key ids are public by design; one variable for server and checkout
      plan: {
        id: plan.id,
        code: plan.code,
        name: plan.name,
        durationMonths: plan.duration_months,
      },
      user: {
        id: userId,
        email: auth.user.email ?? null,
      },
    });
  } catch (err: unknown) {
    return handleRouteError(err, "gate/checkout/create-order");
  }
}
