// src/lib/gate/report-helpers.ts
// Shared utility functions extracted from the report route.

export function safeNumber(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeDurationUsedSeconds(
  startedAt: string | null | undefined,
  submittedAt: string | null | undefined,
  endsAt: string | null | undefined
): number {
  const start = startedAt ? new Date(startedAt).getTime() : NaN;
  const end = submittedAt
    ? new Date(submittedAt).getTime()
    : endsAt
    ? new Date(endsAt).getTime()
    : NaN;

  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    return 0;
  }

  return Math.max(0, Math.floor((end - start) / 1000));
}

export function deriveResultsFromQuestionScores(
  questionScores: Array<{
    earned_marks: number;
    max_marks: number;
  }>,
  passPercent: number
) {
  const score = round2(
    questionScores.reduce((sum, row) => sum + safeNumber(row.earned_marks), 0)
  );
  const maxScore = round2(
    questionScores.reduce((sum, row) => sum + safeNumber(row.max_marks), 0)
  );
  const percent = maxScore > 0 ? round2((score / maxScore) * 100) : 0;
  const passed = percent >= passPercent;

  return {
    score,
    max_score: maxScore,
    percent,
    passed,
    source: "derived_from_question_scores" as const,
  };
}
