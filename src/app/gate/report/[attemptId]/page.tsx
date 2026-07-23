//src/app/gate/report/[attemptId]/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import GateMarkdown, { GateOptionMarkdown } from "@/components/GateMarkdown";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type FilterKey = "ALL" | "CORRECT" | "WRONG" | "UNANSWERED";
type ResultStatus = "CORRECT" | "WRONG" | "UNANSWERED";

interface AttemptReport {
  attempt: {
    id: string;
    mode: string;
    status: string;
    startedAt: string;
    submittedAt: string | null;
    endsAt: string;
  };
  test?: {
    id: string;
    title: string;
    passPercent: number;
  };
  results: {
    score: number;
    max_score: number;
    percent: number;
    passed: boolean;
    source?: string;
  } | null;
  summary?: {
    totalQuestions: number;
    attemptedCount: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    accuracyPercent: number;
    negativeMarksLost: number;
    durationUsedSeconds: number;
  };
  metadata: {
    shuffle_seed: string | null;
    question_order_hash: string | null;
    questionOrderSource?: string | null;
  } | null;
  sectionSummary?: Array<{
    section: string;
    totalQuestions: number;
    attemptedCount: number;
    correctCount: number;
    wrongCount: number;
    unansweredCount: number;
    score: number;
    maxScore: number;
    accuracyPercent: number;
  }>;
  reviewQuestions?: Array<{
    questionNumber: number;
    questionVersionId: string;
    type: string;
    section: string;
    marks: number;
    questionMarkdown: string;
    questionText: string;
    options: Array<{
      id: string;
      markdown: string;
      text: string;
      isCorrect: boolean;
      isSelected: boolean;
    }>;
    correctOptionIds: string[];
    selectedOptionIds: string[] | null;
    natValueRaw: string | null;
    natValueNormalized: number | null;
    answered: boolean;
    correct: boolean;
    earnedMarks: number;
    maxMarks: number;
    resultStatus: ResultStatus;
    explanationMarkdown: string | null;
  }>;
  // Keep compatibility with the earlier shape.
  questionScores?: Array<{
    question_version_id: string;
    earned_marks: number;
    max_marks: number;
    correct: boolean;
  }>;
  answers?: Array<{
    question_version_id: string;
    selected_option_ids: string[] | null;
    nat_value_raw: string | null;
    nat_value_normalized: number | null;
  }>;
}

function safeNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function formatCompactNumber(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function formatSignedMarks(value: number): string {
  const abs = formatCompactNumber(Math.abs(value));
  if (value > 0) return `+${abs}`;
  if (value < 0) return `-${abs}`;
  return "0";
}

function formatPercent(value: number): string {
  return `${safeNumber(value).toFixed(2).replace(/\.?0+$/, "")}%`;
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatDurationSeconds(totalSeconds: number | null | undefined): string {
  const secs = Math.max(0, Math.floor(safeNumber(totalSeconds, 0)));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function modeLabel(mode: string | null | undefined): string {
  const normalized = String(mode ?? "").toUpperCase();
  if (normalized === "DEMO") return "Demo Attempt";
  if (normalized === "PRACTICE") return "Practice Attempt";
  if (normalized === "RANKED") return "Ranked Attempt";
  return "Mock Test Attempt";
}

function humanizeStatus(status: ResultStatus): string {
  if (status === "CORRECT") return "Correct";
  if (status === "WRONG") return "Wrong";
  return "Unanswered";
}

function resultBadgeClasses(status: ResultStatus) {
  if (status === "CORRECT") {
    return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  }

  if (status === "WRONG") {
    return "bg-red-50 text-red-700 ring-1 ring-red-200";
  }

  return "bg-gray-100 text-gray-700 ring-1 ring-gray-200";
}

function optionCardClasses(params: {
  isCorrect: boolean;
  isSelected: boolean;
}) {
  const { isCorrect, isSelected } = params;

  if (isCorrect && isSelected) {
    return "border-emerald-300 bg-emerald-50";
  }

  if (isCorrect) {
    return "border-emerald-300 bg-emerald-50";
  }

  if (isSelected) {
    return "border-red-300 bg-red-50";
  }

  return "border-gray-200 bg-white";
}

function buildInsight(params: {
  passed: boolean;
  attemptedCount: number;
  totalQuestions: number;
  accuracyPercent: number;
  negativeMarksLost: number;
  wrongCount: number;
  unansweredCount: number;
}) {
  const {
    passed,
    attemptedCount,
    totalQuestions,
    accuracyPercent,
    negativeMarksLost,
    wrongCount,
    unansweredCount,
  } = params;

  if (passed) {
    return `You cleared this attempt with ${formatPercent(
      accuracyPercent
    )} accuracy on attempted questions. The next jump now is improving consistency on higher-weight questions.`;
  }

  if (wrongCount > 0 && negativeMarksLost > 0) {
    return `You attempted ${attemptedCount} of ${totalQuestions} questions, but accuracy was only ${formatPercent(
      accuracyPercent
    )}. Negative marking cost you ${formatCompactNumber(
      negativeMarksLost
    )} marks, which means your main issue was risky attempts rather than low participation.`;
  }

  if (unansweredCount > 0) {
    return `You left ${unansweredCount} question${
      unansweredCount === 1 ? "" : "s"
    } unanswered. That is acceptable only if it protects accuracy. Your next step is to improve confidence on easier questions before forcing more attempts.`;
  }

  return `Your score needs improvement. Focus first on raising accuracy and reducing wasteful negative marks before increasing total attempts.`;
}

function scrollToQuestionReview() {
  if (typeof window === "undefined") return;
  document.getElementById("question-review")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export default function GateReportPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;

  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AttemptReport | null>(null);
  const [filter, setFilter] = useState<FilterKey>("ALL");
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        setPending(false);

        const res = await fetch(`/api/gate/attempts/${attemptId}/report`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));

        if (res.status === 202) {
          if (alive) {
            setPending(true);
            setReport(null);
          }
          return;
        }

        if (!res.ok) {
          throw new Error(data.error ?? `Failed (${res.status})`);
        }

        if (alive) {
          setReport(data);
        }
      } catch (e: any) {
        if (alive) {
          setError(e?.message ?? "Failed to load report");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      alive = false;
    };
  }, [attemptId]);

  const allQuestions = useMemo(() => {
    return [...(report?.reviewQuestions ?? [])].sort(
      (a, b) => a.questionNumber - b.questionNumber
    );
  }, [report]);

  const derivedSummary = useMemo(() => {
    const summary = report?.summary;

    if (summary && report?.results) {
      return {
        totalQuestions: safeNumber(summary.totalQuestions),
        attemptedCount: safeNumber(summary.attemptedCount),
        correctCount: safeNumber(summary.correctCount),
        wrongCount: safeNumber(summary.wrongCount),
        unansweredCount: safeNumber(summary.unansweredCount),
        accuracyPercent: safeNumber(summary.accuracyPercent),
        negativeMarksLost: safeNumber(summary.negativeMarksLost),
        durationUsedSeconds: safeNumber(summary.durationUsedSeconds),
        score: safeNumber(report.results.score),
        maxScore: safeNumber(report.results.max_score),
        percent: safeNumber(report.results.percent),
        passed: Boolean(report.results.passed),
      };
    }

    const totalQuestions = allQuestions.length;
    const attemptedCount = allQuestions.filter((q) => q.answered).length;
    const correctCount = allQuestions.filter((q) => q.resultStatus === "CORRECT").length;
    const wrongCount = allQuestions.filter((q) => q.resultStatus === "WRONG").length;
    const unansweredCount = allQuestions.filter(
      (q) => q.resultStatus === "UNANSWERED"
    ).length;
    const accuracyPercent =
      attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;
    const negativeMarksLost = allQuestions
      .filter((q) => q.earnedMarks < 0)
      .reduce((sum, q) => sum + Math.abs(q.earnedMarks), 0);

    return {
      totalQuestions,
      attemptedCount,
      correctCount,
      wrongCount,
      unansweredCount,
      accuracyPercent,
      negativeMarksLost,
      durationUsedSeconds: 0,
      score: safeNumber(report?.results?.score),
      maxScore: safeNumber(report?.results?.max_score),
      percent: safeNumber(report?.results?.percent),
      passed: Boolean(report?.results?.passed),
    };
  }, [allQuestions, report]);

  const filteredQuestions = useMemo(() => {
    if (filter === "ALL") return allQuestions;
    if (filter === "CORRECT") {
      return allQuestions.filter((q) => q.resultStatus === "CORRECT");
    }
    if (filter === "WRONG") {
      return allQuestions.filter((q) => q.resultStatus === "WRONG");
    }
    return allQuestions.filter((q) => q.resultStatus === "UNANSWERED");
  }, [allQuestions, filter]);

  useEffect(() => {
    if (filteredQuestions.length === 0) {
      setActiveQuestionId(null);
      return;
    }

    setActiveQuestionId((prev) => {
      if (prev && filteredQuestions.some((q) => q.questionVersionId === prev)) {
        return prev;
      }
      return filteredQuestions[0].questionVersionId;
    });
  }, [filteredQuestions]);

  const activeQuestion = useMemo(() => {
    if (!activeQuestionId) return null;
    return allQuestions.find((q) => q.questionVersionId === activeQuestionId) ?? null;
  }, [activeQuestionId, allQuestions]);

  const progressSegments = useMemo(() => {
    if (derivedSummary.totalQuestions === 0) {
      return { correct: 0, wrong: 0, unanswered: 0 };
    }

    return {
      correct:
        (derivedSummary.correctCount / derivedSummary.totalQuestions) * 100,
      wrong: (derivedSummary.wrongCount / derivedSummary.totalQuestions) * 100,
      unanswered:
        (derivedSummary.unansweredCount / derivedSummary.totalQuestions) * 100,
    };
  }, [derivedSummary]);

  const sectionSummary = useMemo(() => {
    return [...(report?.sectionSummary ?? [])].sort((a, b) =>
      String(a.section).localeCompare(String(b.section))
    );
  }, [report]);

  const insight = useMemo(() => {
    return buildInsight({
      passed: derivedSummary.passed,
      attemptedCount: derivedSummary.attemptedCount,
      totalQuestions: derivedSummary.totalQuestions,
      accuracyPercent: derivedSummary.accuracyPercent,
      negativeMarksLost: derivedSummary.negativeMarksLost,
      wrongCount: derivedSummary.wrongCount,
      unansweredCount: derivedSummary.unansweredCount,
    });
  }, [derivedSummary]);

  const filterOptions: Array<{
    key: FilterKey;
    label: string;
    count: number;
  }> = [
    { key: "ALL", label: "All", count: derivedSummary.totalQuestions },
    { key: "CORRECT", label: "Correct", count: derivedSummary.correctCount },
    { key: "WRONG", label: "Wrong", count: derivedSummary.wrongCount },
    {
      key: "UNANSWERED",
      label: "Unanswered",
      count: derivedSummary.unansweredCount,
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 lg:px-8">
        <Card>
          <CardContent className="flex min-h-[240px] items-center justify-center text-sm text-gray-500">
            Preparing your report…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle>Report is still being prepared</CardTitle>
            <CardDescription>
              Grading may still be finishing. Refresh this page in a moment.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => window.location.reload()}>Refresh</Button>
            <Button variant="outline" asChild>
              <Link href="/gate">Back to GATE Mocks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !report?.results) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-6">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle>Failed to load report</CardTitle>
            <CardDescription>{error ?? "Something went wrong."}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => window.location.reload()}>Try Again</Button>
            <Button variant="outline" asChild>
              <Link href="/gate">Back to GATE Mocks</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6 lg:px-8">
      <div className="space-y-8">
        {/* Header */}
        <section className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#00A86B]/10 px-3 py-1 text-xs font-semibold text-[#00A86B]">
                {modeLabel(report.attempt.mode)}
              </span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                {report.attempt.status}
              </span>
              {report.metadata?.questionOrderSource ? (
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                  Order: {report.metadata.questionOrderSource}
                </span>
              ) : null}
            </div>

            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Mock Test Report
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {report.test?.title ?? "GATE CS/IT Mock"} · Submitted on{" "}
                {formatDateTime(report.attempt.submittedAt)}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Time used: {formatDurationSeconds(derivedSummary.durationUsedSeconds)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link href="/gate">Back to GATE Mocks</Link>
            </Button>
            <Button
              onClick={() => {
                if (!activeQuestion && filteredQuestions.length > 0) {
                  setActiveQuestionId(filteredQuestions[0].questionVersionId);
                }
                scrollToQuestionReview();
              }}
            >
              Review Answers
            </Button>
            <Button asChild>
              <Link href="/gate/demo">Take Another Mock</Link>
            </Button>
          </div>
        </section>

        {/* Summary cards */}
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-6">
          <Card>
            <CardContent className="flex h-full flex-col justify-center gap-1 py-6">
              <div className="text-sm text-gray-500">Score</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatCompactNumber(derivedSummary.score)}
              </div>
              <div className="text-sm text-gray-500">
                / {formatCompactNumber(derivedSummary.maxScore)} marks
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex h-full flex-col justify-center gap-1 py-6">
              <div className="text-sm text-gray-500">Result</div>
              <div
                className={`text-2xl font-bold ${
                  derivedSummary.passed ? "text-[#00A86B]" : "text-red-600"
                }`}
              >
                {derivedSummary.passed ? "Passed" : "Not Passed"}
              </div>
              <div className="text-sm text-gray-500">
                {formatPercent(derivedSummary.percent)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex h-full flex-col justify-center gap-1 py-6">
              <div className="text-sm text-gray-500">Accuracy</div>
              <div className="text-2xl font-bold text-gray-900">
                {formatPercent(derivedSummary.accuracyPercent)}
              </div>
              <div className="text-sm text-gray-500">on attempted questions</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex h-full flex-col justify-center gap-1 py-6">
              <div className="text-sm text-gray-500">Attempted</div>
              <div className="text-2xl font-bold text-gray-900">
                {derivedSummary.attemptedCount} / {derivedSummary.totalQuestions}
              </div>
              <div className="text-sm text-gray-500">questions</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex h-full flex-col justify-center gap-1 py-6">
              <div className="text-sm text-gray-500">Correct</div>
              <div className="text-2xl font-bold text-[#00A86B]">
                {derivedSummary.correctCount}
              </div>
              <div className="text-sm text-gray-500">correct answers</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex h-full flex-col justify-center gap-1 py-6">
              <div className="text-sm text-gray-500">Negative Marks Lost</div>
              <div className="text-2xl font-bold text-red-600">
                {formatCompactNumber(derivedSummary.negativeMarksLost)}
              </div>
              <div className="text-sm text-gray-500">lost to wrong attempts</div>
            </CardContent>
          </Card>
        </section>

        {/* Insight + section performance */}
        <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <Card className="border-[#00A86B]/20">
            <CardHeader>
              <CardTitle>Performance Insight</CardTitle>
              <CardDescription>
                What this attempt says about your current test strategy.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-gray-700">{insight}</p>

              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div className="rounded-lg border bg-gray-50 p-4">
                  <div className="text-gray-500">Attempt Rate</div>
                  <div className="mt-1 font-semibold text-gray-900">
                    {derivedSummary.totalQuestions > 0
                      ? formatPercent(
                          (derivedSummary.attemptedCount /
                            derivedSummary.totalQuestions) *
                            100
                        )
                      : "0%"}
                  </div>
                </div>

                <div className="rounded-lg border bg-gray-50 p-4">
                  <div className="text-gray-500">Wrong Attempts</div>
                  <div className="mt-1 font-semibold text-red-600">
                    {derivedSummary.wrongCount}
                  </div>
                </div>

                <div className="rounded-lg border bg-gray-50 p-4">
                  <div className="text-gray-500">Unanswered</div>
                  <div className="mt-1 font-semibold text-gray-900">
                    {derivedSummary.unansweredCount}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Section Performance</CardTitle>
              <CardDescription>
                Quick split of score and accuracy by section.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sectionSummary.length > 0 ? (
                sectionSummary.map((section) => (
                  <div
                    key={section.section}
                    className="rounded-xl border bg-gray-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {section.section}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {section.correctCount} correct · {section.wrongCount} wrong ·{" "}
                          {section.unansweredCount} unanswered
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatCompactNumber(section.score)} /{" "}
                          {formatCompactNumber(section.maxScore)}
                        </div>
                        <div className="mt-1 text-sm text-gray-500">
                          {formatPercent(section.accuracyPercent)} accuracy
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border p-4 text-sm text-gray-500">
                  Section-wise breakdown is not available for this attempt yet.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Distribution */}
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Performance Distribution</CardTitle>
              <CardDescription>
                Correct, wrong, and unanswered split across this attempt.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="h-3 w-3 rounded-full bg-[#00A86B]" />
                  Correct: {derivedSummary.correctCount}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="h-3 w-3 rounded-full bg-red-500" />
                  Wrong: {derivedSummary.wrongCount}
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <span className="h-3 w-3 rounded-full bg-gray-300" />
                  Unanswered: {derivedSummary.unansweredCount}
                </div>
              </div>

              <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100">
                <div className="flex h-full w-full">
                  <div
                    className="h-full bg-[#00A86B]"
                    style={{ width: `${progressSegments.correct}%` }}
                  />
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${progressSegments.wrong}%` }}
                  />
                  <div
                    className="h-full bg-gray-300"
                    style={{ width: `${progressSegments.unanswered}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-3 text-sm text-gray-600 md:grid-cols-3">
                <div className="rounded-lg border bg-gray-50 p-4">
                  <div className="font-medium text-gray-900">Accuracy</div>
                  <div className="mt-1">
                    {formatPercent(derivedSummary.accuracyPercent)}
                  </div>
                </div>
                <div className="rounded-lg border bg-gray-50 p-4">
                  <div className="font-medium text-gray-900">Net Score</div>
                  <div className="mt-1">
                    {formatCompactNumber(derivedSummary.score)} /{" "}
                    {formatCompactNumber(derivedSummary.maxScore)}
                  </div>
                </div>
                <div className="rounded-lg border bg-gray-50 p-4">
                  <div className="font-medium text-gray-900">Negative Loss</div>
                  <div className="mt-1">
                    {formatCompactNumber(derivedSummary.negativeMarksLost)} marks
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Per-question analysis */}
        <section>
          <Card>
            <CardHeader className="gap-4">
              <div>
                <CardTitle>Per-Question Analysis</CardTitle>
                <CardDescription>
                  Filter questions, inspect attempt behavior, and open any question
                  for full review.
                </CardDescription>
              </div>

              <div className="flex flex-wrap gap-2">
                {filterOptions.map((item) => {
                  const active = filter === item.key;

                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        active
                          ? "border-[#00A86B] bg-[#00A86B] text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {item.label} ({item.count})
                    </button>
                  );
                })}
              </div>
            </CardHeader>

            <CardContent>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-xl border md:block">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th className="px-4 py-3 font-medium">Q No.</th>
                      <th className="px-4 py-3 font-medium">Section</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Marks Earned</th>
                      <th className="px-4 py-3 font-medium">Attempt</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredQuestions.map((question) => (
                      <tr
                        key={question.questionVersionId}
                        className={`border-t text-gray-700 ${
                          question.questionVersionId === activeQuestionId
                            ? "bg-[#00A86B]/5"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {question.questionNumber}
                        </td>
                        <td className="px-4 py-3">{question.section}</td>
                        <td className="px-4 py-3">{question.type}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${resultBadgeClasses(
                              question.resultStatus
                            )}`}
                          >
                            {humanizeStatus(question.resultStatus)}
                          </span>
                        </td>
                        <td
                          className={`px-4 py-3 font-medium ${
                            question.earnedMarks > 0
                              ? "text-[#00A86B]"
                              : question.earnedMarks < 0
                              ? "text-red-600"
                              : "text-gray-700"
                          }`}
                        >
                          {formatSignedMarks(question.earnedMarks)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {question.type === "NAT"
                            ? question.natValueRaw
                              ? `NAT: ${question.natValueRaw}`
                              : "—"
                            : question.selectedOptionIds?.length
                            ? `Option ${question.selectedOptionIds
                                .join(", ")
                                .toUpperCase()}`
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveQuestionId(question.questionVersionId);
                              scrollToQuestionReview();
                            }}
                            className="rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredQuestions.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-gray-500">
                          No questions match this filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {filteredQuestions.map((question) => (
                  <div
                    key={question.questionVersionId}
                    className={`rounded-xl border p-4 shadow-sm ${
                      question.questionVersionId === activeQuestionId
                        ? "border-[#00A86B]/40 bg-[#00A86B]/5"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-gray-500">
                          Question {question.questionNumber} · {question.section}
                        </div>
                        <div className="mt-1 font-medium text-gray-900">
                          {question.type === "NAT"
                            ? question.natValueRaw
                              ? `NAT: ${question.natValueRaw}`
                              : "No answer submitted"
                            : question.selectedOptionIds?.length
                            ? `Selected: ${question.selectedOptionIds
                                .join(", ")
                                .toUpperCase()}`
                            : "No answer submitted"}
                        </div>
                      </div>

                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${resultBadgeClasses(
                          question.resultStatus
                        )}`}
                      >
                        {humanizeStatus(question.resultStatus)}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-gray-50 p-3">
                        <div className="text-gray-500">Earned</div>
                        <div
                          className={`mt-1 font-semibold ${
                            question.earnedMarks > 0
                              ? "text-[#00A86B]"
                              : question.earnedMarks < 0
                              ? "text-red-600"
                              : "text-gray-700"
                          }`}
                        >
                          {formatSignedMarks(question.earnedMarks)}
                        </div>
                      </div>

                      <div className="rounded-lg bg-gray-50 p-3">
                        <div className="text-gray-500">Max</div>
                        <div className="mt-1 font-semibold text-gray-900">
                          {formatCompactNumber(question.maxMarks)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => {
                          setActiveQuestionId(question.questionVersionId);
                          scrollToQuestionReview();
                        }}
                      >
                        Review Question
                      </Button>
                    </div>
                  </div>
                ))}

                {filteredQuestions.length === 0 && (
                  <div className="rounded-xl border p-6 text-center text-sm text-gray-500">
                    No questions match this filter.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Question review */}
        <section id="question-review">
          <Card>
            <CardHeader>
              <CardTitle>Question Review</CardTitle>
              <CardDescription>
                Inspect the selected question, your answer, the correct answer, and
                the marks outcome.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!activeQuestion ? (
                <div className="rounded-xl border p-6 text-sm text-gray-500">
                  Choose a question from the analysis table above to review it in detail.
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          Question {activeQuestion.questionNumber}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          {activeQuestion.section}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          {activeQuestion.type}
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          {formatCompactNumber(activeQuestion.marks)} marks
                        </span>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${resultBadgeClasses(
                            activeQuestion.resultStatus
                          )}`}
                        >
                          {humanizeStatus(activeQuestion.resultStatus)}
                        </span>
                      </div>

                      <div className="text-sm text-gray-500">
                        Earned {formatSignedMarks(activeQuestion.earnedMarks)} out of{" "}
                        {formatCompactNumber(activeQuestion.maxMarks)}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        disabled={
                          !filteredQuestions.some(
                            (q) => q.questionVersionId !== activeQuestion.questionVersionId
                          )
                        }
                        onClick={() => {
                          const idx = filteredQuestions.findIndex(
                            (q) => q.questionVersionId === activeQuestion.questionVersionId
                          );
                          if (idx > 0) {
                            setActiveQuestionId(filteredQuestions[idx - 1].questionVersionId);
                          }
                        }}
                      >
                        Previous
                      </Button>

                      <Button
                        variant="outline"
                        disabled={
                          !filteredQuestions.some(
                            (q) => q.questionVersionId !== activeQuestion.questionVersionId
                          )
                        }
                        onClick={() => {
                          const idx = filteredQuestions.findIndex(
                            (q) => q.questionVersionId === activeQuestion.questionVersionId
                          );
                          if (idx >= 0 && idx < filteredQuestions.length - 1) {
                            setActiveQuestionId(filteredQuestions[idx + 1].questionVersionId);
                          }
                        }}
                      >
                        Next
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-xl border bg-white p-5">
                    <div className="mb-3 text-sm font-medium text-gray-500">
                      Question
                    </div>
                    <GateMarkdown content={activeQuestion.questionMarkdown} />
                  </div>

                  {activeQuestion.type === "NAT" ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Your Submitted Value</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm text-gray-700">
                          {activeQuestion.natValueRaw ? (
                            <div className="rounded-lg border bg-gray-50 p-4 font-medium text-gray-900">
                              {activeQuestion.natValueRaw}
                            </div>
                          ) : (
                            <div className="rounded-lg border bg-gray-50 p-4 text-gray-500">
                              No answer submitted.
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Review Note</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm leading-7 text-gray-700">
                          {activeQuestion.correct ? (
                            <p>
                              Your submitted NAT answer was accepted for full credit.
                            </p>
                          ) : activeQuestion.answered ? (
                            <p>
                              Your NAT answer did not match the accepted value or range.
                              Exact accepted bounds are not included in the current report
                              payload yet.
                            </p>
                          ) : (
                            <p>
                              You left this NAT question unanswered.
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-sm font-medium text-gray-500">Options</div>

                      <div className="space-y-3">
                        {activeQuestion.options.map((option) => (
                          <div
                            key={option.id}
                            className={`rounded-xl border p-4 ${optionCardClasses({
                              isCorrect: option.isCorrect,
                              isSelected: option.isSelected,
                            })}`}
                          >
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                              <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                                Option {option.id.toUpperCase()}
                              </span>

                              {option.isSelected && (
                                <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                                  Your Answer
                                </span>
                              )}

                              {option.isCorrect && (
                                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                  Correct Answer
                                </span>
                              )}
                            </div>

                            <GateOptionMarkdown content={option.markdown || option.text} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
                    <Card className="flex h-full flex-col border-gray-200 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Answer Outcome</CardTitle>
                        <CardDescription>
                          Quick evaluation of your response for this question.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="flex flex-1 flex-col justify-between gap-4">
                        <div className="grid gap-3">
                          <div className="rounded-xl border bg-gray-50 p-4">
                            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Result
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${resultBadgeClasses(
                                  activeQuestion.resultStatus
                                )}`}
                              >
                                {humanizeStatus(activeQuestion.resultStatus)}
                              </span>

                              <span className="text-sm font-medium text-gray-500">
                                {activeQuestion.answered ? "Answered" : "Unanswered"}
                              </span>
                            </div>
                          </div>

                          <div className="rounded-xl border bg-white">
                            <div className="flex items-center justify-between gap-4 border-b px-4 py-3 text-sm">
                              <span className="text-gray-600">Marks Earned</span>
                              <span
                                className={`font-semibold ${
                                  activeQuestion.earnedMarks > 0
                                    ? "text-[#00A86B]"
                                    : activeQuestion.earnedMarks < 0
                                    ? "text-red-600"
                                    : "text-gray-900"
                                }`}
                              >
                                {formatSignedMarks(activeQuestion.earnedMarks)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-4 border-b px-4 py-3 text-sm">
                              <span className="text-gray-600">Maximum Marks</span>
                              <span className="font-semibold text-gray-900">
                                {formatCompactNumber(activeQuestion.maxMarks)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                              <span className="text-gray-600">Question Type</span>
                              <span className="font-semibold text-gray-900">
                                {activeQuestion.type}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="flex h-full flex-col border-gray-200 shadow-sm">
                      <CardHeader className="gap-2 pb-3">
                        <CardTitle className="text-base">Explanation</CardTitle>
                        <CardDescription>
                          Why the correct answer works and what to remember next time.
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="min-h-0 flex-1">
                        {activeQuestion.explanationMarkdown?.trim() ? (
                          <div className="explanation-scroll h-[320px] overflow-y-auto rounded-xl border bg-white p-5 pr-4 text-sm leading-7 text-gray-700 lg:h-full lg:min-h-[320px]">
                            <GateMarkdown content={activeQuestion.explanationMarkdown} />
                          </div>
                        ) : (
                          <div className="explanation-scroll h-[320px] overflow-y-auto rounded-xl border border-dashed bg-gray-50 p-5 text-sm leading-7 text-gray-600 lg:h-full lg:min-h-[320px]">
                            <p className="font-medium text-gray-800">Explanation not available yet.</p>
                            <p className="mt-2">
                              This question does not have <code>explanation_markdown</code> populated
                              in <code>gate.question_versions</code> yet.
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Bottom CTA */}
        <section className="flex flex-wrap gap-3">
          <Button variant="outline" asChild>
            <Link href="/gate">Back to GATE Mocks</Link>
          </Button>
          <Button onClick={scrollToQuestionReview}>Review Answers</Button>
          <Button asChild>
            <Link href="/gate/demo">Take Another Mock</Link>
          </Button>
        </section>
      </div>

    </div>
  );
}
