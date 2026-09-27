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
