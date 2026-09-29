// src/components/motion/scenes.tsx — code-drawn animated scenes that replace stock illustrations.
// Style reference: animejs.com (grid staggers, self-drawing lines, ripples). Built with CSS keyframes
// (loops, no JS needed) and framer-motion (draw-on-scroll). All deterministic, so SSR matches the client.
"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* Stable pseudo-random in [0,1) from an integer, so server and client render the same pattern. */
const rand = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------- Hero: a 65-question answer sheet that marks itself in a wave ---------- */
type Cell = "correct" | "wrong" | "review" | "skip";
const CELL_CLASS: Record<Cell, string> = {
  correct: "bg-brand text-white",
  wrong: "bg-rose-500 text-white",
  review: "bg-amber-400 text-ink",
  skip: "bg-zinc-300 text-zinc-600",
};
const SHEET: Cell[] = Array.from({ length: 65 }, (_, i) => {
  const r = rand(i + 3);
  return r < 0.62
    ? "correct"
    : r < 0.8
      ? "wrong"
      : r < 0.88
        ? "review"
        : "skip";
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

export function AnswerSheetScene({ className }: { className?: string }) {
  const time = useCountdown(3 * 3600 - 1);
  const COLS = 13;
  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-brand-50 via-white to-white p-5 ring-1 ring-zinc-200 sm:p-7 ${className ?? ""}`}
      aria-hidden
    >
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-ink">
          GATE paper · 65 questions
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
        {SHEET.map((c, i) => {
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
            ["correct", "Correct"],
            ["wrong", "Wrong"],
            ["review", "Marked for review"],
            ["skip", "Not answered"],
          ] as const
        ).map(([k, l]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-[3px] ${CELL_CLASS[k]}`} />{" "}
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
      <p className="text-[11px] text-zinc-500">
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
