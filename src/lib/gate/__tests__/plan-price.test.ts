import { describe, expect, it } from "vitest";

import { currentTier, istDate, priceOn } from "../plan-price";

const SCHEDULE = [
  { until: "2026-10-31", price: 999 },
  { until: "2026-11-30", price: 799 },
  { until: "2026-12-31", price: 599 },
  { until: "2027-01-19", price: 399 },
  { until: null, price: 299 },
];
const plan = { price_inr: 999, price_schedule: SCHEDULE };
const ist = (s: string) => new Date(`${s}+05:30`);

describe("priceOn", () => {
  it("uses the flat price when there is no schedule", () => {
    expect(priceOn({ price_inr: 799 })).toBe(799);
    expect(priceOn({ priceInr: 299, price_schedule: null })).toBe(299);
  });
  it("follows the published tiers by IST date, inclusive of the last day", () => {
    expect(priceOn(plan, ist("2026-10-03T12:00:00"))).toBe(999);
    expect(priceOn(plan, ist("2026-10-31T23:59:00"))).toBe(999);
    expect(priceOn(plan, ist("2026-11-01T00:01:00"))).toBe(799);
    expect(priceOn(plan, ist("2026-12-15T10:00:00"))).toBe(599);
    expect(priceOn(plan, ist("2027-01-19T23:00:00"))).toBe(399);
    expect(priceOn(plan, ist("2027-01-20T00:00:00"))).toBe(299);
    expect(priceOn(plan, ist("2027-02-20T09:00:00"))).toBe(299);
  });
  it("switches at IST midnight, not UTC midnight", () => {
    // 31 Oct 20:00 UTC is already 1 Nov 01:30 in India.
    expect(istDate(new Date("2026-10-31T20:00:00Z"))).toBe("2026-11-01");
    expect(priceOn(plan, new Date("2026-10-31T20:00:00Z"))).toBe(799);
  });
  it("reports the tier in force", () => {
    expect(currentTier(SCHEDULE, ist("2026-11-10T10:00:00"))).toEqual({ until: "2026-11-30", price: 799 });
    expect(currentTier(null)).toBeNull();
  });
});
