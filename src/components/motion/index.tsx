// src/components/motion/index.tsx — Lemyte motion primitives (see docs/DESIGN.md → Motion).
// Rules: motion explains or guides, never decorates for its own sake; everything respects
// prefers-reduced-motion; nothing hijacks scrolling; canvases pause when off-screen.
"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

const EASE = [0.22, 1, 0.36, 1] as const;

/* ---------- Reveal: fade + rise when scrolled into view ---------- */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section";
}) {
  const reduce = useReducedMotion();
  const Comp = motion[as];
  return (
    <Comp
      data-motion
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px 0px" }}
      transition={{ duration: 0.7, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
}

/* ---------- SplitWords: word-by-word stagger for headlines ---------- */
export function SplitWords({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  const words = text.split(" ");
  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      {words.map((w, i) => (
        <span key={i} aria-hidden className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <motion.span
            data-motion
            className="inline-block"
            initial={reduce ? false : { y: "110%" }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: EASE, delay: delay + i * 0.06 }}
          >
            {w}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ---------- CountUp: numbers count up once visible ---------- */
export function CountUp({ to, duration = 1.4, format = (n: number) => n.toLocaleString("en-IN") }: { to: number; duration?: number; format?: (n: number) => string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px 0px" });
  const reduce = useReducedMotion();
  // Server render and first paint show the real number (no-JS, crawlers); the count starts once visible.
  const [value, setValue] = useState(to);
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (reduce || armed) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r || r.top <= window.innerHeight) return; // already on screen: keep the number, don't flash to 0
    setValue(0);
    setArmed(true);
  }, [reduce, armed]);
  useEffect(() => {
    if (!armed) setValue(to); // data arrived after mount (or on-screen): show it as is
  }, [to, armed]);
  useEffect(() => {
    if (!inView || reduce || !armed) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / (duration * 1000));
      setValue(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, armed, to, duration]);
  return (
    <span ref={ref} className="tabular-nums">
      {format(value)}
    </span>
  );
}

/* ---------- Marquee: infinite, pausable, CSS-driven ---------- */
export function Marquee({ children, speed = 40, className }: { children: ReactNode; speed?: number; className?: string }) {
  return (
    <div className={`group relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)] ${className ?? ""}`}>
      {[0, 1].map((k) => (
        <div
          key={k}
          aria-hidden={k === 1}
          className="flex shrink-0 items-center gap-3 pr-3 motion-safe:animate-[marquee_var(--d)_linear_infinite] group-hover:[animation-play-state:paused]"
          style={{ ["--d" as string]: `${speed}s` }}
        >
          {children}
        </div>
      ))}
    </div>
  );
}

/* ---------- Magnetic: subtle pull toward the cursor (pointer devices only) ---------- */
export function Magnetic({ children, strength = 0.25 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });
  const y = useSpring(useMotionValue(0), { stiffness: 250, damping: 18 });
  function move(e: React.PointerEvent) {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  return (
    <motion.div ref={ref} style={{ x, y }} onPointerMove={move} onPointerLeave={() => (x.set(0), y.set(0))} className="inline-block">
      {children}
    </motion.div>
  );
}

/* ---------- ScrollProgress: reading indicator under the header ---------- */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 });
  return <motion.div aria-hidden className="fixed inset-x-0 top-0 z-50 h-[2px] origin-left bg-brand" style={{ scaleX }} />;
}

/* ---------- DrawPath: SVG stroke that draws with scroll progress ---------- */
export function useSectionProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.8", "end 0.6"] });
  return { ref, progress: scrollYProgress };
}

export function DrawPath({ d, progress, className, strokeWidth = 2 }: { d: string; progress: MotionValue<number>; className?: string; strokeWidth?: number }) {
  const reduce = useReducedMotion();
  const pathLength = useTransform(progress, [0, 1], [0, 1]);
  return (
    <motion.path
      d={d}
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
      style={{ pathLength: reduce ? 1 : pathLength }}
    />
  );
}

/* ---------- Constellation: light particle network on a canvas ---------- */
export function Constellation({ className, density = 0.00009, rgb = "25,59,200" }: { className?: string; density?: number; rgb?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = true;
    const pointer = { x: -9999, y: -9999 };
    type P = { x: number; y: number; vx: number; vy: number };
    let pts: P[] = [];
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width;
      h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.max(18, Math.min(70, Math.round(w * h * density)));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25 }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of pts) {
        if (!reduce) {
          p.x += p.vx;
          p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
      }
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const a = pts[i];
          const b = pts[j];
          const d2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
          if (d2 < 130 * 130) {
            ctx.strokeStyle = `rgba(${rgb},${0.14 * (1 - d2 / (130 * 130))})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        const pd = (pts[i].x - pointer.x) ** 2 + (pts[i].y - pointer.y) ** 2;
        ctx.fillStyle = pd < 120 * 120 ? `rgba(${rgb},0.9)` : `rgba(${rgb},0.35)`;
        ctx.beginPath();
        ctx.arc(pts[i].x, pts[i].y, pd < 120 * 120 ? 2.2 : 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      cancelAnimationFrame(raf);
      if (visible) raf = requestAnimationFrame(draw);
    });
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
    };
    resize();
    draw();
    io.observe(canvas);
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, [reduce, density, rgb]);
  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className ?? ""}`} />;
}

/* ---------- Loading: an illustrated loading scene ---------- */

/** An answer sheet being filled in: lines draw, answers tick, a timer ring runs. */
export function LoadingScene({ label = "Loading…", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={`flex flex-col items-center justify-center gap-5 py-16 ${className ?? ""}`}>
      <svg viewBox="0 0 160 120" className="h-28 w-36" aria-hidden>
        <rect x="18" y="8" width="96" height="104" rx="10" className="fill-white stroke-zinc-200" strokeWidth="2" />
        {[0, 1, 2, 3].map((i) => (
          <g key={i} style={{ animationDelay: `${i * 0.35}s` }} className="motion-safe:animate-[sheetline_2.8s_ease-in-out_infinite]">
            <circle cx="34" cy={30 + i * 22} r="5" className="fill-none stroke-zinc-300" strokeWidth="2" />
            <path d={`M31 ${30 + i * 22} l2.5 2.5 l4.5 -5`} className="fill-none stroke-brand" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1" style={{ animationDelay: `${i * 0.35}s` }} />
            <rect x="46" y={27 + i * 22} width={i % 2 ? 44 : 56} height="6" rx="3" className="fill-zinc-200" />
          </g>
        ))}
        <circle cx="128" cy="32" r="18" className="fill-white stroke-zinc-200" strokeWidth="2" />
        <circle cx="128" cy="32" r="18" className="fill-none stroke-brand motion-safe:animate-[timer_2.8s_linear_infinite]" strokeWidth="2.5" strokeLinecap="round" pathLength={100} strokeDasharray="100" transform="rotate(-90 128 32)" />
        <path d="M128 22v10l6 4" className="fill-none stroke-ink" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium text-zinc-500">{label}</p>
    </div>
  );
}
