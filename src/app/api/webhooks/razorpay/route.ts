// src/app/api/webhooks/razorpay/route.ts

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { grantAccessForPaidOrder } from "@/lib/gate/access";
import crypto from "crypto";

export const runtime = "nodejs";

function verifyWebhookSignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);

  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error("[razorpay webhook] RAZORPAY_WEBHOOK_SECRET not configured");
      return Response.json({ error: "Server not configured" }, { status: 500 });
    }

    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") ?? "";

    if (!signature || !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventId = (event.id as string) ?? null;
    const eventType = (event.event as string) ?? null;

    if (!eventId || !eventType) {
      return Response.json({ error: "Missing event id or type" }, { status: 400 });
    }

    const existing = await supabaseAdmin
      .schema("gate")
      .from("payment_events")
      .select("id")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    if (existing.data) {
      return Response.json({ ok: true, deduped: true });
    }

    const insertEvent = await supabaseAdmin
      .schema("gate")
      .from("payment_events")
      .insert({
        provider: "razorpay",
        provider_event_id: eventId,
        event_type: eventType,
        payload: event,
        status: "RECEIVED",
        received_at: new Date().toISOString(),
      });

    if (insertEvent.error) {
      if (insertEvent.error.code === "23505") {
        return Response.json({ ok: true, deduped: true });
      }

      console.error("[razorpay webhook] insert error", insertEvent.error);
      return Response.json({ error: "Failed to store event" }, { status: 500 });
    }

    const processedAt = new Date().toISOString();
    let finalStatus: "PROCESSED" | "IGNORED" | "FAILED" = "IGNORED";
    let finalError: string | null = null;

    try {
      switch (eventType) {
        case "payment.captured":
        case "order.paid": {
          const notes =
            event.payload?.payment?.entity?.notes ??
            event.payload?.order?.entity?.notes ??
            {};

          const paymentOrderId = notes.payment_order_id as string | undefined;
          const paymentId =
            (event.payload?.payment?.entity?.id as string | undefined) ?? null;

          if (paymentOrderId) {
            await grantAccessForPaidOrder({
              paymentOrderId,
              paymentId,
            });
            finalStatus = "PROCESSED";
          } else {
            console.warn("[razorpay webhook] missing payment_order_id in notes", {
              eventId,
              eventType,
            });
            finalStatus = "IGNORED";
          }
          break;
        }

        case "payment.failed": {
          const notes = event.payload?.payment?.entity?.notes ?? {};
          const paymentOrderId = notes.payment_order_id as string | undefined;

          if (paymentOrderId) {
            await supabaseAdmin
              .schema("gate")
              .from("payment_orders")
              .update({
                status: "FAILED",
                updated_at: processedAt,
              })
              .eq("id", paymentOrderId);

            finalStatus = "PROCESSED";
          } else {
            finalStatus = "IGNORED";
          }
          break;
        }

        default: {
          finalStatus = "IGNORED";
          break;
        }
      }
    } catch (procErr: any) {
      console.error("[razorpay webhook] processing failed", {
        eventId,
        eventType,
        procErr,
      });

      finalStatus = "FAILED";
      finalError = String(procErr?.message ?? procErr);
    }

    await supabaseAdmin
      .schema("gate")
      .from("payment_events")
      .update({
        status: finalStatus,
        processed_at: processedAt,
        error: finalError,
      })
      .eq("provider_event_id", eventId);

    if (finalStatus === "FAILED") {
      return Response.json({ error: "Processing failed" }, { status: 500 });
    }

    return Response.json({ ok: true, status: finalStatus });
  } catch (err: any) {
    console.error("[razorpay webhook] fatal error", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
