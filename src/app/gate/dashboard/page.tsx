// src/app/gate/dashboard/page.tsx
"use client";

// User-specific page: opt out of prerendering (uses useSearchParams).
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Target,
  Trophy,
} from "lucide-react";

interface Dashboard {
  user: { id: string; email: string | null };
  accessPass: {
    id: string;
    status: string;
    startsAt: string | null;
    endsAt: string | null;
    plan: { id: string; code: string; name: string; durationMonths: number } | null;
  } | null;
  inProgressAttemptId: string | null;
  recentAttempts: Array<{
    id: string;
    mode: "RANKED" | "PRACTICE" | "DEMO";
    status: string;
    startedAt: string;
    submittedAt: string | null;
    endsAt: string;
    testTitle: string;
    testKind: string | null;
    result: {
      score: number;
      maxScore: number;
      percent: number;
      passed: boolean;
      rank: number | null;
      percentile: number | null;
    } | null;
  }>;
  perSubject: Array<{
    subjectId: string;
    subjectName: string;
    earned: number;
    max: number;
    percent: number;
    correct: number;
    total: number;
  }>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function daysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function ModeBadge({ mode }: { mode: string }) {
  const map: Record<string, string> = {
    RANKED: "bg-[#193bc8]/10 text-[#193bc8]",
    PRACTICE: "bg-emerald-50 text-emerald-700",
    DEMO: "bg-zinc-100 text-zinc-700",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-black ${map[mode] ?? "bg-zinc-100 text-zinc-700"}`}>{mode}</span>;
}

function StatCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">{label}</p>
      <p className="mt-3 text-2xl font-black text-zinc-950">{value}</p>
      <p className="mt-1 text-sm leading-5 text-zinc-600">{helper}</p>
    </div>
  );
}

export default function GateDashboardPage() {
  const router = useRouter();
  // Read the ?welcome=1 flag without useSearchParams, which would force
  // a CSR bailout and break prerendering.
  const [showWelcome, setShowWelcome] = useState(false);
  useEffect(() => {
    setShowWelcome(new URLSearchParams(window.location.search).get("welcome") === "1");
  }, []);

  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gate/me/dashboard", { cache: "no-store" })
      .then(async (r) => {
        if (r.status === 401) {
          router.push("/gate/auth/sign-in?next=/gate/dashboard");
          return null;
        }
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "Failed to load dashboard");
        return j;
      })
      .then((j) => {
        if (cancelled || !j) return;
        setData(j);
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load dashboard"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [router]);

  const weakestSubject = useMemo(() => {
    if (!data?.perSubject?.length) return null;
    return [...data.perSubject].sort((a, b) => a.percent - b.percent)[0];
  }, [data]);

  const lastSubmitted = useMemo(() => {
    return data?.recentAttempts?.find((a) => a.status !== "IN_PROGRESS" && a.result) ?? null;
  }, [data]);

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-12"><div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500">Loading your dashboard…</div></div>;
  }

  if (error) {
    return <div className="mx-auto max-w-7xl px-4 py-12"><div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div></div>;
  }

  if (!data) return null;

  const left = daysLeft(data.accessPass?.endsAt ?? null);

  return (
    <div className="bg-white">
      <section className="border-b border-zinc-200 bg-zinc-50 px-4 py-10">
        <div className="mx-auto max-w-7xl">
          {showWelcome ? (
            <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5" />
              <div><p className="font-black">Plan active.</p><p>You can start practice and ranked mocks now.</p></div>
            </div>
          ) : null}

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-[#193bc8]/20 bg-[#193bc8]/5 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#193bc8]">
                Student Cockpit
              </div>
              <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">Your next best move.</h1>
              <p className="mt-3 text-sm font-semibold text-zinc-500">Signed in as {data.user.email ?? data.user.id}</p>
            </div>
            {data.inProgressAttemptId ? (
              <Link href={`/gate/attempt/${data.inProgressAttemptId}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#193bc8] px-6 py-3 text-sm font-black text-white hover:bg-[#102b9f]">
                Resume active attempt <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/gate/practice/topics" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#193bc8] px-6 py-3 text-sm font-black text-white hover:bg-[#102b9f]">
                Start topic practice <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Access"
            value={data.accessPass ? data.accessPass.plan?.name ?? "Active" : "No active plan"}
            helper={data.accessPass ? `Valid until ${fmtDate(data.accessPass.endsAt)}${left !== null ? ` · ${left} days left` : ""}` : "Buy access to unlock practice and ranked modes."}
          />
          <StatCard
            label="Last score"
            value={lastSubmitted?.result ? `${lastSubmitted.result.score}/${lastSubmitted.result.maxScore}` : "—"}
            helper={lastSubmitted?.result ? `${Math.round(lastSubmitted.result.percent)}% in ${lastSubmitted.testTitle}` : "Submit one attempt to get your baseline."}
          />
          <StatCard
            label="Weakest subject"
            value={weakestSubject ? weakestSubject.subjectName : "—"}
            helper={weakestSubject ? `${weakestSubject.percent}% · fix this before chasing new mocks.` : "Subject diagnosis appears after submitted attempts."}
          />
          <StatCard
            label="Active attempt"
            value={data.inProgressAttemptId ? "Resume" : "None"}
            helper={data.inProgressAttemptId ? "Finish it before starting another attempt." : "No live attempt is blocking you."}
          />
        </div>

        {!data.accessPass ? (
          <div className="mb-8 rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-black text-amber-950">You are not on a paid plan yet.</h2>
            <p className="mt-2 text-sm leading-6 text-amber-900">Start with the demo or buy access when you are ready for serious practice.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/gate/demo" className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-black text-amber-950">Try demo</Link>
              <Link href="/gate/pricing" className="rounded-xl bg-[#193bc8] px-4 py-2 text-sm font-black text-white">View plans</Link>
            </div>
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <Link href="/gate/practice" className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <BookOpenCheck className="h-7 w-7 text-[#193bc8]" />
            <h2 className="mt-4 text-lg font-black text-zinc-950">Practice tests</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">Use structured mocks for correction without leaderboard pressure.</p>
          </Link>
          <Link href="/gate/practice/topics" className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <Target className="h-7 w-7 text-[#193bc8]" />
            <h2 className="mt-4 text-lg font-black text-zinc-950">Topic-wise PYQ</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">The fastest way to close a weak topic after a poor mock result.</p>
          </Link>
          <Link href="/gate/ranked" className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <Trophy className="h-7 w-7 text-[#193bc8]" />
            <h2 className="mt-4 text-lg font-black text-zinc-950">Ranked mocks</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">Use when you are ready to benchmark under counted-attempt pressure.</p>
          </Link>
        </div>

        {data.perSubject.length > 0 ? (
          <div className="mb-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-[#193bc8]" />
              <div>
                <h2 className="text-lg font-black text-zinc-950">Subject performance</h2>
                <p className="text-sm text-zinc-600">Your correction priority should start from the lowest percentage, not your favourite subject.</p>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {[...data.perSubject].sort((a, b) => a.percent - b.percent).map((row) => (
                <div key={row.subjectId}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="font-black text-zinc-950">{row.subjectName}</span>
                    <span className="font-semibold text-zinc-500">{row.correct}/{row.total} correct · {row.percent}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-[#193bc8]" style={{ width: `${Math.min(100, Math.max(0, row.percent))}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h2 className="text-lg font-black text-zinc-950">Recent attempts</h2>
            <p className="mt-1 text-sm text-zinc-600">Every attempt should produce a correction decision.</p>
          </div>

          {data.recentAttempts.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-zinc-500">No attempts yet. Start with a free demo or topic-wise practice.</div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {data.recentAttempts.map((a) => (
                <div key={a.id} className="flex flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <ModeBadge mode={a.mode} />
                      <span className="truncate text-sm font-black text-zinc-950">{a.testTitle}</span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-zinc-500">
                      {a.status === "IN_PROGRESS" ? `Started ${fmtDate(a.startedAt)} · in progress` : `Submitted ${fmtDate(a.submittedAt)} · ${a.status}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {a.result ? (
                      <div className="text-right text-sm">
                        <div className="font-black text-zinc-950">{a.result.score}/{a.result.maxScore}</div>
                        <div className="text-xs font-semibold text-zinc-500">{Math.round(a.result.percent)}%{a.result.percentile !== null ? ` · ${a.result.percentile}%ile` : ""}</div>
                      </div>
                    ) : null}
                    {a.status === "IN_PROGRESS" ? (
                      <Link href={`/gate/attempt/${a.id}`} className="rounded-xl bg-[#193bc8] px-4 py-2 text-xs font-black text-white hover:bg-[#102b9f]">Resume</Link>
                    ) : (
                      <Link href={`/gate/report/${a.id}`} className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-black text-zinc-800 hover:border-zinc-950">View report</Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}