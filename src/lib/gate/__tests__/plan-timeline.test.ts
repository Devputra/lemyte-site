import { describe, expect, it } from "vitest";

import { planTimeline } from "../plan-timeline";

// A 6-month plan with a 1-month plan stacked after it (the common "bought more time" case).
const sixMonths = { planName: "6 Months", startsAt: "2026-09-29T17:00:00Z", endsAt: "2027-03-31T17:00:00Z" };
const oneMonth = { planName: "1 Month", startsAt: "2027-03-31T17:00:00Z", endsAt: "2027-05-01T17:00:00Z" };

describe("planTimeline", () => {
  it("returns null without plans", () => {
    expect(planTimeline([])).toBeNull();
  });

  it("sizes segments by length and counts days left across stacked plans", () => {
    const tl = planTimeline([oneMonth, sixMonths], new Date("2026-10-04T12:00:00Z"))!;
    expect(tl.segments.map((s) => s.planName)).toEqual(["6 Months", "1 Month"]); // sorted by start
    expect(tl.segments[0].widthPct + tl.segments[1].widthPct).toBeCloseTo(100);
    expect(tl.segments[0].widthPct).toBeGreaterThan(tl.segments[1].widthPct * 5);
    expect(tl.segments[0].state).toBe("running");
    expect(tl.segments[1].state).toBe("queued");
    expect(tl.segments[1].usedPct).toBe(0);
    expect(tl.segments[1].daysLeft).toBe(31);
    expect(tl.daysLeft).toBe(tl.segments[0].daysLeft + tl.segments[1].daysLeft);
    expect(tl.endsAt).toBe(new Date(oneMonth.endsAt).toISOString());
  });

  it("goes down by one day each day", () => {
    const a = planTimeline([sixMonths, oneMonth], new Date("2026-10-04T12:00:00Z"))!;
    const b = planTimeline([sixMonths, oneMonth], new Date("2026-10-05T12:00:00Z"))!;
    expect(a.daysLeft - b.daysLeft).toBe(1);
    expect(b.todayPct).toBeGreaterThan(a.todayPct);
  });

  it("marks a finished plan as over while the next one runs", () => {
    const tl = planTimeline([sixMonths, oneMonth], new Date("2027-04-10T00:00:00Z"))!;
    expect(tl.segments[0]).toMatchObject({ state: "over", usedPct: 100, daysLeft: 0 });
    expect(tl.segments[1].state).toBe("running");
  });
});
