// src/app/gate/practice/topics/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

import { useAccess } from "@/components/site/AccessCta";
import { useRouter } from "next/navigation";
import { ArrowRight, Layers3, Search } from "lucide-react";
import { safeJson } from "@/lib/fetch-helpers";
import { CountUp, LoadingScene } from "@/components/motion";
import { TopicRingScene } from "@/components/motion/scenes";
import { PageHero } from "@/components/site/PageHero";

interface Subject {
  id: string;
  code: string;
  name: string;
}

interface Topic {
  id: string;
  subjectId: string | null;
  code: string;
  name: string;
  sectionKind: string;
  pyqCount: number;
}

const COUNT_OPTIONS = [5, 10, 15, 20, 30];

// A topic picked before sign-in or buying a plan: ?topic=&count= in the URL, else this tab's sessionStorage.
type Pick = { topicId: string; count: number };
const PICK_KEY = "lm_topic_pick";
function readPick(): Pick | null {
  const q = new URLSearchParams(window.location.search);
  if (q.get("topic")) return { topicId: q.get("topic")!, count: Number(q.get("count")) || 10 };
  try {
    return JSON.parse(sessionStorage.getItem(PICK_KEY) ?? "null");
  } catch {
    return null;
  }
}
function savePick(p: Pick) {
  try {
    sessionStorage.setItem(PICK_KEY, JSON.stringify(p));
  } catch {}
}
function clearPick() {
  try {
    sessionStorage.removeItem(PICK_KEY);
  } catch {}
}

