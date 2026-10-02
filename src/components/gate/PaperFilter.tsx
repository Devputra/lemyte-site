// src/components/gate/PaperFilter.tsx — /gate/papers: pick a subject (visible chips, one tap) and optionally a
// year. All links are in the server HTML (search engines see every paper); filtering only hides groups.
// The subject is kept in the URL (?subject=da) so a link can open straight to one subject.
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Paper = { slug: string; year: number; set: number | null };
type Group = { code: string; name: string; papers: Paper[] };

export function PaperFilter({ groups }: { groups: Group[] }) {
  const [subject, setSubject] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    const s = new URLSearchParams(location.search).get("subject")?.toUpperCase();
    if (s && groups.some((g) => g.code === s)) setSubject(s);
  }, [groups]);

  const choose = (code: string | null) => {
    setSubject(code);
    const url = new URL(location.href);
    if (code) url.searchParams.set("subject", code.toLowerCase());
    else url.searchParams.delete("subject");
    history.replaceState(null, "", url);
  };

  const years = [...new Set(groups.flatMap((g) => g.papers.map((p) => p.year)))].sort((a, b) => b - a);
  const shown = groups
    .filter((g) => !subject || g.code === subject)
    .map((g) => ({ ...g, papers: g.papers.filter((p) => !year || p.year === year) }))
    .filter((g) => g.papers.length);
  const chip = (active: boolean) =>
    `shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
      active ? "border-ink bg-ink text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
    }`;

  return (
    <div>
      <div className="rounded-2xl border border-zinc-200 bg-white px-3 py-3 sm:px-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1" role="group" aria-label="Subject">
          <button type="button" onClick={() => choose(null)} className={chip(!subject)} aria-pressed={!subject}>
            All subjects
          </button>
          {groups.map((g) => (
            <button key={g.code} type="button" onClick={() => choose(g.code)} className={chip(subject === g.code)} aria-pressed={subject === g.code} title={g.name}>
              {g.code}
            </button>
          ))}
          <label className="ml-auto flex shrink-0 items-center gap-2 pl-2 text-sm text-zinc-500">
            Year
            <select
              value={year ?? ""}
              onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-sm text-ink"
            >
              <option value="">All</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="mt-8 grid gap-10">
        {shown.map((g) => (
          <section key={g.code} aria-labelledby={`s-${g.code}`} id={g.code.toLowerCase()}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id={`s-${g.code}`} className="text-lg font-semibold tracking-[-0.01em] text-ink">
                GATE {g.name} ({g.code})
              </h2>
              <Link href={`/gate/${g.code.toLowerCase()}`} className="text-sm text-brand underline underline-offset-2">
                Topic-wise weightage and 2027 syllabus
              </Link>
            </div>
            <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {g.papers.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/gate/papers/${p.slug}`}
                    className="block rounded-lg border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 transition-colors hover:border-brand hover:text-brand"
                  >
                    <span className="font-medium tabular-nums">{p.year}</span>
                    {p.set && <span className="text-zinc-500"> · Set {p.set}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {!shown.length && <p className="text-sm text-zinc-500">No paper for that subject and year.</p>}
      </div>
    </div>
  );
}
