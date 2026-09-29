// src/components/gate/Tracker.tsx — visual building blocks of the student tracker (/gate/dashboard).
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, Star } from "lucide-react";

const BRAND = "#193bc8";

export type TopicRow = {
  topicId: string;
  code: string;
  name: string;
  section: string;
  pyqCount: number;
  answered: number;
  solved: number;
  accuracy: number | null;
  coverage: number;
  status: "new" | "started" | "weak" | "developing" | "strong";
};

export const STATUS: Record<TopicRow["status"], { label: string; color: string; pill: string }> = {
  new: { label: "Not started", color: "#e4e4e7", pill: "bg-zinc-100 text-zinc-600" },
  started: { label: "Started", color: "#93c5fd", pill: "bg-sky-50 text-sky-700" },
  weak: { label: "Weak", color: "#fb7185", pill: "bg-rose-50 text-rose-700" },
  developing: { label: "Developing", color: "#fbbf24", pill: "bg-amber-50 text-amber-700" },
  strong: { label: "Strong", color: "#10b981", pill: "bg-emerald-50 text-emerald-700" },
};

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 ${className}`}>{children}</div>;
}

/* ---------- stat ring: your value as an arc, peer average (hollow) and best (solid) as markers ---------- */

export function StatRing({
  label,
  display,
  value,
  max,
  avg,
  best,
}: {
  label: string;
  display: string;
  value: number;
  max: number;
  avg?: number;
  best?: number;
}) {
  const reduce = useReducedMotion();
  const R = 34;
  const C = 2 * Math.PI * R;
  const frac = (v: number) => (max > 0 ? Math.min(1, Math.max(0, v / max)) : 0);
  const marker = (v: number) => {
    const a = frac(v) * 2 * Math.PI - Math.PI / 2;
    return { x: 44 + R * Math.cos(a), y: 44 + R * Math.sin(a) };
  };
  return (
    <div className="flex flex-col items-center gap-2">
      <svg viewBox="0 0 88 88" className="h-24 w-24" role="img" aria-label={`${label}: ${display}`}>
        <circle cx="44" cy="44" r={R} fill="none" stroke="#f4f4f5" strokeWidth="7" />
        <motion.circle
          cx="44"
          cy="44"
          r={R}
          fill="none"
          stroke={BRAND}
          strokeWidth="7"
          strokeLinecap="round"
          initial={reduce ? false : { strokeDasharray: `0 ${C}` }}
          whileInView={{ strokeDasharray: `${frac(value) * C} ${C}` }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          transform="rotate(-90 44 44)"
        />
        {avg !== undefined && avg > 0 && (() => {
          const p = marker(avg);
          return <circle cx={p.x} cy={p.y} r="3.6" fill="white" stroke="#71717a" strokeWidth="1.6" strokeDasharray="2 1.4" />;
        })()}
        {best !== undefined && best > 0 && (() => {
          const p = marker(best);
          return <circle cx={p.x} cy={p.y} r="3.4" fill="#18181b" />;
        })()}
        <text x="44" y="49" textAnchor="middle" className={`fill-ink font-semibold ${display.length > 5 ? "text-[11px]" : "text-[15px]"}`}>
          {display}
        </text>
      </svg>
      <span className="text-xs font-bold text-zinc-600">{label}</span>
    </div>
  );
}

export function RingLegend() {
  return (
    <div className="flex items-center justify-center gap-5 text-[11px] font-semibold text-zinc-500">
      <span className="flex items-center gap-1.5">
        <span className="h-1 w-4 rounded-full" style={{ background: BRAND }} /> You
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full border border-dashed border-zinc-500" /> Average
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2.5 w-2.5 rounded-full bg-zinc-900" /> Best
      </span>
    </div>
  );
}

/* ---------- streak calendar ---------- */

export function StreakCalendar({
  current,
  best,
  activeDays,
  today,
  todayCount,
  total,
  accuracy,
}: {
  current: number;
  best: number;
  activeDays: string[];
  today: string;
  todayCount: number;
  total: number;
  accuracy: number;
}) {
  const [month, setMonth] = useState(() => today.slice(0, 7)); // YYYY-MM
  const active = useMemo(() => new Set(activeDays), [activeDays]);
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const shift = (d: number) => {
    const t = new Date(Date.UTC(y, m - 1 + d, 1));
    setMonth(t.toISOString().slice(0, 7));
  };
  const title = first.toLocaleDateString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className={`h-5 w-5 ${current > 0 ? "text-orange-500" : "text-zinc-300"}`} />
          <span className="text-lg font-semibold text-ink">{current}</span>
          <span className="whitespace-nowrap text-xs font-semibold text-zinc-500">day streak</span>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-zinc-700">
          <button onClick={() => shift(-1)} className="rounded-full p-1 hover:bg-zinc-100" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="w-20 whitespace-nowrap text-center text-[11px]">{title}</span>
          <button onClick={() => shift(1)} className="rounded-full p-1 hover:bg-zinc-100" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-1 text-[11px] font-semibold text-zinc-400">Best streak: {best} {best === 1 ? "day" : "days"}</p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-zinc-400">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <span key={`l${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`;
          const on = active.has(key);
          const isToday = key === today;
          const future = key > today;
          return (
            <span
              key={key}
              className={`flex h-7 items-center justify-center rounded-lg text-[11px] font-bold ${
                on ? "text-white" : future ? "text-zinc-300" : "bg-zinc-50 text-zinc-600"
              } ${isToday ? "ring-2 ring-brand ring-offset-1" : ""}`}
              style={on ? { background: BRAND } : undefined}
              title={on ? "Practised" : undefined}
            >
              {i + 1}
            </span>
          );
        })}
      </div>
      <div className="mt-auto grid grid-cols-3 border-t border-zinc-100 pt-4 text-center">
        {[
          [todayCount, "Today"],
          [total, "Answered"],
          [total > 0 ? `${Math.round(accuracy)}%` : "—", "Accuracy"],
        ].map(([v, l]) => (
          <div key={l as string}>
            <div className="text-base font-semibold text-ink">{v}</div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">{l}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ---------- mastery: level bands, peers per level, you ---------- */

const LEVEL_TINTS = ["#f4f4f5", "#eef6ff", "#ecfdf5", "#fffbeb", "#f5f3ff"];
const LEVEL_TEXT = ["#52525b", "#1d4ed8", "#047857", "#b45309", "#6d28d9"];

export function MasteryCard({
  levels,
  level,
  points,
  coverage,
  accuracy,
  solved,
  peerLevels,
  peerCount,
}: {
  levels: { name: string; min: number }[];
  level: { index: number; name: string; next: { name: string; min: number } | null; progress: number; min: number };
  points: number;
  coverage: number;
  accuracy: number;
  solved: number;
  peerLevels: number[];
  peerCount: number;
}) {
  const maxPeers = Math.max(1, ...peerLevels);
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: LEVEL_TINTS[level.index], color: LEVEL_TEXT[level.index] }}>
              {level.name}
            </span>
            <span className="flex">
              {levels.map((_, i) => (
                <Star key={i} className={`h-3.5 w-3.5 ${i <= level.index ? "fill-amber-400 text-amber-400" : "text-zinc-300"}`} />
              ))}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-4xl font-semibold tracking-tight text-ink">{points}</span>
            <span className="text-sm font-semibold text-zinc-500">mastery points</span>
          </div>
          <p className="mt-1 text-xs font-semibold text-zinc-500">
            <b className="text-zinc-800">{coverage}%</b> coverage · <b className="text-zinc-800">{accuracy}%</b> accuracy ·{" "}
            <b className="text-zinc-800">{solved}</b> solved
          </p>
        </div>
        <span className="text-[11px] font-semibold text-zinc-400">
          {peerCount > 0 ? `${peerCount} other students on this paper` : "Be the first on this paper"}
        </span>
      </div>

      <div className="mt-5 grid grid-cols-5 overflow-hidden rounded-2xl border border-zinc-100">
        {levels.map((l, i) => (
          <div key={l.name} className="relative flex h-44 flex-col items-center justify-end gap-1 pb-3" style={{ background: LEVEL_TINTS[i] }}>
            {i === level.index && (
              <span className="absolute top-3 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={{ background: BRAND }}>
                You
              </span>
            )}
            <div className="flex flex-wrap-reverse justify-center gap-1 px-2">
              {Array.from({ length: Math.round((peerLevels[i] / maxPeers) * 12) }).map((_, k) => (
                <span key={k} className="h-2 w-2 rounded-full bg-zinc-400/70" />
              ))}
            </div>
            <span className="text-[10px] font-bold text-zinc-400">{peerLevels[i] || ""}</span>
          </div>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-5 text-center text-[11px] font-semibold">
        {levels.map((l, i) => (
          <span key={l.name} style={{ color: LEVEL_TEXT[i] }}>
            {i + 1}★ {l.name}
          </span>
        ))}
      </div>

      {level.next ? (
        <div className="mt-5">
          <div className="flex justify-between text-xs font-bold text-zinc-600">
            <span>Next: {level.next.name}</span>
            <span style={{ color: BRAND }}>{level.next.min - points} pts to go</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-100">
            <div className="h-full rounded-full" style={{ width: `${level.progress}%`, background: BRAND }} />
          </div>
        </div>
      ) : (
        <p className="mt-5 text-xs font-bold text-emerald-700">Top level reached. Keep your streak alive.</p>
      )}
    </Card>
  );
}

/* ---------- topic health wheel ---------- */

export function TopicWheel({
  topics,
  onPick,
  labels = true,
  busyId = null,
}: {
  topics: TopicRow[];
  onPick: (t: TopicRow) => void;
  labels?: boolean;
  busyId?: string | null; // topic being set up: pulses; the rest dim and ignore clicks
}) {
  const n = Math.max(1, topics.length);
  const studied = topics.filter((t) => t.status !== "new").length;
  const r = labels ? 96 : 88;
  const W = labels ? 700 : 2 * (r + 24);
  const cx = W / 2;
  const gap = n > 1 ? 0.035 : 0;
  const ang = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    const [x0, y0] = p(a0);
    const [x1, y1] = p(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > Math.PI ? 1 : 0} 1 ${x1} ${y1}`;
  };
  // Labels in two columns (left/right of the ring), pushed apart so they never overlap.
  const LINE = 15;
  const items = topics.map((t, i) => {
    const mid = (ang(i) + ang(i + 1)) / 2;
    return { t, i, mid, right: Math.cos(mid) >= 0, y: Math.sin(mid) * (r + 40) };
  });
  const place = (side: typeof items) => {
    side.sort((a, b) => a.y - b.y);
    for (let k = 1; k < side.length; k++) side[k].y = Math.max(side[k].y, side[k - 1].y + LINE);
    const overflow = side.length ? side[side.length - 1].y - (r + 60) : 0;
    if (overflow > 0) side.forEach((s) => (s.y -= overflow / 2));
    for (let k = side.length - 2; k >= 0; k--) side[k].y = Math.min(side[k].y, side[k + 1].y - LINE);
  };
  if (labels) {
    place(items.filter((x) => x.right));
    place(items.filter((x) => !x.right));
  }
  const top = labels ? Math.min(-r - 20, ...items.map((x) => x.y - 10)) : -r - 16;
  const bottom = labels ? Math.max(r + 20, ...items.map((x) => x.y + 10)) : r + 16;
  const cy = -top + 10;
  const H = cy + bottom + 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${studied} of ${n} topics studied`}>
      {items.map(({ t, i, mid, right, y }) => {
        const a0 = ang(i) + gap;
        const a1 = ang(i + 1) - gap;
        const ox = cx + (r + 14) * Math.cos(mid);
        const oy = cy + (r + 14) * Math.sin(mid);
        const lx = cx + (right ? r + 58 : -(r + 58));
        const ly = cy + y;
        const short = t.name.length > 24 ? `${t.name.slice(0, 23)}…` : t.name;
        return (
          <g
            key={t.topicId}
            role="button"
            tabIndex={busyId ? -1 : 0}
            aria-label={`Practise 10 questions on ${t.name}`}
            aria-busy={busyId === t.topicId}
            className={`group outline-none transition-opacity duration-300 ${busyId ? (busyId === t.topicId ? "animate-pulse" : "opacity-25") : "cursor-pointer"}`}
            onClick={() => !busyId && onPick(t)}
            onKeyDown={(e) => {
              if (!busyId && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onPick(t);
              }
            }}
          >
            <title>{`${t.name}: ${STATUS[t.status].label}${t.accuracy !== null ? `, ${t.accuracy}% accuracy` : ""}, ${t.answered}/${t.pyqCount} PYQs answered`}</title>
            <path d={arc(a0, a1)} fill="none" stroke={STATUS[t.status].color} strokeWidth={busyId === t.topicId ? 32 : 24} className="transition-[stroke-width] duration-200 group-hover:[stroke-width:30px] group-focus-visible:[stroke-width:30px]" />
            {labels && <polyline points={`${ox},${oy} ${lx + (right ? -6 : 6)},${ly} ${lx},${ly}`} fill="none" stroke="#d4d4d8" strokeWidth="1" />}
            {labels && <text x={lx + (right ? 4 : -4)} y={ly + 4} textAnchor={right ? "start" : "end"} className={`text-[12px] font-semibold group-hover:fill-brand group-focus-visible:fill-brand ${busyId === t.topicId ? "fill-brand" : "fill-zinc-700"}`}>
              {short}
            </text>}
          </g>
        );
      })}
      <text x={cx} y={cy + 4} textAnchor="middle" className="fill-ink text-[34px] font-semibold">
        {studied}/{topics.length}
      </text>
      <text x={cx} y={cy + 26} textAnchor="middle" className="fill-zinc-500 text-[12px] font-semibold">
        topics studied
      </text>
    </svg>
  );
}

export function StatusLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-[11px] font-semibold text-zinc-500">
      {(Object.keys(STATUS) as TopicRow["status"][]).map((k) => (
        <span key={k} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[k].color }} /> {STATUS[k].label}
        </span>
      ))}
    </div>
  );
}

export function fmtTime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  if (sec < 3600) return `${Math.round(sec / 60)}m`;
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
