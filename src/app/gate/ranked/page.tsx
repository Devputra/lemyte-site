// src/app/gate/ranked/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Clock3, ShieldAlert, Trophy } from "lucide-react";

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
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load ranked mocks"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  async function startRanked(testId: string) {
    setError(null);
    setBusyId(testId);
    setConfirmId(null);
    try {
      const res = await fetch("/api/gate/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "RANKED", testVersionId: testId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/gate/auth/sign-in?next=/gate/ranked");
        return;
      }
      if (res.status === 403) {
        router.push("/gate/pricing");
        return;
      }
      if (res.status === 409 && data.attemptId) {
        router.push(`/gate/attempt/${data.attemptId}`);
        return;
      }
      if (res.status === 422) {
        setError(data.error ?? "You have already submitted this ranked test. View your report from dashboard.");
        setBusyId(null);
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to start (${res.status})`);
      }

      router.push(`/gate/attempt/${data.attemptId}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to start ranked test");
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white">
      <section className="border-b border-zinc-200 bg-zinc-950 px-4 py-14 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#8ca0ff]">
                Ranked Mocks
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
                Counted attempts. Real pressure. Serious benchmarking.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
                Ranked mocks are not casual practice. Start only when you can sit properly, use a stable connection, and treat the attempt like the real exam.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
              <ShieldAlert className="h-8 w-8 text-[#8ca0ff]" />
              <h2 className="mt-4 text-xl font-black">Before you start</h2>
              <ul className="mt-4 space-y-3 text-sm font-semibold leading-6 text-zinc-300">
                <li>• Your first submitted attempt counts.</li>
                <li>• Do not start while distracted or travelling.</li>
                <li>• Use ranked mocks to test readiness, not to learn basics.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-black tracking-tight text-zinc-950">Available ranked mocks</h2>
          <p className="mt-1 text-sm leading-6 text-zinc-600">Use practice mode first if you are not ready. Ranked mode is where preparation gets measured.</p>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500">Loading ranked mocks…</div>
        ) : tests.length === 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center text-sm font-semibold text-amber-800">
            No ranked mocks are published yet. Add a test_version with kind=RANKED and is_active=true to populate this catalog.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tests.map((t) => {
              const until = fmtDate(t.availableUntil);
              return (
                <div key={t.id} className="flex h-full flex-col rounded-3xl border border-[#193bc8]/25 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-black leading-snug text-zinc-950">{t.title}</h3>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#193bc8]/10 px-2.5 py-1 text-xs font-black text-[#193bc8]"><Trophy className="h-3.5 w-3.5" /> Ranked</span>
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
                          <p className="font-black text-amber-950">This is your counted attempt for this mock.</p>
                          <p className="mt-1 text-xs leading-5 text-amber-900">Start only if you can complete it without interruption.</p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => startRanked(t.id)}
                          disabled={busyId === t.id}
                          className="rounded-xl bg-[#193bc8] px-4 py-2 text-xs font-black text-white hover:bg-[#102b9f] disabled:opacity-60"
                        >
                          {busyId === t.id ? "Starting…" : "Yes, start"}
                        </button>
                        <button onClick={() => setConfirmId(null)} className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-black text-zinc-800 hover:bg-white">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(t.id)}
                      className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#193bc8] px-4 py-3 text-sm font-black text-white transition hover:bg-[#102b9f]"
                    >
                      Start ranked attempt <ArrowRight className="h-4 w-4" />
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
