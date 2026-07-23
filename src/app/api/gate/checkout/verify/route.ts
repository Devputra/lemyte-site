// src/app/api/gate/checkout/verify/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { verifyCheckoutSignature } from "@/lib/gate/razorpay";
import { grantAccessForPaidOrder } from "@/lib/gate/access";

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
      .select("id, user_id, provider_order_id")
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
  } catch (err: any) {
    if (err?.issues) {
      return Response.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 }
      );
    }

    console.error("[gate/checkout/verify] error", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
