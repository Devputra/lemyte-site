// src/app/gate/dashboard/page.tsx — student tracker: progress rings, streak, mastery, topic health.
"use client";

// User-specific page: opt out of prerendering.
export const dynamic = "force-dynamic";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, Target } from "lucide-react";

import {
  Card,
  MasteryCard,
  RingLegend,
  STATUS,
  StatRing,
  StatusLegend,
  StreakCalendar,
  TopicWheel,
  fmtTime,
  type TopicRow,
} from "@/components/gate/Tracker";
import { safeJson } from "@/lib/fetch-helpers";
import { LEVELS } from "@/lib/gate/tracker";
import { LoadingScene } from "@/components/motion";

type PeerStat = { coverage: number; accuracy: number; solved: number; tests: number; timeSec: number; points: number };

interface TrackerData {
  user: { name: string; email: string | null };
  subjects: { code: string; name: string }[];
  subject: { code: string; name: string; topics: number; pyqs: number };
  stats: PeerStat & { answered: number; graded: number; correct: number };
  peers: { count: number; avg: PeerStat; best: PeerStat; levels: number[] };
  streak: { current: number; best: number; activeDays: string[]; today: string; todayCount: number };
  level: { index: number; name: string; min: number; next: { name: string; min: number } | null; progress: number };
  topics: TopicRow[];
  focus: TopicRow[];
}

interface Dashboard {
  accessPass: { endsAt: string | null; plan: { name: string } | null } | null;
  inProgressAttemptId: string | null;
  recentAttempts: Array<{
    id: string;
    mode: string;
    status: string;
    startedAt: string;
    submittedAt: string | null;
    testTitle: string;
    result: { score: number; maxScore: number; percent: number; percentile: number | null } | null;
  }>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" });
}

