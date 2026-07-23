// src/app/api/gate/checkout/create-order/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createRazorpayOrder } from "@/lib/gate/razorpay";

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

    const userId = auth.user.id;
    const input = Body.parse(await req.json());

    const { data: plan, error: planErr } = await supabaseAdmin
      .schema("gate")
      .from("plans")
      .select("id, code, name, duration_months, price_inr, is_active")
      .eq("id", input.planId)
      .maybeSingle();

    if (planErr) {
      console.error("[gate/checkout/create-order] plan lookup failed", planErr);
      return Response.json({ error: "Failed to load plan" }, { status: 500 });
    }

    if (!plan || !plan.is_active) {
      return Response.json({ error: "Plan not available" }, { status: 404 });
    }

    const { data: ord, error: ordErr } = await supabaseAdmin
      .schema("gate")
      .from("payment_orders")
      .insert({
        user_id: userId,
        plan_id: plan.id,
        provider: "razorpay",
        amount_inr: plan.price_inr,
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
        amountInr: Number(plan.price_inr),
        receipt: `lm_${ord.id}`.slice(0, 40),
        notes: {
          user_id: userId,
          plan_id: String(plan.id),
          plan_code: String(plan.code),
          payment_order_id: String(ord.id),
        },
      });
    } catch (err: any) {
      console.error("[gate/checkout/create-order] Razorpay create failed", err);

      await supabaseAdmin
        .schema("gate")
        .from("payment_orders")
        .update({
          status: "FAILED",
          raw_payload: { error: String(err?.message ?? err) },
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
        raw_payload: rzpOrder as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ord.id);

    return Response.json({
      paymentOrderId: ord.id,
      razorpayOrderId: rzpOrder.id,
      amountInr: plan.price_inr,
      amountPaise: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? null,
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
  } catch (err: any) {
    if (err?.issues) {
      return Response.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 }
      );
    }

    console.error("[gate/checkout/create-order] error", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
