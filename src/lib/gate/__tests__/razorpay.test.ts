// src/lib/gate/__tests__/razorpay.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// Mock `server-only` so the import doesn't throw in test environment.
vi.mock("server-only", () => ({}));

// We import AFTER the mock is set up.
const { verifyCheckoutSignature } = await import("../razorpay");

describe("verifyCheckoutSignature", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns true for a valid signature", () => {
    const secret = "test_secret_key";
    process.env.RAZORPAY_KEY_SECRET = secret;

    const orderId = "order_abc123";
    const paymentId = "pay_xyz789";

    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(
      verifyCheckoutSignature({
        orderId,
        paymentId,
        signature: expected,
      })
    ).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    process.env.RAZORPAY_KEY_SECRET = "test_secret_key";

    expect(
      verifyCheckoutSignature({
        orderId: "order_abc123",
        paymentId: "pay_xyz789",
        signature: "deadbeef",
      })
    ).toBe(false);
  });

  it("returns false when RAZORPAY_KEY_SECRET is not set", () => {
    delete process.env.RAZORPAY_KEY_SECRET;

    expect(
      verifyCheckoutSignature({
        orderId: "order_abc123",
        paymentId: "pay_xyz789",
        signature: "anything",
      })
    ).toBe(false);
  });
});

const { paymentMatchesOrder, fetchRazorpayPayment, captureRazorpayPayment } = await import("../razorpay");

describe("payment confirmation", () => {
  const order = { provider_order_id: "order_1", amount_inr: 299, currency: "INR" };
  const payment = { id: "pay_1", order_id: "order_1", amount: 29900, currency: "INR", status: "captured" };

  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it("accepts only the exact order, paise amount and INR currency", () => {
    expect(paymentMatchesOrder(payment, order)).toBe(true);
    for (const patch of [{ order_id: "other" }, { amount: 299 }, { amount: 30000 }, { currency: "USD" }]) {
      expect(paymentMatchesOrder({ ...payment, ...patch }, order)).toBe(false);
    }
    expect(paymentMatchesOrder(payment, { ...order, provider_order_id: null })).toBe(false);
    expect(paymentMatchesOrder(payment, { ...order, currency: "USD" })).toBe(false);
  });

  it("fetches and captures using authenticated requests and exact paise", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "key");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "secret");
    const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => payment });
    vi.stubGlobal("fetch", fetch);
    expect(await fetchRazorpayPayment("pay_1")).toEqual(payment);
    expect(fetch).toHaveBeenLastCalledWith("https://api.razorpay.com/v1/payments/pay_1", expect.objectContaining({
      headers: { Authorization: "Basic " + Buffer.from("key:secret").toString("base64") },
    }));
    expect(await captureRazorpayPayment("pay_1", 29900)).toEqual(payment);
    expect(fetch).toHaveBeenLastCalledWith("https://api.razorpay.com/v1/payments/pay_1/capture", expect.objectContaining({
      method: "POST", body: JSON.stringify({ amount: 29900, currency: "INR" }),
    }));
  });

  it("rejects failed lookup and capture responses", async () => {
    vi.stubEnv("RAZORPAY_KEY_ID", "key");
    vi.stubEnv("RAZORPAY_KEY_SECRET", "secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502 }));
    await expect(fetchRazorpayPayment("pay_1")).rejects.toThrow("lookup failed");
    await expect(captureRazorpayPayment("pay_1", 29900)).rejects.toThrow("capture failed");
  });
});
