// src/lib/gate/__tests__/access.test.ts
import { describe, it, expect, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

// Mock `server-only` so the import chain doesn't throw in test environment.
vi.mock("server-only", () => ({}));
// Mock the supabase admin client so we don't need actual credentials.
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: { schema: vi.fn(() => ({ rpc })) },
}));

const { addMonths } = await import("../access");

describe("addMonths", () => {
  it("adds months to a date", () => {
    const d = new Date("2025-01-15T00:00:00Z");
    const result = addMonths(d, 3);
    expect(result.getMonth()).toBe(3); // April (0-indexed)
    expect(result.getDate()).toBe(15);
  });

  it("handles month overflow (Jan 31 + 1 month)", () => {
    const d = new Date("2025-01-31T00:00:00Z");
    const result = addMonths(d, 1);
    // Jan 31 + 1 month → March 3 (since Feb has 28 days in 2025)
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(3);
  });

  it("handles year boundary", () => {
    const d = new Date("2025-11-15T00:00:00Z");
    const result = addMonths(d, 3);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1); // February
  });

  it("does not mutate the original date", () => {
    const d = new Date("2025-06-01T00:00:00Z");
    const original = d.getTime();
    addMonths(d, 6);
    expect(d.getTime()).toBe(original);
  });
});

const { grantAccessForPaidOrder, revokeAccessForRefundedOrder } = await import("../access");

describe("atomic access RPCs", () => {
  it("maps a granted pass and sends the payment id to the transaction", async () => {
    rpc.mockResolvedValueOnce({ data: { granted: true, pass: {
      id: "pass", user_id: "user", plan_id: "plan", payment_order_id: "order",
      status: "ACTIVE", starts_at: "start", ends_at: "end",
    } }, error: null });
    expect(await grantAccessForPaidOrder({ paymentOrderId: "order", paymentId: "pay" }))
      .toEqual({ id: "pass", userId: "user", planId: "plan", paymentOrderId: "order",
        status: "ACTIVE", startsAt: "start", endsAt: "end" });
    expect(rpc).toHaveBeenLastCalledWith("grant_access_for_order", { p_order_id: "order", p_provider_payment_id: "pay" });
  });

  it.each(["REFUNDED", "FAILED", "NO_TIME_TO_ADD"])("surfaces %s without returning access", async (reason) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      rpc.mockResolvedValueOnce({ data: { granted: false, reason }, error: null });
      await expect(grantAccessForPaidOrder({ paymentOrderId: "order" })).rejects.toMatchObject({ reason });
      if (reason === "NO_TIME_TO_ADD") expect(log).toHaveBeenCalledWith(expect.stringContaining("manual refund"), "order");
    } finally { log.mockRestore(); }
  });

  it("surfaces transaction failures, including failed refund shifts", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "rollback" } });
    await expect(revokeAccessForRefundedOrder("order")).rejects.toThrow("rollback");
    expect(rpc).toHaveBeenLastCalledWith("revoke_access_for_order", { p_order_id: "order" });
    rpc.mockResolvedValueOnce({ error: { message: "rollback" } });
    await expect(grantAccessForPaidOrder({ paymentOrderId: "order" })).rejects.toThrow("rollback");
  });
});
