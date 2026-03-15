// src/lib/gate/scoring.ts
// GATE-correct scoring engine using decimal.js for fractional mark safety

import Decimal from "decimal.js";
import type { QuestionMeta, GradeResult, AttemptGradeResult, CommittedAnswer } from "./contracts";
import { isNATCorrect } from "./nat";

// Configure Decimal.js for high precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Grade a single question according to GATE scoring rules.
 *
 * MCQ (Single Correct):
 *   Correct: +marks
 *   Wrong:   -1/3 for 1-mark, -2/3 for 2-mark
 *   Unanswered: 0
 *
 * MSQ (Multiple Correct, All-or-Nothing):
 *   Correct only if ALL correct options selected AND NO incorrect options
 *   Otherwise: 0 (no negative)
 *   Unanswered: 0
 *
 * NAT (Numeric):
 *   Correct if normalized value falls within inclusive bounds
 *   Otherwise: 0 (no negative)
 *   Unanswered: 0
 */
export function gradeQuestion(
  question: QuestionMeta,
  answer: CommittedAnswer | null
): GradeResult {
  const maxMarks = question.marks;

  // Unanswered → 0
  if (answer === null || answer === undefined) {
    return { earned: 0, maxMarks, correct: false };
  }

  switch (question.type) {
    case "MCQ": {
      const selectedIds = answer.selectedOptionIds ?? [];
      // No selection or multiple selections treated as unanswered for MCQ
      if (selectedIds.length !== 1) {
        return { earned: 0, maxMarks, correct: false };
      }

      const correctIds = question.correctOptionIds ?? [];
      if (correctIds.length !== 1) {
        // Defensive: malformed question data
        return { earned: 0, maxMarks, correct: false };
      }

      const isCorrect = selectedIds[0] === correctIds[0];
      if (isCorrect) {
        return { earned: maxMarks, maxMarks, correct: true };
      }

      // Wrong answer: apply negative marking
      // 1-mark: -1/3, 2-mark: -2/3
      const negativeDecimal = new Decimal(-maxMarks).div(3);
      return {
        earned: negativeDecimal.toNumber(),
        maxMarks,
        correct: false,
      };
    }

    case "MSQ": {
      const selectedIds = answer.selectedOptionIds ?? [];
      const correctIds = question.correctOptionIds ?? [];

      // No selection → unanswered → 0
      if (selectedIds.length === 0) {
        return { earned: 0, maxMarks, correct: false };
      }

      // All-or-nothing: must select exactly the correct set
      const selectedSet = new Set(selectedIds);
      const correctSet = new Set(correctIds);

      if (selectedSet.size !== correctSet.size) {
        return { earned: 0, maxMarks, correct: false };
      }

      for (const id of selectedSet) {
        if (!correctSet.has(id)) {
          return { earned: 0, maxMarks, correct: false };
        }
      }

      return { earned: maxMarks, maxMarks, correct: true };
    }

    case "NAT": {
      const normalizedValue = answer.natNormalized;

      // No value → unanswered → 0
      if (normalizedValue === null || normalizedValue === undefined) {
        return { earned: 0, maxMarks, correct: false };
      }

      const lower = question.natLowerBound;
      const upper = question.natUpperBound;

      if (lower === undefined || upper === undefined) {
        // Defensive: malformed question data
        return { earned: 0, maxMarks, correct: false };
      }

      const isCorrect = isNATCorrect(normalizedValue, lower, upper);
      return {
        earned: isCorrect ? maxMarks : 0,
        maxMarks,
        correct: isCorrect,
      };
    }

    default:
      return { earned: 0, maxMarks, correct: false };
  }
}

/**
 * Grade an entire attempt. Sums all per-question scores.
 * Score can be fractional (negative marking fractions).
 */
export function gradeAttempt(
  questions: QuestionMeta[],
  committedAnswers: Record<string, CommittedAnswer | null>,
  passPercent: number
): AttemptGradeResult {
  let total = new Decimal(0);
  let maxTotal = new Decimal(0);
  const perQuestion: AttemptGradeResult["perQuestion"] = [];

  for (const q of questions) {
    const answer = committedAnswers[q.questionVersionId] ?? null;
    const result = gradeQuestion(q, answer);

    total = total.plus(new Decimal(result.earned));
    maxTotal = maxTotal.plus(new Decimal(result.maxMarks));

    perQuestion.push({
      questionVersionId: q.questionVersionId,
      earned: result.earned,
      maxMarks: result.maxMarks,
      correct: result.correct,
    });
  }

  const score = total.toNumber();
  const maxScore = maxTotal.toNumber();
  const percent = maxScore === 0 ? 0 : total.div(maxTotal).times(100).toNumber();
  const passed = percent >= passPercent;

  return {
    score,
    maxScore,
    percent: Math.round(percent * 100) / 100,
    passed,
    perQuestion,
  };
}
