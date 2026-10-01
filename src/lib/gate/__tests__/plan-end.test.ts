// src/lib/gate/__tests__/plan-end.test.ts
import { describe, expect, it } from "vitest";

import { addMonths, planEnd } from "../access";

describe("planEnd", () => {
  const start = new Date("2026-10-02T10:00:00+05:30");
  it("adds months for monthly plans", () => {
    expect(planEnd({ duration_months: 3, ends_at: null }, start).toISOString()).toBe(addMonths(start, 3).toISOString());
  });
  it("uses the fixed date for 'Until GATE' plans, whatever the start", () => {
    const fixed = "2027-02-28T23:59:59+05:30";
    expect(planEnd({ duration_months: 5, ends_at: fixed }, start).toISOString()).toBe(new Date(fixed).toISOString());
    // stacked after a plan ending in January: still ends on the fixed date (not +5 months)
    expect(planEnd({ duration_months: 5, ends_at: fixed }, new Date("2027-01-15")).toISOString()).toBe(new Date(fixed).toISOString());
  });
});