function greeting(): string {
  const h = Number(new Date().toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function tagline(t: TrackerData): string {
  if (t.stats.answered === 0) return "Start with one topic today. Your tracker fills in as you practise.";
  if (t.streak.current >= 3) return `${t.streak.current} days in a row. Keep the chain going.`;
  if (t.focus[0]) return `Next best move: ${t.focus[0].name}.`;
  return "Building your foundation. Keep going.";
}

export default function GateDashboardPage() {
  const router = useRouter();
  const [showWelcome, setShowWelcome] = useState(false);
  const [subject, setSubject] = useState<string | null>(null);
  const [data, setData] = useState<TrackerData | null>(null);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyTopic, setBusyTopic] = useState<string | null>(null);
  // Topic being set up from the wheel/list: drives the full-screen overlay (and shows its error in place).
  const busyRef = useRef(false);
  const [starting, setStarting] = useState<{ name: string; error?: string } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setShowWelcome(q.get("welcome") === "1");
    setSubject(q.get("subject") ?? "");
  }, []);

  useEffect(() => {
    if (subject === null) return;
    let cancelled = false;
    setLoading(true);
    const load = async (url: string) => {
      const r = await fetch(url, { cache: "no-store" });
      if (r.status === 401) {
        router.push("/gate/auth/sign-in?next=/gate/dashboard");
        return null;
      }
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Failed to load dashboard");
      return j;
    };
    Promise.all([load(`/api/gate/me/tracker${subject ? `?subject=${subject}` : ""}`), load("/api/gate/me/dashboard")])
      .then(([t, d]) => {
        if (cancelled || !t) return;
        setData(t);
        setDash(d);
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load dashboard"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [subject, router]);

  const changeSubject = (code: string) => {
    const u = new URL(window.location.href);
    u.searchParams.set("subject", code);
    window.history.replaceState(null, "", u);
    setSubject(code);
  };

  const practise = useCallback(
    async (t: TopicRow) => {
      if (busyRef.current) return; // one request at a time
      busyRef.current = true;
      setBusyTopic(t.topicId);
      setStarting({ name: t.name });
      setError(null);
      try {
        const res = await fetch("/api/gate/practice/topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topicId: t.topicId, count: 10 }),
        });
        const d = await safeJson(res);
        if (res.status === 401) return router.push("/gate/auth/sign-in?next=/gate/dashboard");
        if (res.status === 403) return router.push("/gate/pricing");
        if (!res.ok) throw new Error(d.error ?? `Couldn't set up this practice set (${res.status}). Please try again.`);
        router.push(`/gate/instructions?test=${d.testVersionId}&mode=PRACTICE`); // overlay stays up until the page changes
      } catch (e) {
        busyRef.current = false;
        setBusyTopic(null);
        setStarting({ name: t.name, error: e instanceof Error ? e.message : "Couldn't start practice. Please try again." });
      }
    },
    [router],
  );

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <LoadingScene label="Loading your tracker…" className="rounded-2xl border border-zinc-200 bg-white" />
      </div>
    );
  }
  if (!data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error ?? "Failed to load"}</div>
      </div>
    );
  }

  const { stats, peers } = data;
  const ringMax = (k: keyof PeerStat, floor: number) => Math.max(floor, stats[k], peers.best[k]);

  return (
    <div className="bg-zinc-50/60">
      {starting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white/80 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Setting up practice">
          <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white px-6 pb-6 text-center shadow-xl shadow-brand/10">
            {starting.error ? (
              <div className="pt-8">
                <p className="font-semibold text-ink">{starting.name}</p>
                <p className="mt-2 text-sm leading-6 text-rose-700">{starting.error}</p>
                <button onClick={() => setStarting(null)} className="mt-6 inline-flex h-10 items-center rounded-[10px] bg-brand px-5 text-sm font-medium text-white hover:bg-brand-700">
                  OK
                </button>
              </div>
            ) : (
              <>
                <LoadingScene label="Picking 10 past-paper questions…" className="pb-2 pt-8" />
                <p className="-mt-1 font-semibold text-ink">{starting.name}</p>
              </>
            )}
          </div>
        </div>
      )}
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        {showWelcome && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            <div>
              <p className="font-semibold">Plan active.</p>
              <p>You can start practice and ranked mocks now.</p>
            </div>
          </div>
        )}
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

        {/* header + rings | streak */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
                  {greeting()}, <span className="capitalize">{data.user.name}</span>
                </h1>
                <p className="mt-1 text-sm font-semibold text-zinc-500">
                  GATE · {data.subject.name} · {data.subject.topics} topics · {data.subject.pyqs} PYQs
                </p>
                <p className="mt-1 text-sm italic text-zinc-500">{tagline(data)}</p>
              </div>
              <div className="flex min-w-0 max-w-full items-center gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />}
                <select
                  value={data.subject.code}
                  onChange={(e) => changeSubject(e.target.value)}
                  className="w-auto max-w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-800 outline-none focus:border-brand"
                  aria-label="GATE paper"
                >
                  {data.subjects.map((s) => (
                    <option key={s.code} value={s.code}>
                      GATE · {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-y-5 sm:grid-cols-6">
              <StatRing label="Coverage" display={`${Math.round(stats.coverage)}%`} value={stats.coverage} max={100} avg={peers.avg.coverage} best={peers.best.coverage} />
              <StatRing label="Accuracy" display={`${Math.round(stats.accuracy)}%`} value={stats.accuracy} max={100} avg={peers.avg.accuracy} best={peers.best.accuracy} />
              <StatRing label="Solved" display={String(stats.solved)} value={stats.solved} max={data.subject.pyqs || 1} avg={peers.avg.solved} best={peers.best.solved} />
              <StatRing label="Tests" display={String(stats.tests)} value={stats.tests} max={ringMax("tests", 10)} avg={peers.avg.tests} best={peers.best.tests} />
              <StatRing label="Time" display={fmtTime(stats.timeSec)} value={stats.timeSec} max={ringMax("timeSec", 3600)} avg={peers.avg.timeSec} best={peers.best.timeSec} />
              <StatRing label="Points" display={String(stats.points)} value={stats.points} max={data.level.next?.min ?? ringMax("points", 1)} avg={peers.avg.points} best={peers.best.points} />
            </div>
            <div className="mt-4 border-t border-zinc-100 pt-3">
              <RingLegend />
            </div>
          </Card>

          <StreakCalendar
            current={data.streak.current}
            best={data.streak.best}
            activeDays={data.streak.activeDays}
            today={data.streak.today}
            todayCount={data.streak.todayCount}
            total={stats.answered}
            accuracy={stats.accuracy}
          />
        </div>

        {/* plan / resume strip */}
        {dash && (dash.inProgressAttemptId || !dash.accessPass) && (
          <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-amber-900">
              {dash.inProgressAttemptId
                ? "You have a test in progress. Finish it before starting another."
                : "You are not on a paid plan yet. Try the free demo, or unlock full practice and ranked mocks."}
            </p>
            <div className="flex gap-2">
              {dash.inProgressAttemptId ? (
                <Link href={`/gate/attempt/${dash.inProgressAttemptId}`} className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">
                  Resume <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link href="/gate/demo" className="rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-950">Try demo</Link>
                  <Link href="/gate/pricing" className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white">View plans</Link>
                </>
              )}
            </div>
          </div>
        )}

        <h2 className="pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">Mastery overview</h2>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <MasteryCard
            levels={[...LEVELS]}
            level={data.level}
            points={stats.points}
            coverage={Math.round(stats.coverage)}
            accuracy={Math.round(stats.accuracy)}
            solved={stats.solved}
            peerLevels={peers.levels}
            peerCount={peers.count}
          />
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-ink">Topic health</h3>
                <p className="text-xs font-semibold text-zinc-500">Tap a topic to practise 10 questions from it.</p>
              </div>
            </div>
            <div className="hidden sm:block">
              <TopicWheel topics={data.topics} onPick={practise} busyId={busyTopic} />
            </div>
            <div className="sm:hidden">
              <div className="mx-auto max-w-[240px]">
                <TopicWheel topics={data.topics} onPick={practise} labels={false} busyId={busyTopic} />
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {data.topics.map((t) => (
                  <button key={t.topicId} onClick={() => practise(t)} disabled={busyTopic !== null} className="flex items-center gap-1.5 rounded-full border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 transition-colors active:bg-brand-50 disabled:opacity-40">
                    <span className="h-2 w-2 rounded-full" style={{ background: STATUS[t.status].color }} />
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
            <StatusLegend />
          </Card>
        </div>

        {/* focus list */}
        <Card>
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-brand" />
            <div>
              <h3 className="font-semibold text-ink">Practise next</h3>
              <p className="text-sm text-zinc-600">Your weakest topics first, then untouched topics with the most past-paper questions.</p>
            </div>
          </div>
          <div className="mt-4 divide-y divide-zinc-100">
            {data.focus.length === 0 && <p className="py-6 text-center text-sm font-semibold text-zinc-500">Nothing weak right now. Try a ranked mock.</p>}
            {data.focus.map((t) => (
              <div key={t.topicId} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-ink">{t.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[t.status].pill}`}>{STATUS[t.status].label}</span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-zinc-500">
                    {t.accuracy !== null ? `${t.accuracy}% accuracy · ` : ""}
                    {t.answered}/{t.pyqCount} PYQs answered
                  </p>
                </div>
                <button
                  onClick={() => practise(t)}
                  disabled={busyTopic !== null}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {busyTopic === t.topicId ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Practise 10
                </button>
              </div>
            ))}
          </div>
        </Card>

        {/* recent attempts */}
        <Card className="!p-0">
          <div className="border-b border-zinc-200 px-6 py-4">
            <h3 className="font-semibold text-ink">Recent attempts</h3>
            {dash?.accessPass && (
              <p className="mt-1 text-xs font-semibold text-zinc-500">
                {dash.accessPass.plan?.name ?? "Plan"} active until {fmtDate(dash.accessPass.endsAt)}
              </p>
            )}
          </div>
          {!dash || dash.recentAttempts.length === 0 ? (
            <div className="p-10 text-center text-sm font-semibold text-zinc-500">No attempts yet. Start with a free demo or topic-wise practice.</div>
          ) : (
            <div className="divide-y divide-zinc-200">
              {dash.recentAttempts.map((a) => (
                <div key={a.id} className="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <span className="truncate text-sm font-semibold text-ink">{a.testTitle}</span>
                    <p className="mt-1 text-xs font-semibold text-zinc-500">
                      {a.mode} · {a.status === "IN_PROGRESS" ? `started ${fmtDate(a.startedAt)}` : `submitted ${fmtDate(a.submittedAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    {a.result && (
                      <div className="text-right text-sm">
                        <div className="font-semibold text-ink">
                          {a.result.score}/{a.result.maxScore}
                        </div>
                        <div className="text-xs font-semibold text-zinc-500">{Math.round(a.result.percent)}%</div>
                      </div>
                    )}
                    <Link
                      href={a.status === "IN_PROGRESS" ? `/gate/attempt/${a.id}` : `/gate/report/${a.id}`}
                      className="rounded-xl border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-800 hover:border-zinc-950"
                    >
                      {a.status === "IN_PROGRESS" ? "Resume" : "View report"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}
