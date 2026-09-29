// src/components/site/SubjectBar.tsx — a thin bar that grows into view (relative size of a subject's bank).
"use client";

import { motion, useReducedMotion } from "framer-motion";

export function SubjectBar({ pct }: { pct: number }) {
  const reduce = useReducedMotion();
  return (
    <span className="ml-auto mt-1.5 block h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-zinc-100">
      <motion.span
        data-motion
        className="block h-full origin-left rounded-full bg-brand"
        style={{ width: `${Math.max(4, pct)}%` }}
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      />
    </span>
  );
}
