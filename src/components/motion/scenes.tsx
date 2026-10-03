// src/components/motion/scenes.tsx — code-drawn animated scenes that replace stock illustrations.
// Style reference: animejs.com (grid staggers, self-drawing lines, ripples). Built with CSS keyframes
// (loops, no JS needed) and framer-motion (draw-on-scroll). All deterministic, so SSR matches the client.
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* Stable pseudo-random in [0,1) from an integer, so server and client render the same pattern. */
const rand = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------- Hero: a 65-question answer sheet that marks itself in a wave ---------- */
type Cell = "answered" | "unanswered" | "review" | "unvisited";
// The answer sheet shows a test in progress, so it uses the exam palette's states and colours
// (src/app/gate/attempt: answered green, not answered red, marked purple, not visited white) — never
// correct/wrong, which a student only sees in the report after submitting.
const CELL_CLASS: Record<Cell, string> = {
  answered: "bg-[#00A86B] text-white",
  unanswered: "bg-[#FF0000] text-white",
  review: "bg-[#9932CC] text-white",
  unvisited: "bg-white text-zinc-500",
};
const SHEET: Cell[] = Array.from({ length: 65 }, (_, i) => {
  const r = rand(i + 3);
  return r < 0.6 ? "answered" : r < 0.72 ? "unanswered" : r < 0.82 ? "review" : "unvisited";
});

