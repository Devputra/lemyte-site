import { describe, expect, it, vi, afterEach } from "vitest";
import { accessAdvanced, recoverPayment } from "./payment-recovery";
import { fetchJson } from "@/lib/fetch-helpers";

vi.mock("@/lib/fetch-helpers", () => ({ fetchJson: vi.fn() }));
afterEach(() => { vi.resetAllMocks(); vi.useRealTimers(); });

describe("payment recovery", () => {
  it("requires an extension when a plan was already active", () => {
    expect(accessAdvanced("2027-01-01", { accessUntil: "2027-01-01" })).toBe(false);
    expect(accessAdvanced("2027-01-01", { accessUntil: "2027-02-01" })).toBe(true);
    expect(accessAdvanced(null, { accessUntil: null })).toBe(false);
    expect(accessAdvanced(null, { accessUntil: "2999-01-01" })).toBe(true);
  });
  it("sees a plan queued after the current one (the current plan's end does not move)", () => {
    // 6-month plan running to 31 Mar; a 1-month plan bought on top runs to 1 May.
    expect(accessAdvanced("2027-03-31T17:07:38Z", { accessUntil: "2027-05-01T17:07:38Z" })).toBe(true);
  });
  it("retries the same payment and then detects webhook access", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchJson).mockRejectedValueOnce(new Error()).mockRejectedValueOnce(new Error()).mockRejectedValueOnce(new Error()).mockResolvedValue({ accessUntil: "2999-01-01" });
    const payload = { razorpayPaymentId: "pay_123" };
    const result = recoverPayment(payload, null);
    await vi.runAllTimersAsync();
    expect(await result).toBe(true);
    expect(fetchJson).toHaveBeenCalledTimes(4);
    expect(vi.mocked(fetchJson).mock.calls[2][1]?.body).toBe(JSON.stringify(payload));
  });
  it("stops after bounded retries when access is still pending", async () => {
    vi.useFakeTimers();
    vi.mocked(fetchJson).mockRejectedValue(new Error());
    const result = recoverPayment({}, null);
    await vi.runAllTimersAsync();
    expect(await result).toBe(false);
    expect(fetchJson).toHaveBeenCalledTimes(6);
  });
});
