// src/app/api/webhooks/razorpay/route.ts

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AccessGrantError, grantAccessForPaidOrder, revokeAccessForRefundedOrder } from "@/lib/gate/access";
import { getErrorMessage } from "@/lib/gate/errors";
import crypto from "crypto";
import { paymentMatchesOrder } from "@/lib/gate/razorpay";

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
      // Logged so a secret mismatch with the Razorpay dashboard shows up in Vercel logs.
      console.warn("[razorpay webhook] rejected: bad or missing signature", {
        hasSignature: Boolean(signature),
        event: rawBody.match(/"event"\s*:\s*"([^"]+)"/)?.[1] ?? null,
      });
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    // Razorpay sends the unique event id in a header, not in the body (body.id is absent).
    const eventId = req.headers.get("x-razorpay-event-id") ?? (event.id as string | undefined) ?? null;
    const eventType = (event.event as string) ?? null;
    console.info("[razorpay webhook] received", { eventType, eventId });

    if (!eventId || !eventType) {
      return Response.json({ error: "Missing event id or type" }, { status: 400 });
    }

    const existing = await supabaseAdmin
      .schema("gate")
      .from("payment_events")
      .select("id, status")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    // Done events are duplicates; a FAILED (or interrupted) event is processed again when Razorpay retries.
    if (existing.data && (existing.data.status === "PROCESSED" || existing.data.status === "IGNORED")) {
      return Response.json({ ok: true, deduped: true });
    }

    if (!existing.data) {
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
    }

    const processedAt = new Date().toISOString();
    let finalStatus: "PROCESSED" | "IGNORED" | "FAILED" = "IGNORED";
    let finalError: string | null = null;

    try {
      const payment = event.payload?.payment?.entity;
      const resolveOrder = async () => {
        const db = supabaseAdmin.schema("gate");
        const columns = "id, provider_order_id, amount_inr, currency";
        if (payment?.order_id) {
          const { data, error } = await db.from("payment_orders").select(columns)
            .eq("provider_order_id", payment.order_id).maybeSingle();
          if (error) throw new Error(`Order lookup failed: ${error.message}`);
          if (data) return data;
        }
        const noteId = payment?.notes?.payment_order_id ?? event.payload?.order?.entity?.notes?.payment_order_id;
        if (!noteId) return null;
        const { data, error } = await db.from("payment_orders").select(columns).eq("id", noteId).maybeSingle();
        if (error) throw new Error(`Order notes lookup failed: ${error.message}`);
        return data;
      };
      switch (eventType) {
        case "payment.captured":
        case "order.paid": {
          const order = await resolveOrder();
          if (!order) throw new Error("Payment order not found");
          if (!payment?.id || payment.status !== "captured" || !paymentMatchesOrder(payment, order)) {
            throw new Error("Captured payment order, amount or currency mismatch");
          }
          try {
            await grantAccessForPaidOrder({ paymentOrderId: order.id, paymentId: payment.id });
            finalStatus = "PROCESSED";
          } catch (grantErr) {
            // A deliberate refusal (refunded order, no time left to add) will not change on retry: log it for a
            // manual refund instead of letting Razorpay redeliver the event forever.
            if (!(grantErr instanceof AccessGrantError)) throw grantErr;
            console.error("[razorpay webhook] access not granted; manual follow-up needed", { eventId, orderId: order.id, reason: grantErr.reason });
            finalStatus = "IGNORED";
            finalError = grantErr.message;
          }
          break;
        }

        case "payment.failed": {
          const order = await resolveOrder();
          if (order) {
            const { error } = await supabaseAdmin.schema("gate").from("payment_orders")
              .update({ status: "FAILED", updated_at: processedAt })
              .eq("id", order.id)
              .in("status", ["CREATED", "AUTHORIZED"]);
            if (error) throw new Error(`Failed order update failed: ${error.message}`);
            finalStatus = "PROCESSED";
          }
          break;
        }

        case "refund.processed": {
          // Only a full refund removes access (our policy refunds the whole amount).
          const order = await resolveOrder();
          const paymentOrderId = order?.id;
          const fullyRefunded = payment && Number(payment.amount_refunded ?? 0) >= Number(payment.amount ?? Infinity);
          if (paymentOrderId && fullyRefunded) {
            await revokeAccessForRefundedOrder(paymentOrderId);
            finalStatus = "PROCESSED";
          } else {
            console.warn("[razorpay webhook] refund not applied (partial or no order id)", { eventId, paymentOrderId });
            finalStatus = "IGNORED";
          }
          break;
        }
        default: {
          finalStatus = "IGNORED";
          break;
        }
      }
    } catch (procErr: unknown) {
      console.error("[razorpay webhook] processing failed", {
        eventId,
        eventType,
        procErr,
      });

      finalStatus = "FAILED";
      finalError = getErrorMessage(procErr);
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
  } catch (err: unknown) {
    console.error("[razorpay webhook] fatal error", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