function useCountdown(from: number) {
  const [left, setLeft] = useState(from);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setLeft((s) => (s > 0 ? s - 1 : from)), 1000);
    return () => clearInterval(id);
  }, [from, reduce]);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function AnswerSheetScene({
  className,
  count = 65,
  cols = 13,
  title = "GATE paper · 65 questions",
  seconds = 3 * 3600 - 1,
}: {
  className?: string;
  count?: number;
  cols?: number;
  title?: string;
  seconds?: number;
}) {
  const time = useCountdown(seconds);
  const COLS = cols;
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-white p-5 ring-1 ring-zinc-200 sm:p-7 ${className ?? ""}`}
      aria-hidden
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">
          {title}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-ink px-2.5 py-1 font-medium tabular-nums text-white">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          {time}
        </span>
      </div>
      <div
        className="mt-5 grid gap-[5px]"
        style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
      >
        {SHEET.slice(0, count).map((c, i) => {
          const col = i % COLS;
          const row = Math.floor(i / COLS);
          const delay = (Math.hypot(col, row * 1.4) * 0.07).toFixed(2); // wave from the top-left, like anime's stagger({grid})
          return (
            <span
              key={i}
              className="relative aspect-square rounded-[5px] bg-white ring-1 ring-inset ring-zinc-200"
            >
              <span
                className={`absolute inset-0 grid place-items-center rounded-[5px] text-[8px] font-semibold tabular-nums sm:text-[9px] ${CELL_CLASS[c]} motion-safe:animate-[cellfill_9s_cubic-bezier(.22,1,.36,1)_infinite_backwards]`}
                style={{ animationDelay: `${delay}s` }}
              >
                {i + 1}
              </span>
            </span>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-zinc-500">
        {(
          [
            ["answered", "Answered"],
            ["unanswered", "Not answered"],
            ["review", "Marked for review"],
            ["unvisited", "Not visited"],
          ] as const
        ).map(([k, l]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-[3px] ring-1 ring-inset ring-zinc-300 ${CELL_CLASS[k]}`} />{" "}
            {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Draw-on-scroll helpers ---------- */
function DrawLine({
  d,
  className,
  delay = 0,
  duration = 1.6,
  width = 2.5,
}: {
  d: string;
  className?: string;
  delay?: number;
  duration?: number;
  width?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.path
      data-motion
      d={d}
      fill="none"
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      initial={reduce ? false : { pathLength: 0 }}
      whileInView={{ pathLength: 1 }}
      viewport={{ once: true, margin: "-80px 0px" }}
      transition={{ duration, delay, ease: EASE }}
    />
  );
}

function Pop({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.g
      data-motion
      initial={reduce ? false : { opacity: 0, scale: 0.4 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, margin: "-80px 0px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
    >
      {children}
    </motion.g>
  );
}

/* ---------- What an assessment is: an example score line across the three kinds of test ---------- */
const JOURNEY = [
  { x: 40, y: 250, tag: "Diagnostic" },
  { x: 95, y: 228 },
  { x: 145, y: 236 },
  { x: 195, y: 196 },
  { x: 245, y: 170, tag: "Formative" },
  { x: 290, y: 142 },
  { x: 330, y: 98, tag: "Summative" },
];

export function JourneyScene({ className }: { className?: string }) {
  const d = JOURNEY.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const area = `${d} L330 290 L40 290 Z`;
  return (
    <div
      className={`rounded-3xl bg-gradient-to-b from-brand-50 to-white p-6 ring-1 ring-zinc-200 ${className ?? ""}`}
      aria-hidden
    >
      <p className="text-xs font-semibold text-ink">
        One student&apos;s scores over eight weeks
      </p>
      <p className="text-[11px] text-zinc-500">Example, not real data</p>
      <svg viewBox="0 0 370 320" className="mt-4 w-full">
        {[110, 170, 230, 290].map((y) => (
          <line
            key={y}
            x1="30"
            x2="350"
            y1={y}
            y2={y}
            className="stroke-zinc-200"
            strokeDasharray="3 5"
          />
        ))}
        <motion.path
          data-motion
          d={area}
          className="fill-brand/10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 1.2, duration: 0.8 }}
        />
        <DrawLine d={d} className="stroke-brand" duration={1.8} width={3} />
        {JOURNEY.map((p, i) => (
          <Pop key={i} delay={0.25 * i}>
            <circle
              cx={p.x}
              cy={p.y}
              r={p.tag ? 7 : 4.5}
              className={p.tag ? "fill-white stroke-brand" : "fill-brand"}
              strokeWidth="3"
            />
            {p.tag && (
              <text
                x={p.x}
                y={p.y - 16}
                textAnchor="middle"
                className="fill-ink text-[12px] font-semibold"
              >
                {p.tag}
              </text>
            )}
          </Pop>
        ))}
        <text x="40" y="312" className="fill-zinc-400 text-[11px]">
          Week 1
        </text>
        <text
          x="330"
          y="312"
          textAnchor="end"
          className="fill-zinc-400 text-[11px]"
        >
          Week 8
        </text>
      </svg>
    </div>
  );
}

/* ---------- Why it matters: rereading fades, testing yourself holds (schematic) ---------- */
export function RecallScene({ className }: { className?: string }) {
  // Rereading: one smooth decay. Testing: each test (dot) pulls recall back up, and it fades more slowly each time.
  const reread = "M30 40 C 90 150, 170 205, 380 235";
  const tests = [
    { x: 30, y: 40 },
    { x: 110, y: 58 },
    { x: 200, y: 66 },
    { x: 300, y: 70 },
  ];
  const tested =
    "M30 40 C 60 80, 90 105, 110 110 L110 58 C 145 80, 175 96, 200 100 L200 66 C 240 84, 275 94, 300 96 L300 70 C 330 80, 360 86, 380 88";
  return (
    <div
      className={`rounded-3xl border border-white/10 bg-white/[0.03] p-6 ${className ?? ""}`}
      aria-hidden
    >
      <p className="text-xs font-semibold text-white">
        How much you remember, over time
      </p>
      <p className="text-[11px] text-zinc-400">
        A sketch of the testing effect, not measured data
      </p>
      <svg viewBox="0 0 400 280" className="mt-5 w-full">
        <line x1="30" x2="30" y1="20" y2="250" className="stroke-zinc-700" />
        <line x1="30" x2="390" y1="250" y2="250" className="stroke-zinc-700" />
        <DrawLine
          d={reread}
          className="stroke-zinc-500"
          duration={1.6}
          width={2.5}
        />
        <DrawLine
          d={tested}
          className="stroke-brand-100"
          delay={0.5}
          duration={2.4}
          width={3}
        />
        {tests.slice(1).map((t, i) => (
          <Pop key={t.x} delay={0.9 + i * 0.55}>
            <circle cx={t.x} cy={t.y} r="9" className="fill-brand/30" />
            <circle cx={t.x} cy={t.y} r="4.5" className="fill-white" />
          </Pop>
        ))}
        <text
          x="386"
          y="228"
          textAnchor="end"
          className="fill-zinc-400 text-[12px]"
        >
          Rereading notes
        </text>
        <text x="386" y="112"
          textAnchor="end"
          className="fill-white text-[12px] font-semibold"
        >
          Testing yourself
        </text>
        <text x="30" y="270" className="fill-zinc-500 text-[11px]">
          Day 1
        </text>
        <text
          x="390"
          y="270"
          textAnchor="end"
          className="fill-zinc-500 text-[11px]"
        >
          Exam day
        </text>
      </svg>
      <p className="mt-2 flex items-center gap-2 text-[11px] text-zinc-400">
        <span className="h-2 w-2 rounded-full bg-white" /> each dot is a
        practice test
      </p>
    </div>
  );
}

/* ---------- Example plan: eight weeks that fill in day by day ---------- */
type Day = "topic" | "paper" | "review" | "ranked" | "rest";
const DAY_CLASS: Record<Day, string> = {
  topic: "bg-brand-100",
  paper: "bg-brand",
  review: "bg-zinc-300",
  ranked: "bg-ink",
  rest: "bg-transparent ring-1 ring-inset ring-zinc-200",
};
const WEEKS: Day[][] = [
  ["paper", "review", "rest", "rest", "rest", "rest", "rest"],
  ...Array.from(
    { length: 5 },
    () =>
      ["topic", "topic", "topic", "topic", "topic", "paper", "rest"] as Day[],
  ),
  ["paper", "review", "paper", "review", "paper", "review", "rest"],
  ["paper", "review", "paper", "review", "ranked", "review", "rest"],
];

export function PlanScene({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  return (
    <div
      className={`rounded-3xl bg-white p-5 ring-1 ring-zinc-200 sm:p-6 ${className ?? ""}`}
      aria-hidden
    >
      <div className="grid grid-cols-[2.5rem_repeat(7,minmax(0,1fr))] gap-1.5 text-center text-[10px] font-medium text-zinc-400">
        <span />
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
        {WEEKS.map((week, w) => (
          <div key={w} className="contents">
            <span className="self-center text-left text-[11px] font-semibold text-zinc-500">
              W{w + 1}
            </span>
            {week.map((d, i) => (
              <motion.span
                data-motion
                key={i}
                className={`aspect-square rounded-md ${DAY_CLASS[d]}`}
                initial={reduce ? false : { opacity: 0, scale: 0.3 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-60px 0px" }}
                transition={{
                  duration: 0.4,
                  delay: (w * 7 + i) * 0.018,
                  ease: EASE,
                }}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-zinc-500">
        {(
          [
            ["topic", "10-question topic set"],
            ["paper", "Full PYQ paper"],
            ["review", "Review mistakes"],
            ["ranked", "Ranked test"],
          ] as const
        ).map(([k, l]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-[3px] ${DAY_CLASS[k]}`} /> {l}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- About: a rippling dot field that forms Lemyte's "l" ---------- */
export function DotMarkScene({ className }: { className?: string }) {
  const N = 11;
  const inMark = (x: number, y: number) => x >= 4 && x <= 6 && y >= 1 && y <= 9; // the "l" stroke
  const inBox = (x: number, y: number) =>
    x >= 2 && x <= 8 && y >= 0 && y <= 10 && !inMark(x, y); // its blue box
  return (
    <div
      className={`grid aspect-square place-items-center rounded-3xl bg-ink p-8 ${className ?? ""}`}
      aria-hidden
    >
      <div
        className="grid w-full gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: N * N }, (_, i) => {
          const x = i % N;
          const y = Math.floor(i / N);
          const delay = (Math.hypot(x - 5, y - 5) * 0.12).toFixed(2); // ripple out from the centre
          const tone = inMark(x, y)
            ? "bg-white"
            : inBox(x, y)
              ? "bg-brand"
              : "bg-zinc-700";
          return (
            <span
              key={i}
              className={`aspect-square rounded-full ${tone} motion-safe:animate-[ripple_3.2s_ease-in-out_infinite]`}
              style={{ animationDelay: `${delay}s` }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Shared: a ticking index that pauses when off-screen or with reduced motion ---------- */
function useTicker(ms: number, n: number, start = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "0px 0px" });
  const reduce = useReducedMotion();
  const [i, setI] = useState(start);
  useEffect(() => {
    if (!inView || reduce) return;
    const id = setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => clearInterval(id);
  }, [inView, reduce, ms, n]);
  return { ref, i };
}

/* ---------- GATE overview: a miniature exam screen being worked through ---------- */
type Pal = "answered" | "notAnswered" | "marked" | "notVisited";
const PAL_CLASS: Record<Pal, string> = {
  answered: "bg-emerald-500 text-white",
  notAnswered: "bg-rose-500 text-white",
  marked: "bg-violet-500 text-white",
  notVisited: "bg-zinc-100 text-zinc-500",
};
const PAL_OF = (q: number): Pal => {
  const r = rand(q + 11);
  return r < 0.66 ? "answered" : r < 0.82 ? "marked" : "notAnswered";
};
const Q_TOTAL = 30;

export function ExamScreenScene({ className }: { className?: string }) {
  const { ref, i } = useTicker(1500, Q_TOTAL, 11);
  const time = useCountdown(2 * 3600 + 14 * 60 + 5);
  const current = i; // 0-based question being answered
  const picked = Math.floor(rand(current + 5) * 4);
  const status = PAL_OF(current);
  return (
    <div ref={ref} className={`overflow-hidden rounded-3xl bg-white shadow-2xl shadow-brand/10 ring-1 ring-zinc-200 ${className ?? ""}`} aria-hidden>
      <div className="flex items-center justify-between bg-ink px-4 py-2.5 text-[11px] text-white">
        <span className="font-semibold">GATE CS · Technical section</span>
        <span className="rounded-md bg-white/10 px-2 py-0.5 font-medium tabular-nums">Time left {time}</span>
      </div>
      <div className="grid grid-cols-[1fr_120px] sm:grid-cols-[1fr_150px]">
        <div className="border-r border-zinc-100 p-4">
          <p className="text-[11px] font-semibold text-ink">
            Question {current + 1} <span className="ml-1 font-normal text-zinc-400">· MCQ · 2 marks</span>
          </p>
          <div className="mt-3 space-y-1.5">
            <span className="block h-1.5 w-full rounded bg-zinc-200" />
            <span className="block h-1.5 w-[92%] rounded bg-zinc-200" />
            <span className="block h-1.5 w-[60%] rounded bg-zinc-200" />
          </div>
          <div className="mt-4 space-y-1.5">
            {[0, 1, 2, 3].map((o) => {
              const on = status !== "notAnswered" && o === picked;
              return (
                <div key={`${current}-${o}`} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ring-1 transition-colors duration-300 ${on ? "bg-brand-50 ring-brand" : "ring-zinc-200"}`}>
                  <span className={`grid h-3 w-3 place-items-center rounded-full ring-1 ${on ? "ring-brand" : "ring-zinc-300"}`}>
                    {on && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.5, type: "spring", stiffness: 500, damping: 22 }} className="h-1.5 w-1.5 rounded-full bg-brand" />}
                  </span>
                  <span className="block h-1.5 rounded bg-zinc-200" style={{ width: `${45 + ((o * 17 + current * 7) % 40)}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex gap-1.5 text-[9px] font-semibold sm:text-[10px]">
            <span className={`rounded-md px-2 py-1 ring-1 transition-colors ${status === "marked" ? "bg-violet-500 text-white ring-violet-500" : "text-zinc-600 ring-zinc-200"}`}>Mark for review</span>
            <span className="rounded-md px-2 py-1 text-zinc-600 ring-1 ring-zinc-200">Clear</span>
            <span className="ml-auto rounded-md bg-brand px-2 py-1 text-white">Save &amp; next</span>
          </div>
        </div>
        <div className="bg-zinc-50/70 p-3">
          <p className="text-[10px] font-semibold text-zinc-500">Question palette</p>
          <div className="mt-2 grid grid-cols-5 gap-1">
            {Array.from({ length: Q_TOTAL }, (_, q) => {
              const s: Pal = q < current ? PAL_OF(q) : "notVisited";
              return (
                <span
                  key={q}
                  className={`grid aspect-square place-items-center rounded-[4px] text-[8px] font-semibold tabular-nums transition-colors duration-500 ${PAL_CLASS[s]} ${q === current ? "ring-2 ring-brand ring-offset-1" : ""}`}
                >
                  {q + 1}
                </span>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 text-[9px] text-zinc-500">
            {(
              [
                ["answered", "Answered"],
                ["notAnswered", "Not answered"],
                ["marked", "Marked"],
              ] as const
            ).map(([k, l]) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-[2px] ${PAL_CLASS[k]}`} /> {l}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- PYQ: a stack of official papers that shuffles through years and subjects ---------- */
const PAPERS = [
  ["2026", "CS", "Computer Science & IT"],
  ["2025", "ME", "Mechanical Engineering"],
  ["2026", "EC", "Electronics & Communication"],
  ["2024", "CE", "Civil Engineering"],
  ["2025", "EE", "Electrical Engineering"],
  ["2026", "DA", "Data Science & AI"],
  ["2024", "AE", "Aerospace Engineering"],
] as const;

export function PaperStackScene({ className }: { className?: string }) {
  const n = PAPERS.length;
  const { ref, i } = useTicker(2200, n);
  const place = (pos: number) =>
    pos === 0
      ? { x: 0, y: 0, rotate: -2, scale: 1, opacity: 1 }
      : pos === 1
        ? { x: 10, y: 16, rotate: 3, scale: 0.96, opacity: 1 }
        : pos === 2
          ? { x: -8, y: 32, rotate: -5, scale: 0.92, opacity: 1 }
          : pos === n - 1
            ? { x: -90, y: -40, rotate: -14, scale: 1, opacity: 0 }
            : { x: 0, y: 44, rotate: 0, scale: 0.88, opacity: 0 };
  return (
    <div ref={ref} className={`relative mx-auto aspect-[4/5] w-full max-w-[300px] ${className ?? ""}`} aria-hidden>
      {PAPERS.map(([year, code, name], k) => {
        const pos = (k - i + n) % n;
        return (
          <motion.div
            key={code}
            initial={false}
            animate={place(pos)}
            transition={{ duration: 0.7, ease: EASE }}
            style={{ zIndex: n - pos }}
            className="absolute inset-x-0 top-0 rounded-2xl bg-white p-5 shadow-xl shadow-brand/10 ring-1 ring-zinc-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[11px] font-medium text-zinc-500">Official paper</p>
                <p className="text-2xl font-semibold tracking-tight text-ink">GATE {year}</p>
              </div>
              <span className="rounded-lg bg-brand px-2 py-1 text-xs font-semibold text-white">{code}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-600">{name}</p>
            <div className="mt-5 space-y-2">
              {[88, 96, 72, 90, 64, 84, 78].map((w, j) => (
                <span key={j} className="block h-1.5 rounded bg-zinc-100" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="mt-5 flex gap-2 text-[10px] font-medium text-zinc-600">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5">65 questions</span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5">100 marks</span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5">3 hours</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------- Topic practice: a ring of topics; one at a time pops out as a 10-question set ---------- */
const RING = [
  ["Algorithms", "weak"],
  ["Databases", "developing"],
  ["Operating Systems", "strong"],
  ["Computer Networks", "weak"],
  ["Theory of Computation", "developing"],
  ["Digital Logic", "strong"],
  ["Linear Algebra", "developing"],
  ["Calculus", "new"],
  ["Probability", "weak"],
  ["Quantitative Aptitude", "strong"],
  ["Verbal Aptitude", "developing"],
  ["Compiler Design", "new"],
] as const;
const RING_COLOR = { weak: "#f43f5e", developing: "#fbbf24", strong: "#10b981", new: "#d4d4d8" } as const;

export function TopicRingScene({ className }: { className?: string }) {
  const n = RING.length;
  const { ref, i } = useTicker(1800, n);
  const reduce = useReducedMotion();
  const R = 92;
  const C = 130;
  const gap = 0.05;
  const ang = (k: number) => (k / n) * 2 * Math.PI - Math.PI / 2;
  return (
    <div ref={ref} className={`mx-auto w-full max-w-[320px] ${className ?? ""}`} aria-hidden>
      <svg viewBox="0 0 260 260" className="w-full">
        {RING.map(([name, st], k) => {
          const a0 = ang(k) + gap;
          const a1 = ang(k + 1) - gap;
          const mid = (a0 + a1) / 2;
          const on = k === i;
          const d = `M ${C + R * Math.cos(a0)} ${C + R * Math.sin(a0)} A ${R} ${R} 0 0 1 ${C + R * Math.cos(a1)} ${C + R * Math.sin(a1)}`;
          return (
            <motion.path
              key={name}
              d={d}
              fill="none"
              stroke={RING_COLOR[st]}
              strokeLinecap="round"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1, x: on ? 10 * Math.cos(mid) : 0, y: on ? 10 * Math.sin(mid) : 0, strokeWidth: on ? 30 : 22 }}
              transition={{ pathLength: { duration: 0.6, delay: k * 0.06 }, default: { duration: 0.45, ease: EASE } }}
            />
          );
        })}
        <foreignObject x="60" y="92" width="140" height="80">
          <div className="flex h-full flex-col items-center justify-center text-center">
            <motion.p key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[13px] font-semibold leading-tight text-ink">
              {RING[i][0]}
            </motion.p>
            <p className="mt-1 text-[11px] text-brand">10 questions →</p>
          </div>
        </foreignObject>
      </svg>
      <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[10px] text-zinc-500">
        {(Object.keys(RING_COLOR) as (keyof typeof RING_COLOR)[]).map((k) => (
          <span key={k} className="flex items-center gap-1 capitalize">
            <span className="h-2 w-2 rounded-full" style={{ background: RING_COLOR[k] }} /> {k === "new" ? "Not started" : k}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------- Ranked: an example leaderboard where "You" climbs after each test ---------- */
const FIELD = [
  ["Candidate 1042", 71.33],
  ["Candidate 0317", 64.67],
  ["Candidate 2290", 58.0],
  ["Candidate 0871", 52.33],
  ["Candidate 1566", 47.67],
] as const;
const YOU = [44.33, 50.67, 61.0, 68.33];

export function LeaderboardScene({ className }: { className?: string }) {
  const { ref, i } = useTicker(2200, YOU.length);
  const rows = [...FIELD.map(([name, score]) => ({ name, score, you: false })), { name: "You", score: YOU[i], you: true }].sort((a, b) => b.score - a.score);
  const rank = rows.findIndex((r) => r.you) + 1;
  return (
    <div ref={ref} className={`rounded-3xl bg-white p-5 shadow-xl shadow-brand/10 ring-1 ring-zinc-200 ${className ?? ""}`} aria-hidden>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink">Example leaderboard</p>
        <motion.span key={rank} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-white">
          Your rank: {rank} of {rows.length}
        </motion.span>
      </div>
      <ol className="mt-4 space-y-1.5">
        {rows.map((r, k) => (
          <motion.li
            layout
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            key={r.name}
            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${r.you ? "bg-brand text-white shadow-lg shadow-brand/30" : "bg-zinc-50 text-zinc-700"}`}
          >
            <span className={`w-5 text-xs font-semibold tabular-nums ${r.you ? "text-brand-100" : "text-zinc-400"}`}>{k + 1}</span>
            <span className="flex-1 truncate font-medium">{r.name}</span>
            <span className="font-semibold tabular-nums">{r.score.toFixed(2)}</span>
          </motion.li>
        ))}
      </ol>
      <p className="mt-3 text-[11px] text-zinc-400">Illustration only. Real ranks come from everyone who takes the same test.</p>
    </div>
  );
}
