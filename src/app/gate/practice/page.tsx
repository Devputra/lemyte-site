// src/app/gate/practice/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpenCheck, Clock3, Filter, RefreshCw, Search } from "lucide-react";

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

function fmtMinutes(secs: number | null): string {
  if (!secs) return "—";
  return `${Math.round(secs / 60)} min`;
}

function inferDifficultyLabel(text: string): string {
  const v = text.toLowerCase();
  if (v.includes("stress") || v.includes("hard") || v.includes("rank booster")) return "Rank Booster";
  if (v.includes("pyq")) return "PYQ";
  return "GATE Standard";
}

export default function GatePracticePage() {
  const router = useRouter();
  const [tests, setTests] = useState<CatalogTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("ALL");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gate/tests?kind=PRACTICE", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        setTests(j.tests ?? []);
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = useMemo(() => {
    return Array.from(new Set(tests.map((t) => t.subject?.name).filter(Boolean))) as string[];
  }, [tests]);

  const filteredTests = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tests.filter((t) => {
      const matchesQuery = !q || `${t.title} ${t.description ?? ""} ${t.subject?.name ?? ""}`.toLowerCase().includes(q);
      const matchesSubject = subject === "ALL" || t.subject?.name === subject;
      return matchesQuery && matchesSubject;
    });
  }, [query, subject, tests]);

  async function startPractice(testId: string) {
    setError(null);
    setBusyId(testId);
    try {
      const res = await fetch("/api/gate/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "PRACTICE", testVersionId: testId }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/gate/auth/sign-in?next=/gate/practice");
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
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to start (${res.status})`);
      }

      router.push(`/gate/attempt/${data.attemptId}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to start practice test");
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white">
      <section className="border-b border-zinc-200 bg-zinc-50 px-4 py-14">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <div className="inline-flex rounded-full border border-[#193bc8]/20 bg-[#193bc8]/5 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#193bc8]">
              Practice Mode
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
              Build strength before full mock pressure.
            </h1>
            <p className="mt-4 text-base leading-7 text-zinc-600">
              Practice mode is for correction, not ego. Attempt, submit, review, and use the report to decide the next topic.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <RefreshCw className="h-6 w-6 text-[#193bc8]" />
              <h2 className="mt-3 font-black">Reattempt-friendly</h2>
              <p className="mt-1 text-sm text-zinc-600">Practice is where you rebuild weak areas.</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <BookOpenCheck className="h-6 w-6 text-[#193bc8]" />
              <h2 className="mt-3 font-black">PYQ-oriented</h2>
              <p className="mt-1 text-sm text-zinc-600">Pattern familiarity before artificial difficulty.</p>
            </div>
            <div className="rounded-2xl border border-zinc-200 bg-white p-5">
              <Filter className="h-6 w-6 text-[#193bc8]" />
              <h2 className="mt-3 font-black">Clear purpose</h2>
              <p className="mt-1 text-sm text-zinc-600">Each test should tell you what to fix next.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-zinc-950">Practice tests</h2>
            <p className="mt-1 text-sm text-zinc-600">Choose a structured practice set or go topic-wise for sharper revision.</p>
          </div>
          <Link href="/gate/practice/topics" className="inline-flex items-center gap-2 rounded-xl bg-zinc-950 px-4 py-2.5 text-sm font-black text-white hover:bg-[#193bc8]">
            Practice by topic <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_240px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search mocks, subjects, descriptions..."
              className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#193bc8] focus:ring-4 focus:ring-[#193bc8]/10"
            />
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm font-semibold outline-none focus:border-[#193bc8] focus:ring-4 focus:ring-[#193bc8]/10"
          >
            <option value="ALL">All subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500">Loading practice tests…</div>
        ) : tests.length === 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-center text-sm font-semibold text-amber-800">
            No practice mocks are published yet. Add a test_version with kind=PRACTICE and is_active=true to populate this catalog.
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500">No practice tests match your filters.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTests.map((t) => {
              const difficulty = inferDifficultyLabel(`${t.title} ${t.description ?? ""}`);
              return (
                <div key={t.id} className="flex h-full flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-black leading-snug text-zinc-950">{t.title}</h3>
                    <span className="shrink-0 rounded-full bg-[#193bc8]/10 px-2.5 py-1 text-xs font-black text-[#193bc8]">{difficulty}</span>
                  </div>

                  {t.description ? <p className="mt-3 text-sm leading-6 text-zinc-600">{t.description}</p> : null}

                  <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold text-zinc-600">
                    <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1"><Clock3 className="h-3.5 w-3.5" /> {fmtMinutes(t.durationSeconds)}</span>
                    {t.subject ? <span className="rounded-full bg-zinc-100 px-2.5 py-1">{t.subject.name}</span> : null}
                    {t.maxAttemptsPerUser ? <span className="rounded-full bg-zinc-100 px-2.5 py-1">Max {t.maxAttemptsPerUser} attempts</span> : null}
                  </div>

                  <button
                    onClick={() => startPractice(t.id)}
                    disabled={busyId === t.id}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#193bc8] px-4 py-3 text-sm font-black text-white transition hover:bg-[#102b9f] disabled:opacity-60"
                  >
                    {busyId === t.id ? "Starting…" : "Start practice"}
                    {busyId !== t.id ? <ArrowRight className="h-4 w-4" /> : null}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