export default function TopicPracticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(
    null,
  );
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const access = useAccess();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gate/topics", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        const nextSubjects = j.subjects ?? [];
        const nextTopics: Topic[] = j.topics ?? [];
        setSubjects(nextSubjects);
        setTopics(nextTopics);
        if (nextSubjects.length > 0) {
          setSelectedSubjectId(nextSubjects[0].id);
        }
        const saved = readPick();
        const t = saved && nextTopics.find((x) => x.id === saved.topicId);
        if (t) {
          if (t.subjectId) setSelectedSubjectId(t.subjectId);
          setSelectedTopicId(t.id);
          if (COUNT_OPTIONS.includes(saved.count)) setCount(saved.count);
        }
      })
      .catch(
        (e) =>
          !cancelled &&
          setError(e?.message ?? "Couldn't load topics. Please refresh."),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSubject =
    subjects.find((s) => s.id === selectedSubjectId) ?? null;
  const selectedTopic = topics.find((t) => t.id === selectedTopicId) ?? null;

  const subjectTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = selectedSubjectId
      ? topics.filter(
          (t) => t.subjectId === selectedSubjectId || t.subjectId === null,
        ) // General Aptitude topics are shared by every paper
      : topics;
    return base.filter(
      (t) =>
        !q || `${t.name} ${t.code} ${t.sectionKind}`.toLowerCase().includes(q),
    );
  }, [topics, selectedSubjectId, query]);

  const totalPyqs = useMemo(
    () => topics.reduce((sum, t) => sum + Number(t.pyqCount ?? 0), 0),
    [topics],
  );

  async function startTopicPractice() {
    if (!selectedTopicId) return;
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/gate/practice/topic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicId: selectedTopicId, count }),
      });
      const data = await safeJson(res);

      if (res.status === 401 || res.status === 403) {
        // Keep the student's choice through sign-in or buying a plan; it is restored on return.
        savePick({ topicId: selectedTopicId, count });
        router.push(
          res.status === 401
            ? `/gate/auth/sign-in?next=${encodeURIComponent(`/gate/practice/topics?topic=${selectedTopicId}&count=${count}`)}`
            : "/gate/pricing",
        );
        return;
      }
      if (!res.ok) {
        throw new Error(
          data.error ?? `Failed to set up practice (${res.status})`,
        );
      }

      clearPick();
      router.push(
        `/gate/instructions?test=${data.testVersionId}&mode=PRACTICE`,
      );
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't start practice. Please try again.",
      );
      setBusy(false);
    }
  }

  return (
    <div className="bg-white">
      <PageHero
        eyebrow="Test series · Topic-wise"
        title="Practise one topic at a time"
        lead="Pick a subject and a topic, choose how many questions you want, and get a short timed test made of past GATE questions from that topic."
        art={<TopicRingScene />}
      >
        <div className="mt-8 grid max-w-md grid-cols-3 gap-3">
          {(
            [
              [subjects.length, "Subjects"],
              [topics.length, "Topics"],
              [totalPyqs, "Past questions"],
            ] as const
          ).map(([v, l]) => (
            <div
              key={l}
              className="rounded-2xl border border-zinc-200 bg-white/80 p-4 backdrop-blur"
            >
              <p className="text-2xl font-semibold text-ink">
                <CountUp to={v} />
              </p>
              <p className="text-xs font-medium text-zinc-500">{l}</p>
            </div>
          ))}
        </div>
      </PageHero>

      <section className="mx-auto max-w-7xl px-4 py-12">
        {error ? (
          <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <LoadingScene
            label="Loading topics…"
            className="rounded-2xl border border-zinc-200 bg-white"
          />
        ) : subjects.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-10 text-sm font-semibold text-amber-800">
            Topics aren&apos;t available right now. Please check back soon.
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_340px]">
            <aside className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="px-2 text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                Subject
              </h2>
              <div className="mt-3 grid gap-1">
                {subjects.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedSubjectId(s.id);
                      setSelectedTopicId(null);
                    }}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                      selectedSubjectId === s.id
                        ? "bg-brand text-white"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-ink"
                    }`}
                  >
                    <span className="block">{s.name}</span>
                    <span className="mt-1 block text-xs opacity-80">
                      {s.code}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <main>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">
                    {selectedSubject?.name ?? "Topics"}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    Start with a topic that cost you marks in your last test.
                  </p>
                </div>
                <label className="relative block sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search topics"
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-brand focus:ring-4 focus:ring-brand/10"
                  />
                </label>
              </div>

              {subjectTopics.length === 0 ? (
                <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500">
                  No topics match your search.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {subjectTopics.map((t) => {
                    const disabled = t.pyqCount === 0;
                    const selected = selectedTopicId === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => !disabled && setSelectedTopicId(t.id)}
                        disabled={disabled}
                        className={`rounded-2xl border p-5 text-left transition ${
                          disabled
                            ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400"
                            : selected
                              ? "border-brand bg-brand/5"
                              : "border-zinc-200 bg-white hover:border-brand/40 hover:shadow-lg"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-semibold text-ink">{t.name}</h3>
                            <p className="mt-1 text-xs text-zinc-500">
                              {t.sectionKind === "GA"
                                ? "General Aptitude"
                                : t.sectionKind === "FOUNDATION"
                                  ? "Engineering Mathematics"
                                  : "Core subject"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${disabled ? "bg-zinc-100 text-zinc-400" : "bg-brand/10 text-brand"}`}
                          >
                            {t.pyqCount} question{t.pyqCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </main>

            <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm lg:col-span-2 xl:sticky xl:top-24 xl:col-span-1 xl:self-start">
              <Layers3 className="h-7 w-7 text-brand" />
              <h2 className="mt-4 text-xl font-semibold text-ink">
                Your practice set
              </h2>
              {selectedTopic ? (
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  <span className="font-semibold text-ink">
                    {selectedTopic.name}
                  </span>
                  . A small set you can review properly afterwards works better
                  than a long one.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Choose a topic to begin.
                </p>
              )}

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.08em] text-zinc-500">
                  Question count
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COUNT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`min-h-11 min-w-11 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        count === n
                          ? "border-brand bg-brand text-white"
                          : "border-zinc-300 hover:border-zinc-950"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  You get about 2 minutes per question, up to 60 minutes.
                </p>
              </div>

              {access && !access.hasPlan && (
                <p className="mt-5 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-6 text-zinc-700">
                  Topic-wise tests are included with every plan.{" "}
                  {access.signedIn ? "Pick a topic, then choose a plan;" : "Pick a topic, then sign in;"} your choice is kept.
                </p>
              )}

              <button
                onClick={startTopicPractice}
                disabled={!selectedTopicId || busy}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Preparing your test…" : "Start practice"}
                {!busy ? <ArrowRight className="h-4 w-4" /> : null}
              </button>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
