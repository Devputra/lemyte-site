// src/components/site/SubjectBar.tsx — a thin bar that grows into view (relative size of a subject's bank).
// The visibility check watches the track, not the fill: a fill that starts at scaleX(0) has zero width,
// and browsers never report a zero-width element as visible, so it would never animate.
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef } from "react";

export function SubjectBar({ pct, active = false }: { pct: number; active?: boolean }) {
  const track = useRef<HTMLSpanElement>(null);
  const seen = useInView(track, { once: true, margin: "-40px 0px" });
  const reduce = useReducedMotion();
  return (
    <span ref={track} className="ml-auto mt-1.5 block h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-zinc-100">
      <motion.span
        data-motion
        className={`block h-full origin-left rounded-full transition-colors ${active ? "bg-ink" : "bg-brand"}`}
        style={{ width: `${Math.max(4, pct)}%` }}
        initial={reduce ? false : { scaleX: 0 }}
        animate={{ scaleX: seen || reduce ? 1 : 0 }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </span>
  );
}
