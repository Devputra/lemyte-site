// src/components/gate/PlanTime.tsx — "how much plan time do I have left", shown only when the student asks.
//
// A small "Plan · N days left" button on the dashboard. Clicking it opens a bar with one segment per plan (each in its
// own colour, stacked in the order they run); the part already used is greyed out and a marker shows today, so the
// bar visibly shrinks day by day. Closes on a click outside or Escape. The profile page shows the same details open.
"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { planTimeline, type PlanPass, type PlanTimeline } from "@/lib/gate/plan-timeline";

// Brand blue, then ink, then a mid grey (docs/DESIGN.md palette).
const COLOURS = ["bg-brand", "bg-ink", "bg-zinc-500"];

const fmt = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dayWord = (n: number) => `${n} day${n === 1 ? "" : "s"}`;

export function PlanTime({ passes }: { passes: PlanPass[] }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const tl = useMemo(() => planTimeline(passes), [passes]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!tl) return null;

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="plan-time"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-800 hover:border-brand hover:text-brand"
      >
        Plan · {dayWord(tl.daysLeft)} left
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} strokeWidth={1.75} />
      </button>

      {open && (
        <div
          id="plan-time"
          className="absolute right-0 top-full z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-zinc-200 bg-white p-4 shadow-[0_12px_32px_-16px_rgba(0,0,0,0.3)]"
        >
          <PlanTimeDetails tl={tl} />
        </div>
      )}
    </div>
  );
}

/** The bar and the per-plan list. Used inside the dashboard popover and, always open, on the profile page. */
export function PlanTimeDetails({ tl }: { tl: NonNullable<PlanTimeline> }) {
  return (
    <>
      <p className="text-sm font-semibold text-ink">{dayWord(tl.daysLeft)} of access left</p>
      <p className="mt-0.5 text-xs text-zinc-500">Until {fmt(tl.endsAt)}</p>

      <div className="relative mt-4">
        <div
          className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
          role="img"
          aria-label={tl.segments.map((s) => `${s.planName}: ${dayWord(s.daysLeft)} left of ${s.totalDays}`).join("; ")}
        >
          {tl.segments.map((s, i) => (
            <div key={`${s.startsAt}-${i}`} className="relative h-full bg-zinc-200" style={{ width: `${s.widthPct}%` }}>
              <div
                className={`absolute inset-y-0 right-0 ${COLOURS[i % COLOURS.length]}`}
                style={{ width: `${100 - s.usedPct}%` }}
              />
            </div>
          ))}
        </div>
        <div className="absolute -top-1 bottom-[-4px] w-0.5 rounded bg-rose-500" style={{ left: `calc(${tl.todayPct}% - 1px)` }} aria-hidden />
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-zinc-400">
        <span>{fmt(tl.segments[0].startsAt)}</span>
        <span>{fmt(tl.endsAt)}</span>
      </div>

      <ul className="mt-3 space-y-2 border-t border-zinc-100 pt-3">
        {tl.segments.map((s, i) => (
          <li key={`${s.startsAt}-${i}`} className="flex items-start gap-2.5 text-sm">
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${COLOURS[i % COLOURS.length]}`} aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-ink">{s.planName}</span>
                <span className="shrink-0 text-xs font-semibold text-zinc-600">
                  {s.state === "queued" ? `${dayWord(s.totalDays)}, not started` : `${dayWord(s.daysLeft)} left`}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                {s.state === "queued" ? `Starts ${fmt(s.startsAt)} · ends ${fmt(s.endsAt)}` : `Ends ${fmt(s.endsAt)}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-zinc-400">
        <span className="h-2.5 w-0.5 rounded bg-rose-500" aria-hidden /> Today · grey is time already used
      </p>
    </>
  );
}

/** Same as PlanTimeDetails, built from raw plans; renders nothing without plans. */
export function PlanTimeOpen({ passes }: { passes: PlanPass[] }) {
  const tl = useMemo(() => planTimeline(passes), [passes]);
  return tl ? <PlanTimeDetails tl={tl} /> : null;
}
