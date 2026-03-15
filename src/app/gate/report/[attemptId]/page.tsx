// src/app/gate/report/[attemptId]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface AttemptReport {
  attempt: {
    id: string;
    mode: string;
    startedAt: string;
    submittedAt: string;
  };
  results: {
    score: number;
    max_score: number;
    percent: number;
    passed: boolean;
    adjusted_score: number | null;
    errata_applied_at: string | null;
    percentile: number | null;
  } | null;
  questionScores: Array<{
    question_version_id: string;
    earned_marks: number;
    max_marks: number;
    correct: boolean;
  }>;
}

export default function GateReportPage() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<AttemptReport | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`/api/gate/attempts/${attemptId}/report`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? `Failed (${res.status})`);
        if (alive) setReport(data);
      } catch (e: any) {
        if (alive) setError(e?.message ?? "Failed to load report");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [attemptId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-500">
        Loading report…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-20">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
        <div className="mt-4 flex gap-3">
          <Link href="/gate" className="rounded border px-4 py-2 text-sm hover:bg-gray-50">
            Back to GATE
          </Link>
          <Link href="/gate/pricing" className="rounded bg-[#00A86B] px-4 py-2 text-sm text-white hover:bg-[#009060]">
            View Plans
          </Link>
        </div>
      </div>
    );
  }

  if (!report || !report.results) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center text-gray-500">
        Report not available yet. Grading may still be in progress.
        <button
          onClick={() => window.location.reload()}
          className="mt-4 block mx-auto rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>
    );
  }

  const r = report.results;
  const qs = report.questionScores;
  const correctCount = qs.filter((q) => q.correct).length;
  const wrongCount = qs.filter((q) => !q.correct && q.earned_marks < 0).length;
  const unanswered = qs.filter((q) => !q.correct && q.earned_marks === 0).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold">Test Report</h1>
          <p className="text-sm text-gray-500">
            {report.attempt.mode} attempt &middot;{" "}
            {new Date(report.attempt.submittedAt).toLocaleString()}
          </p>
        </div>
        <Link
          href="/gate"
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Back to GATE
        </Link>
      </div>

      {/* Errata banner */}
      {r.adjusted_score !== null && r.errata_applied_at && (
        <div className="mt-4 rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          Score updated due to confirmed errata. Original score preserved
          for audit. Showing adjusted score.
        </div>
      )}

      {/* Score card */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border bg-white p-4 text-center">
          <div className="text-3xl font-extrabold">
            {(r.adjusted_score ?? r.score).toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            / {r.max_score} marks
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <div
            className={`text-3xl font-extrabold ${
              r.passed ? "text-[#00A86B]" : "text-[#FF0000]"
            }`}
          >
            {r.percent.toFixed(2)}%
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {r.passed ? "PASSED" : "NOT PASSED"}
          </div>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <div className="text-3xl font-extrabold">
            {r.percentile !== null ? `${r.percentile.toFixed(1)}` : "N/A"}
          </div>
          <div className="mt-1 text-xs text-gray-500">Percentile</div>
        </div>
        <div className="rounded-xl border bg-white p-4 text-center">
          <div className="text-3xl font-extrabold">{qs.length}</div>
          <div className="mt-1 text-xs text-gray-500">Total Questions</div>
        </div>
      </div>

      {/* Breakdown bar */}
      <div className="mt-6">
        <div className="flex gap-4 text-sm">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: "#00A86B" }} />
            Correct: {correctCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded" style={{ backgroundColor: "#FF0000" }} />
            Wrong (negative): {wrongCount}
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded border" style={{ backgroundColor: "#eee" }} />
            Unanswered: {unanswered}
          </span>
        </div>
        <div className="mt-2 flex h-4 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full"
            style={{
              width: `${(correctCount / qs.length) * 100}%`,
              backgroundColor: "#00A86B",
            }}
          />
          <div
            className="h-full"
            style={{
              width: `${(wrongCount / qs.length) * 100}%`,
              backgroundColor: "#FF0000",
            }}
          />
        </div>
      </div>

      {/* Per-question scores */}
      <div className="mt-8">
        <h2 className="text-lg font-bold">Per-Question Breakdown</h2>
        <div className="mt-3 overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2 text-left">#</th>
                <th className="px-4 py-2 text-left">Earned</th>
                <th className="px-4 py-2 text-left">Max</th>
                <th className="px-4 py-2 text-left">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {qs.map((q, idx) => (
                <tr
                  key={q.question_version_id}
                  className={q.correct ? "" : q.earned_marks < 0 ? "bg-red-50" : "bg-gray-50"}
                >
                  <td className="px-4 py-2 font-mono">{idx + 1}</td>
                  <td className="px-4 py-2 font-mono">
                    {q.earned_marks > 0 ? "+" : ""}
                    {q.earned_marks.toFixed(4)}
                  </td>
                  <td className="px-4 py-2 font-mono">{q.max_marks}</td>
                  <td className="px-4 py-2">
                    {q.correct ? (
                      <span className="rounded bg-[#00A86B]/10 px-2 py-0.5 text-xs font-semibold text-[#00A86B]">
                        Correct
                      </span>
                    ) : q.earned_marks < 0 ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                        Wrong (&minus;)
                      </span>
                    ) : (
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-500">
                        Unanswered
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-8 flex gap-3">
        <Link
          href="/gate"
          className="rounded border px-4 py-2 text-sm hover:bg-gray-50"
        >
          Back to GATE
        </Link>
        <Link
          href="/gate/demo"
          className="rounded bg-[#00A86B] px-4 py-2 text-sm text-white hover:bg-[#009060]"
        >
          Take Another Test
        </Link>
      </div>

      <p className="mt-8 text-center text-xs text-gray-400">
        Learnamyte is not affiliated with IITs, GATE organizing institutes, or
        TCS iON. &quot;GATE&quot; is used only to describe exam preparation.
      </p>
    </div>
  );
}
