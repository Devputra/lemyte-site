// src/lib/gate/razorpay.ts
//
// Thin REST wrapper around Razorpay's Orders + Payments API.
// We use fetch directly so we don't add a dependency.
//
// Required env:
//   RAZORPAY_KEY_ID
//   RAZORPAY_KEY_SECRET
//   RAZORPAY_WEBHOOK_SECRET   (used by the webhook route, not here)
//   NEXT_PUBLIC_RAZORPAY_KEY_ID  (exposed to the browser checkout)

import "server-only";
import crypto from "crypto";

const BASE = "https://api.razorpay.com/v1";

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
