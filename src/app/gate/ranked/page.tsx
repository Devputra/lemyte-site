// src/app/gate/ranked/page.tsx
"use client";

import Link from "next/link";

import { fetchJson } from "@/lib/fetch-helpers";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Clock3,
  ShieldAlert,
  Trophy,
} from "lucide-react";
import { LoadingScene, Reveal } from "@/components/motion";
import { LeaderboardScene } from "@/components/motion/scenes";
import { PageHero } from "@/components/site/PageHero";

interface CatalogTest {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  accessTier?: string | null;
  durationSeconds: number | null;
  subject: { code: string; name: string } | null;
  availableFrom?: string | null;
  availableUntil?: string | null;
  maxAttemptsPerUser?: number | null;
  countedAttemptId?: string | null; // set once this student has used their counted attempt
}

function fmtMinutes(secs: number | null): string {
  if (!secs) return "—";
  return `${Math.round(secs / 60)} min`;
}

function fmtDate(value?: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/** Tests grouped by paper (subject), papers in alphabetical order of code. */
function groupBySubject(tests: CatalogTest[]) {
  const groups = new Map<string, { name: string; tests: CatalogTest[] }>();
  for (const t of tests) {
    const code = t.subject?.code ?? "Other";
    const g = groups.get(code) ?? { name: t.subject ? `${t.subject.name} (${code})` : "Other papers", tests: [] };
    g.tests.push(t);
    groups.set(code, g);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function GateRankedPage() {
  const router = useRouter();
  const [tests, setTests] = useState<CatalogTest[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [loadVersion, setLoadVersion] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchJson("/api/gate/tests?kind=RANKED", { cache: "no-store" })
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        setTests(j.tests ?? []);
      })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [loadVersion]);

  async function startRanked(testId: string) {
    setConfirmId(null);
    setBusyId(testId);
    router.push(`/gate/instructions?test=${testId}&mode=RANKED`);
  }

  return (
    <div className="bg-white">
      <PageHero
        eyebrow="Test series · Ranked"
        title="See how you compare"
        lead="A ranked test gives you one counted attempt. Your score is ranked against everyone who takes the same test, so treat it like the real exam: sit somewhere quiet, keep your connection stable and give it the full time."
        art={<LeaderboardScene className="mx-auto max-w-sm" />}
      >
        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white/80 p-5 backdrop-blur">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-brand" strokeWidth={1.75} />
            <h2 className="font-semibold text-ink">Before you start</h2>
          </div>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-zinc-600">
            <li>Each test is 65 past GATE questions in the official pattern: 100 marks, 3 hours.</li>
            <li>You get one counted attempt. It counts when you submit or when time runs out.</li>
            <li>The timer keeps running if you close the tab.</li>
            <li>Not ready yet? Take a past paper in practice mode first.</li>
          </ul>
        </div>
      </PageHero>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">
            Open ranked tests
          </h2>
        </div>

        {loadError ? (
          <div role="alert" className="rounded-xl border border-zinc-200 p-5 text-sm">
            Couldn&apos;t load. <button onClick={() => setLoadVersion((n) => n + 1)} className="min-h-11 px-3 text-brand underline">Retry</button>
          </div>
        ) : loading ? (
          <LoadingScene
            label="Loading ranked tests…"
            className="rounded-2xl border border-zinc-200 bg-white"
          />
        ) : tests.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">
            There are no ranked tests open right now. New ones are announced on
            this page.
          </div>
        ) : (
          <div className="space-y-10">
          {groupBySubject(tests).map(([code, group]) => (
          <section key={code} aria-label={group.name}>
          <h3 className="mb-4 text-base font-semibold text-ink">{group.name}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.tests.map((t, i) => {
              const until = fmtDate(t.availableUntil);
              return (
                <Reveal
                  key={t.id}
                  delay={i * 0.06}
                  className="flex h-full flex-col rounded-2xl border border-brand/25 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand/10"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-snug text-ink">
                      {t.title}
                    </h3>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
                      <Trophy className="h-3.5 w-3.5" /> Ranked
                    </span>
                  </div>

                  {t.description ? (
                    <p className="mt-3 text-sm leading-6 text-zinc-600">
                      {t.description}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-zinc-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1">
                      <Clock3 className="h-3.5 w-3.5" />{" "}
                      {fmtMinutes(t.durationSeconds)}
                    </span>
                    {t.subject ? (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1">
                        {t.subject.name}
                      </span>
                    ) : null}
                    {until ? (
                      <span className="rounded-full bg-zinc-100 px-2.5 py-1">
                        Until {until}
                      </span>
                    ) : null}
                  </div>

                  {t.countedAttemptId ? (
                    <Link
                      href={`/gate/report/${t.countedAttemptId}`}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 px-4 py-3 text-sm font-semibold text-ink transition hover:border-brand hover:text-brand"
                    >
                      View your rank and report <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : confirmId === t.id ? (
                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                      <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                          <p className="font-semibold text-amber-950">
                            This will be your counted attempt.
                          </p>
                          <p className="mt-1 text-xs leading-5 text-amber-900">
                            Start only if you have time to finish it in one
                            sitting.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => startRanked(t.id)}
                          disabled={busyId === t.id}
                          className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                        >
                          {busyId === t.id ? "Starting…" : "Yes, start"}
                        </button>
                        <button
                          onClick={() => setConfirmId(null)}
                          className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(t.id)}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-700"
                    >
                      Start ranked test <ArrowRight className="h-4 w-4" />
                    </button>
                  )}
                </Reveal>
              );
            })}
          </div>
          </section>
          ))}
          </div>
        )}
      </section>
    </div>
  );
}
