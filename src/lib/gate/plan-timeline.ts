// src/lib/gate/plan-timeline.ts — turns a student's plans into the segments of the "plan time" bar on the dashboard.
//
// Plans stack: a plan bought while another is running starts when that one ends. The bar runs from the first plan's
// start to the last plan's end; each plan is one segment, sized by its length, with the days already gone greyed out.

export type PlanPass = { planName: string; startsAt: string; endsAt: string };

export type PlanSegment = PlanPass & {
  widthPct: number; // share of the whole bar
  usedPct: number; // share of this segment already gone (0–100)
  totalDays: number;
  daysLeft: number;
  state: "running" | "queued" | "over";
};

export type PlanTimeline = { segments: PlanSegment[]; daysLeft: number; todayPct: number; endsAt: string } | null;

const DAY = 86_400_000;
const days = (ms: number) => Math.max(0, Math.ceil(ms / DAY));
const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function planTimeline(passes: PlanPass[], now: Date = new Date()): PlanTimeline {
  const list = passes
    .filter((p) => new Date(p.endsAt) > new Date(p.startsAt))
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
  if (!list.length) return null;

  const first = +new Date(list[0].startsAt);
  const last = Math.max(...list.map((p) => +new Date(p.endsAt)));
  const span = last - first;
  const t = +now;

  const segments = list.map((p): PlanSegment => {
    const s = +new Date(p.startsAt);
    const e = +new Date(p.endsAt);
    return {
      ...p,
      widthPct: ((e - s) / span) * 100,
      usedPct: clamp(((t - s) / (e - s)) * 100),
      totalDays: days(e - s),
      daysLeft: days(e - Math.max(t, s)),
      state: t >= e ? "over" : t >= s ? "running" : "queued",
    };
  });

  return {
    segments,
    daysLeft: days(last - Math.max(t, first)),
    todayPct: clamp(((t - first) / span) * 100),
    endsAt: new Date(last).toISOString(),
  };
}
