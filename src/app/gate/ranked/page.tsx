// src/app/gate/ranked/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Clock3, ShieldAlert, Trophy } from "lucide-react";
import { LoadingScene } from "@/components/motion";

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

export default function GateRankedPage() {
  const router = useRouter();
  const [tests, setTests] = useState<CatalogTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gate/tests?kind=RANKED", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        setTests(j.tests ?? []);
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Couldn't load ranked tests. Please refresh."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function startRanked(testId: string) {
    setConfirmId(null);
    setBusyId(testId);
    router.push(`/gate/instructions?test=${testId}&mode=RANKED`);
  }

  return (
    <div className="bg-white">
      <section className="border-b border-zinc-100">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:px-6 sm:py-16 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <p className="text-sm font-medium text-brand">Ranked tests</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">See how you compare</h1>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600">
              A ranked test gives you one counted attempt. Your score is ranked against everyone who takes the same test,
              so treat it like the real exam: sit somewhere quiet, keep your connection stable and give it the full time.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-6">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-brand" strokeWidth={1.75} />
              <h2 className="font-semibold text-ink">Before you start</h2>
            </div>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-zinc-600">
              <li>Only your first submitted attempt counts towards your rank.</li>
              <li>The timer keeps running if you close the tab.</li>
              <li>Not ready yet? Take a past paper in practice mode first.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6">
        <div className="mb-8">
          <h2 className="text-xl font-semibold tracking-[-0.01em] text-ink">Open ranked tests</h2>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        ) : null}

        {loading ? (
          <LoadingScene label="Loading ranked tests…" className="rounded-2xl border border-zinc-200 bg-white" />
        ) : tests.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">
            There are no ranked tests open right now. New ones are announced on this page.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tests.map((t) => {
              const until = fmtDate(t.availableUntil);
              return (
                <div key={t.id} className="flex h-full flex-col rounded-2xl border border-brand/25 bg-white p-6 shadow-sm transition">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold leading-snug text-ink">{t.title}</h3>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand"><Trophy className="h-3.5 w-3.5" /> Ranked</span>
                  </div>

                  {t.description ? <p className="mt-3 text-sm leading-6 text-zinc-600">{t.description}</p> : null}

                  <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-zinc-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1"><Clock3 className="h-3.5 w-3.5" /> {fmtMinutes(t.durationSeconds)}</span>
                    {t.subject ? <span className="rounded-full bg-zinc-100 px-2.5 py-1">{t.subject.name}</span> : null}
                    {until ? <span className="rounded-full bg-zinc-100 px-2.5 py-1">Until {until}</span> : null}
                  </div>

                  {confirmId === t.id ? (
                    <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">
                      <div className="flex gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                        <div>
                          <p className="font-semibold text-amber-950">This will be your counted attempt.</p>
                          <p className="mt-1 text-xs leading-5 text-amber-900">Start only if you have time to finish it in one sitting.</p>
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
                        <button onClick={() => setConfirmId(null)} className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800 hover:bg-white">Cancel</button>
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
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
