// src/app/gate/practice/page.tsx — PYQ: full official GATE papers as practice tests, in collapsible subject groups.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Clock3, Search } from "lucide-react";

import { AnimatePresence, motion } from "framer-motion";

import { PaperStackScene } from "@/components/motion/scenes";
import { PageHero } from "@/components/site/PageHero";
import { buttonClass, Container } from "@/components/site/ui";
import { LoadingScene } from "@/components/motion";

interface CatalogTest {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  accessTier?: string | null;
  durationSeconds: number | null;
  subject: { code: string; name: string } | null;
  maxAttemptsPerUser?: number | null;
}

function fmtDuration(secs: number | null): string {
  if (!secs) return "—";
  const m = Math.round(secs / 60);
  return m % 60 === 0 ? `${m / 60} hours` : `${m} min`;
}

export default function GatePracticePage() {
  const router = useRouter();
  const [tests, setTests] = useState<CatalogTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("ALL");
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gate/tests?kind=PRACTICE", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        setTests(j.tests ?? []);
      })
      .catch(
        (e) =>
          !cancelled &&
          setError(e?.message ?? "Couldn't load the papers. Please refresh."),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = useMemo(
    () =>
      Array.from(
        new Set(tests.map((t) => t.subject?.name).filter(Boolean)),
      ).sort() as string[],
    [tests],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tests
      .filter(
        (t) =>
          (subject === "ALL" || t.subject?.name === subject) &&
          (!q ||
            `${t.title} ${t.subject?.name ?? ""}`.toLowerCase().includes(q)),
      )
      .sort((a, b) => b.title.localeCompare(a.title));
    const map = new Map<string, CatalogTest[]>();
    for (const t of list) {
      const k = t.subject?.name ?? "Other";
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [query, subject, tests]);

  async function startPractice(testId: string) {
    setBusyId(testId);
    router.push(`/gate/instructions?test=${testId}&mode=PRACTICE`);
  }

  const searching = query.trim().length > 0;
  const toggle = (name: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  return (
    <div className="bg-white">
      <PageHero
        eyebrow="Tests · PYQ"
        title="Full GATE PYQ papers"
        lead="Each test is the complete official paper: 65 questions, 100 marks and 3 hours, marked with the official answer key. You can retake any paper as often as you like."
        art={<PaperStackScene className="lg:ml-auto" />}
      >
        <p className="mt-5 text-sm text-zinc-500">
          Short on time?{" "}
          <Link
            href="/gate/practice/topics"
            className="font-medium text-brand hover:text-brand-700"
          >
            Practise a single topic instead →
          </Link>
        </p>
      </PageHero>

      <Container className="py-10">
        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_280px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by year, e.g. 2024"
              className="h-11 w-full rounded-[10px] border border-zinc-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </label>
          <select
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              if (e.target.value !== "ALL") setOpen(new Set([e.target.value]));
            }}
            className="h-11 rounded-[10px] border border-zinc-300 bg-white px-3 text-sm font-medium outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            aria-label="Subject"
          >
            <option value="ALL">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading ? (
          <LoadingScene label="Loading papers…" />
        ) : tests.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            No papers are available yet. Please check back soon.
          </p>
        ) : groups.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">
            No papers match your search.
          </p>
        ) : (
          <div className="divide-y divide-zinc-200 overflow-hidden rounded-2xl border border-zinc-200">
            {groups.map(([name, list]) => {
              const isOpen = searching || open.has(name);
              const years = list
                .map((t) => Number(t.title.match(/GATE (\d{4})/)?.[1]))
                .filter(Boolean);
              return (
                <section key={name}>
                  <button
                    onClick={() => toggle(name)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-zinc-50"
                  >
                    <span>
                      <span className="block font-semibold text-ink">
                        {name}
                      </span>
                      <span className="mt-0.5 block text-sm text-zinc-500">
                        {list.length} {list.length === 1 ? "paper" : "papers"}
                        {years.length > 0 &&
                          ` · ${Math.min(...years)}–${Math.max(...years)}`}
                      </span>
                    </span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-zinc-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="panel"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{
                          duration: 0.35,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="overflow-hidden"
                      >
                        <div className="grid gap-3 border-t border-zinc-100 bg-zinc-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4">
                          {list.map((t, k) => (
                            <motion.div
                              key={t.id}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: Math.min(k, 12) * 0.03 }}
                              className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md hover:shadow-brand/5"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-ink">
                                  {t.title.replace(` · ${name}`, "")}
                                </p>
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-zinc-500">
                                  <Clock3 className="h-3 w-3" />{" "}
                                  {fmtDuration(t.durationSeconds)} · 65 Q
                                </p>
                              </div>
                              <button
                                onClick={() => startPractice(t.id)}
                                disabled={busyId !== null}
                                className={buttonClass(
                                  { variant: "secondary", size: "sm" },
                                  "shrink-0",
                                )}
                              >
                                {busyId === t.id ? "…" : "Start"}
                              </button>
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              );
            })}
          </div>
        )}
      </Container>
    </div>
  );
}
