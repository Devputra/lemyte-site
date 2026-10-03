// src/lib/gate/razorpay.ts
//
// Thin REST wrapper around Razorpay's Orders + Payments API.
// We use fetch directly so we don't add a dependency.
//
// Required env:
//   RAZORPAY_KEY_ID
//   RAZORPAY_KEY_SECRET
//   RAZORPAY_WEBHOOK_SECRET   (used by the webhook route, not here)
//   (the key id is also sent to the browser checkout by create-order)

import "server-only";
import crypto from "crypto";

const BASE = "https://api.razorpay.com/v1";

/** True when server keys are set (false until live keys are added to production). */
export function isRazorpayConfigured(): boolean {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function authHeader(): string {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) {
    throw new Error(
      "Razorpay not configured: set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET"
    );
  }
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export interface RazorpayOrder {
  id: string;
  amount: number; // in paise
  currency: string;
  status: string;
  receipt?: string;
  notes?: Record<string, string>;
}

/**
 * Create a Razorpay Order. amount is in INR rupees and is converted to paise.
 */
export async function createRazorpayOrder(args: {
  amountInr: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<RazorpayOrder> {
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(args.amountInr * 100),
      currency: "INR",
      receipt: args.receipt,
      notes: args.notes ?? {},
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Razorpay order create failed: ${res.status} ${text}`);
  }

  return (await res.json()) as RazorpayOrder;
}

/**
 * Verify the signature returned by Razorpay Checkout after a successful payment.
 *
 * Razorpay docs: HMAC-SHA256(orderId|paymentId, key_secret) === signature.
 */
export function verifyCheckoutSignature(args: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${args.orderId}|${args.paymentId}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(args.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
}

/** Shared by checkout and signed webhook payloads; amounts must match exactly. */
export function paymentMatchesOrder(
  payment: Pick<RazorpayPayment, "order_id" | "amount" | "currency">,
  order: { provider_order_id: string | null; amount_inr: number; currency: string },
): boolean {
  return Boolean(order.provider_order_id) && payment.order_id === order.provider_order_id
    && payment.amount === order.amount_inr * 100
    && payment.currency === "INR" && order.currency === "INR";
}

export async function fetchRazorpayPayment(paymentId: string): Promise<RazorpayPayment> {
  const res = await fetch(`${BASE}/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: authHeader() },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Razorpay payment lookup failed: ${res.status}`);
  return await res.json() as RazorpayPayment;
}

export async function captureRazorpayPayment(paymentId: string, amount: number): Promise<RazorpayPayment> {
  const res = await fetch(`${BASE}/payments/${encodeURIComponent(paymentId)}/capture`, {
    method: "POST",
    headers: { Authorization: authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ amount, currency: "INR" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Razorpay payment capture failed: ${res.status}`);
  return await res.json() as RazorpayPayment;
}
