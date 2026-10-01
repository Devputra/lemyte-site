// src/components/gate/SubjectCoverage.tsx — /gate "Subjects": an animated coverage map (subject × year,
// from the real paper list) beside the subject table. Hovering a subject in either one highlights it in both.
"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { type ReactNode, useRef, useState } from "react";

import { SubjectBar } from "@/components/site/SubjectBar";
import { type Catalog, fmtInt } from "@/lib/gate/catalog";

const SHADE = ["bg-transparent ring-1 ring-inset ring-zinc-200", "bg-brand/55", "bg-brand/80", "bg-brand"];

function CoverageMap({ subjects, papers, active, onActive }: {
  subjects: Catalog["subjects"];
  papers: Catalog["papers"];
  active: string | null;
  onActive: (code: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const seen = useInView(ref, { once: true, margin: "-60px 0px" });
  const reduce = useReducedMotion();
  const yearList = papers.map((p) => p.year);
  const years = Array.from({ length: Math.max(...yearList) - Math.min(...yearList) + 1 }, (_, i) => Math.min(...yearList) + i);
  const count = (code: string, year: number) => papers.filter((p) => p.code === code && p.year === year).length;

  return (
    <div ref={ref} className="mt-10 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5" aria-hidden>
      <div className="grid items-center gap-1 sm:gap-1.5" style={{ gridTemplateColumns: `2.25rem repeat(${years.length}, minmax(0, 1fr))` }}>
        {subjects.map((s, row) => (
          <div
            key={s.code}
            className={`contents transition-opacity ${active && active !== s.code ? "[&>*]:opacity-30" : ""}`}
            onMouseEnter={() => onActive(s.code)}
            onMouseLeave={() => onActive(null)}
          >
            <span className={`text-[11px] font-semibold transition-colors ${active === s.code ? "text-brand" : "text-zinc-500"}`}>{s.code}</span>
            {years.map((y, col) => {
              const n = Math.min(3, count(s.code, y));
              return (
                <span
                  key={y}
                  title={n ? `GATE ${y} · ${s.code}${n > 1 ? ` · ${n} sets` : ""}` : undefined}
                  className={`block aspect-square transition-[opacity,transform] duration-300 ${active === s.code && n ? "scale-110" : ""}`}
                >
                  <motion.span
                    data-motion
                    className={`block h-full w-full rounded-[4px] ${SHADE[n]}`}
                    initial={reduce ? false : { opacity: 0, scale: 0.2 }}
                    animate={seen || reduce ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.2 }}
                    transition={{ duration: 0.45, delay: (row + col) * 0.035, ease: [0.22, 1, 0.36, 1] }}
                  />
                </span>
              );
            })}
          </div>
        ))}
        <span />
        {years.map((y, i) => (
          <span key={y} className="text-center text-[9px] tabular-nums text-zinc-400 sm:text-[10px]">
            {i % 2 === 0 || i === years.length - 1 ? `'${String(y).slice(2)}` : ""}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-[3px] ${SHADE[1]}`} /> 1 paper</span>
        <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-[3px] ${SHADE[2]}`} /> 2 sets</span>
        <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-[3px] ${SHADE[3]}`} /> 3 sets</span>
        <span className="flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-[3px] ${SHADE[0]}`} /> not covered</span>
      </div>
    </div>
  );
}

export function SubjectCoverage({ intro, subjects, papers }: { intro: ReactNode } & Pick<Catalog, "subjects" | "papers">) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <>
      <div>
        {intro}
        <CoverageMap subjects={subjects} papers={papers} active={active} onActive={setActive} />
      </div>
      <div className="self-start overflow-hidden rounded-2xl border border-zinc-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">Subject</th>
              <th className="px-4 py-3 text-right font-medium">Papers</th>
              <th className="px-4 py-3 text-right font-medium">Questions</th>
              <th className="hidden px-4 py-3 text-right font-medium sm:table-cell">Years</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {subjects.map((s) => (
              <tr
                key={s.code}
                onMouseEnter={() => setActive(s.code)}
                onMouseLeave={() => setActive(null)}
                className={`transition-colors ${active === s.code ? "bg-brand-50/60" : ""}`}
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-ink">{s.name}</span>
                  <span className="ml-2 text-xs text-zinc-400">{s.code}</span>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-600">{s.papers}</td>
                <td className="px-4 py-3 text-right tabular-nums text-zinc-600">
                  {fmtInt(s.questions)}
                  <SubjectBar pct={(s.questions / subjects[0].questions) * 100} active={active === s.code} />
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-500 sm:table-cell">{s.years}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
