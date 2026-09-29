// src/app/gate/practice/page.tsx — catalog of full past papers (practice tests), grouped by subject.
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock3, Search } from "lucide-react";

import { buttonClass, Container, Eyebrow, type } from "@/components/site/ui";
import { safeJson } from "@/lib/fetch-helpers";

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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gate/tests?kind=PRACTICE", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        setTests(j.tests ?? []);
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Couldn't load the papers. Please refresh."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = useMemo(
    () => Array.from(new Set(tests.map((t) => t.subject?.name).filter(Boolean))).sort() as string[],
    [tests],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = tests
      .filter((t) => (subject === "ALL" || t.subject?.name === subject) && (!q || `${t.title} ${t.subject?.name ?? ""}`.toLowerCase().includes(q)))
      .sort((a, b) => b.title.localeCompare(a.title));
    const map = new Map<string, CatalogTest[]>();
    for (const t of list) {
      const k = t.subject?.name ?? "Other";
      map.set(k, [...(map.get(k) ?? []), t]);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
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
      const data = await safeJson(res);
      if (res.status === 401) return router.push("/gate/auth/sign-in?next=/gate/practice");
      if (res.status === 403) return router.push("/gate/pricing");
      if (res.status === 409 && data.attemptId) return router.push(`/gate/attempt/${data.attemptId}`);
      if (!res.ok) throw new Error(data.error ?? `Couldn't start the test (${res.status}).`);
      router.push(`/gate/attempt/${data.attemptId}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Couldn't start the test. Please try again.");
      setBusyId(null);
    }
  }

  return (
    <div className="bg-white">
      <section className="border-b border-zinc-100">
        <Container className="py-12 sm:py-16">
          <Eyebrow>Past papers</Eyebrow>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">Take a full GATE paper</h1>
          <p className={`${type.lead} mt-4 max-w-2xl`}>
            Each test is the complete official paper: 65 questions, 100 marks and 3 hours, marked with the official answer
            key. You can retake any paper as often as you like.
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            Short on time?{" "}
            <Link href="/gate/practice/topics" className="font-medium text-brand hover:text-brand-700">
              Practise a single topic instead →
            </Link>
          </p>
        </Container>
      </section>

      <Container className="py-10">
        <div className="mb-8 grid gap-3 md:grid-cols-[1fr_280px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by year or subject, e.g. 2024"
              className="h-11 w-full rounded-[10px] border border-zinc-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
            />
          </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
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

        {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        {loading ? (
          <p className="py-16 text-center text-sm text-zinc-500">Loading papers…</p>
        ) : tests.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">No papers are available yet. Please check back soon.</p>
        ) : groups.length === 0 ? (
          <p className="py-16 text-center text-sm text-zinc-500">No papers match your search.</p>
        ) : (
          <div className="space-y-10">
            {groups.map(([name, list]) => (
              <section key={name}>
                <div className="flex items-baseline justify-between border-b border-zinc-200 pb-3">
                  <h2 className="text-lg font-semibold text-ink">{name}</h2>
                  <span className="text-sm text-zinc-500">{list.length} papers</span>
                </div>
                <ul className="divide-y divide-zinc-100">
                  {list.map((t) => (
                    <li key={t.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-ink">{t.title.replace(` · ${name}`, "")}</p>
                        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-zinc-500">
                          <Clock3 className="h-3.5 w-3.5" /> {fmtDuration(t.durationSeconds)} · 65 questions · 100 marks
                        </p>
                      </div>
                      <button
                        onClick={() => startPractice(t.id)}
                        disabled={busyId !== null}
                        className={buttonClass({ variant: "secondary", size: "sm" }, "shrink-0")}
                      >
                        {busyId === t.id ? "Starting…" : "Start paper"}
                        {busyId !== t.id && <ArrowRight className="h-4 w-4" />}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </Container>
    </div>
  );
}
