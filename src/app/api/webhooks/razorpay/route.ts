// src/app/api/webhooks/razorpay/route.ts
import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

export const runtime = "nodejs";

/**
 * Verify Razorpay webhook HMAC signature.
 */
function verifySignature(
  rawBody: string,
  signature: string,
  secret: string
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
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

    // Verify HMAC signature
    if (!signature || !verifySignature(rawBody, signature, webhookSecret)) {
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);
    const eventId = event.id as string;
    const eventType = event.event as string;

    if (!eventId || !eventType) {
      return Response.json({ error: "Missing event id or type" }, { status: 400 });
    }

    // ========== IDEMPOTENCY: exactly-once processing ==========
    const { data: existing } = await supabaseAdmin
      .from("gate.payment_events" as any)
      .select("id")
      .eq("provider_event_id", eventId)
      .maybeSingle();

    if (existing) {
      return Response.json({ ok: true, deduped: true });
    }

    // Insert event record
    const { error: insErr } = await supabaseAdmin
      .from("gate.payment_events" as any)
      .insert({
        provider_event_id: eventId,
        event_type: eventType,
        raw_json: event,
        status: "RECEIVED",
        received_at: new Date().toISOString(),
      });

    if (insErr) {
      // If unique constraint violation, another request beat us
      if (insErr.code === "23505") {
        return Response.json({ ok: true, deduped: true });
      }
      console.error("[razorpay webhook] insert error:", insErr);
      return Response.json({ error: "Failed to store event" }, { status: 500 });
    }

    // ========== PROCESS EVENT ==========
    const now = new Date().toISOString();

    switch (eventType) {
      case "subscription.activated":
      case "subscription.charged": {
        const subscriptionId = event.payload?.subscription?.entity?.id;
        const userId = event.payload?.subscription?.entity?.notes?.user_id;
        const planId = event.payload?.subscription?.entity?.plan_id;
        const currentEnd = event.payload?.subscription?.entity?.current_end;

        if (subscriptionId && userId) {
          await supabaseAdmin
            .from("gate.subscriptions" as any)
            .upsert({
              user_id: userId,
              provider: "razorpay",
              provider_subscription_id: subscriptionId,
              status: "ACTIVE",
              plan_id: planId ?? null,
              current_period_end: currentEnd
                ? new Date(currentEnd * 1000).toISOString()
                : null,
              updated_at: now,
            }, { onConflict: "provider_subscription_id" });
        }

        await supabaseAdmin
          .from("gate.payment_events" as any)
          .update({ status: "PROCESSED", processed_at: now })
          .eq("provider_event_id", eventId);

        break;
      }

      case "payment.failed": {
        const subscriptionId = event.payload?.payment?.entity?.subscription_id;
        if (subscriptionId) {
          await supabaseAdmin
            .from("gate.subscriptions" as any)
            .update({ status: "PAST_DUE", updated_at: now })
            .eq("provider_subscription_id", subscriptionId);
        }

        await supabaseAdmin
          .from("gate.payment_events" as any)
          .update({ status: "PROCESSED", processed_at: now })
          .eq("provider_event_id", eventId);

        break;
      }

      default: {
        await supabaseAdmin
          .from("gate.payment_events" as any)
          .update({ status: "IGNORED", processed_at: now })
          .eq("provider_event_id", eventId);
        break;
      }
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[razorpay webhook] error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
