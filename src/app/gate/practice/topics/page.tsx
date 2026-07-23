// src/app/gate/practice/topics/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Layers3, Search } from "lucide-react";

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

export default function TopicPracticePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gate/topics", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j.error) throw new Error(j.error);
        const nextSubjects = j.subjects ?? [];
        setSubjects(nextSubjects);
        setTopics(j.topics ?? []);
        if (nextSubjects.length > 0) {
          setSelectedSubjectId(nextSubjects[0].id);
        }
      })
      .catch((e) => !cancelled && setError(e?.message ?? "Failed to load topics"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedSubject = subjects.find((s) => s.id === selectedSubjectId) ?? null;
  const selectedTopic = topics.find((t) => t.id === selectedTopicId) ?? null;

  const subjectTopics = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = selectedSubjectId ? topics.filter((t) => t.subjectId === selectedSubjectId) : topics;
    return base.filter((t) => !q || `${t.name} ${t.code} ${t.sectionKind}`.toLowerCase().includes(q));
  }, [topics, selectedSubjectId, query]);

  const totalPyqs = useMemo(() => topics.reduce((sum, t) => sum + Number(t.pyqCount ?? 0), 0), [topics]);

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
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        router.push("/gate/auth/sign-in?next=/gate/practice/topics");
        return;
      }
      if (res.status === 403) {
        router.push("/gate/pricing");
        return;
      }
      if (!res.ok) {
        throw new Error(data.error ?? `Failed to set up practice (${res.status})`);
      }

      const startRes = await fetch("/api/gate/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "PRACTICE", testVersionId: data.testVersionId }),
      });
      const startData = await startRes.json().catch(() => ({}));
      if (startRes.status === 409 && startData.attemptId) {
        router.push(`/gate/attempt/${startData.attemptId}`);
        return;
      }
      if (!startRes.ok) {
        throw new Error(startData.error ?? `Failed to start attempt (${startRes.status})`);
      }
      router.push(`/gate/attempt/${startData.attemptId}`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to start topic practice");
      setBusy(false);
    }
  }

  return (
    <div className="bg-white">
      <section className="border-b border-zinc-200 bg-zinc-50 px-4 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-zinc-500">
                <Link href="/gate/practice" className="hover:text-zinc-950">Practice</Link>
                <span>/</span>
                <span className="text-zinc-950">Topic-wise PYQ</span>
              </div>
              <div className="inline-flex rounded-full border border-[#193bc8]/20 bg-[#193bc8]/5 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#193bc8]">
                Daily Correction Engine
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
                Fix one weak topic at a time.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
                Full mocks reveal the wound. Topic practice closes it. Pick the subject, choose question count, and start a focused PYQ attempt.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[460px]">
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-2xl font-black text-zinc-950">{subjects.length}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Subjects</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-2xl font-black text-zinc-950">{topics.length}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">Topics</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="text-2xl font-black text-zinc-950">{totalPyqs}</p>
                <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">PYQs</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12">
        {error ? (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500">Loading topics…</div>
        ) : subjects.length === 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-10 text-sm font-semibold text-amber-800">
            No subjects are configured. Seed gate.subjects and gate.topics to enable topic-wise practice.
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-[280px_1fr_340px]">
            <aside className="rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="px-2 text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Subject</h2>
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
                        ? "bg-[#193bc8] text-white shadow-lg shadow-[#193bc8]/20"
                        : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                    }`}
                  >
                    <span className="block">{s.name}</span>
                    <span className="mt-1 block text-xs opacity-70">{s.code}</span>
                  </button>
                ))}
              </div>
            </aside>

            <main>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-2xl font-black text-zinc-950">{selectedSubject?.name ?? "Topics"}</h2>
                  <p className="mt-1 text-sm text-zinc-600">Choose the exact leak you want to fix today.</p>
                </div>
                <label className="relative block sm:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search topic..."
                    className="h-11 w-full rounded-xl border border-zinc-300 bg-white pl-10 pr-3 text-sm outline-none focus:border-[#193bc8] focus:ring-4 focus:ring-[#193bc8]/10"
                  />
                </label>
              </div>

              {subjectTopics.length === 0 ? (
                <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm font-semibold text-zinc-500">No topics found for this selection.</div>
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
                        className={`rounded-3xl border p-5 text-left transition ${
                          disabled
                            ? "cursor-not-allowed border-zinc-200 bg-zinc-50 text-zinc-400"
                            : selected
                            ? "border-[#193bc8] bg-[#193bc8]/5 shadow-lg shadow-[#193bc8]/10"
                            : "border-zinc-200 bg-white hover:-translate-y-1 hover:border-[#193bc8]/40 hover:shadow-lg"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <h3 className="font-black text-zinc-950">{t.name}</h3>
                            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-zinc-500">{t.code} · {t.sectionKind}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-black ${disabled ? "bg-zinc-100 text-zinc-400" : "bg-[#193bc8]/10 text-[#193bc8]"}`}>
                            {t.pyqCount} PYQ{t.pyqCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </main>

            <aside className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-24 lg:self-start">
              <Layers3 className="h-7 w-7 text-[#193bc8]" />
              <h2 className="mt-4 text-xl font-black text-zinc-950">Start focused practice</h2>
              {selectedTopic ? (
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  Selected: <span className="font-black text-zinc-950">{selectedTopic.name}</span>. Keep the set small enough to review fully after submission.
                </p>
              ) : (
                <p className="mt-2 text-sm leading-6 text-zinc-600">Select a topic with available PYQs to begin.</p>
              )}

              <div className="mt-5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">Question count</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {COUNT_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => setCount(n)}
                      className={`rounded-xl border px-3 py-2 text-sm font-black transition ${
                        count === n
                          ? "border-[#193bc8] bg-[#193bc8] text-white"
                          : "border-zinc-300 hover:border-zinc-950"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">Duration is derived at roughly 2 minutes per question, capped at 60 minutes.</p>
              </div>

              <button
                onClick={startTopicPractice}
                disabled={!selectedTopicId || busy}
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#193bc8] px-5 py-3 text-sm font-black text-white transition hover:bg-[#102b9f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Setting up…" : "Start topic practice"}
                {!busy ? <ArrowRight className="h-4 w-4" /> : null}
              </button>

              <div className="mt-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <BookOpenCheck className="h-5 w-5 text-[#193bc8]" />
                <p className="mt-2 text-xs font-semibold leading-5 text-zinc-600">
                  Brutal truth: full mocks alone are inefficient. Most improvement comes from repeatedly closing topic-level leaks.
                </p>
              </div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
