// src/app/api/gate/checkout/verify/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyCheckoutSignature, fetchRazorpayPayment, captureRazorpayPayment, paymentMatchesOrder } from "@/lib/gate/razorpay";
import { grantAccessForPaidOrder, AccessGrantError } from "@/lib/gate/access";
import { handleRouteError } from "@/lib/gate/errors";

export const runtime = "nodejs";

const Body = z.object({
  paymentOrderId: z.string().uuid(),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
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

    const sigOk = verifyCheckoutSignature({
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      signature: input.razorpaySignature,
    });

    if (!sigOk) {
      return Response.json({ error: "Invalid signature" }, { status: 400 });
    }

    const { data: ord, error: ordErr } = await supabaseAdmin
      .schema("gate")
      .from("payment_orders")
      .select("id, user_id, provider_order_id, amount_inr, currency, status")
      .eq("id", input.paymentOrderId)
      .maybeSingle();

    if (ordErr) {
      console.error("[gate/checkout/verify] payment_orders lookup failed", ordErr);
      return Response.json({ error: "Failed to load order" }, { status: 500 });
    }

    if (!ord) {
      return Response.json({ error: "Order not found" }, { status: 404 });
    }

    if (ord.user_id !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (ord.provider_order_id !== input.razorpayOrderId) {
      return Response.json({ error: "Order id mismatch" }, { status: 400 });
    }

    // FAILED is not final: the buyer may have retried successfully on the same Razorpay order.
    if (ord.status === "REFUNDED") {
      return Response.json({ error: `Order is ${ord.status}` }, { status: 409 });
    }

    let payment;
    try {
      payment = await fetchRazorpayPayment(input.razorpayPaymentId);
      if (payment.id !== input.razorpayPaymentId || !paymentMatchesOrder(payment, ord)) {
        return Response.json({ error: "Payment order, amount or currency mismatch" }, { status: 400 });
      }
      if (payment.status === "authorized") {
        try {
          payment = await captureRazorpayPayment(payment.id, ord.amount_inr * 100);
        } catch (captureErr) {
          // Auto-capture or the webhook may have captured it a moment earlier: re-read before giving up.
          payment = await fetchRazorpayPayment(payment.id);
          if (payment.status !== "captured") throw captureErr;
        }
      }
    } catch (err) {
      console.error("[gate/checkout/verify] payment confirmation failed", err);
      return Response.json({ error: "Unable to confirm or capture payment. Please retry verification." }, { status: 502 });
    }
    if (payment.id !== input.razorpayPaymentId || !paymentMatchesOrder(payment, ord) || payment.status !== "captured") {
      return Response.json({ error: "Payment has not been captured with the expected amount and currency" }, { status: 409 });
    }

    const accessPass = await grantAccessForPaidOrder({
      paymentOrderId: input.paymentOrderId,
      paymentId: input.razorpayPaymentId,
    });

    return Response.json({
      ok: true,
      accessPass: {
        id: accessPass.id,
        startsAt: accessPass.startsAt,
        endsAt: accessPass.endsAt,
      },
    });
  } catch (err: unknown) {
    if (err instanceof AccessGrantError) {
      return Response.json({ error: err.message, reason: err.reason }, { status: 409 });
    }
    return handleRouteError(err, "gate/checkout/verify");
  }
}
