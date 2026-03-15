// services/gate-worker/src/finalize.ts
// Grade + persist attempt results

import Decimal from "decimal.js";
import type Redis from "ioredis";
import type { SupabaseClient } from "@supabase/supabase-js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

interface QuestionMeta {
  question_version_id: string;
  type: string;
  marks: number;
  correct_option_ids: string[];
  nat_lower_bound: number | null;
  nat_upper_bound: number | null;
  nat_precision: number | null;
}

interface CommittedAnswer {
  selectedOptionIds?: string[];
  natRaw?: string;
  natNormalized?: number | null;
}

export async function finalizeAttempt(
  attemptId: string,
  redis: Redis,
  supabase: SupabaseClient
): Promise<void> {
  console.log(`[finalize] Grading attempt ${attemptId}`);

  // Load committed answers from Redis session (preferred) or Postgres (fallback)
  let committedAnswers: Record<string, CommittedAnswer> = {};
  let questionOrder: string[] = [];

  const sessionRaw = await redis.get(`lm:attempt:${attemptId}`);
  if (sessionRaw) {
    const session = JSON.parse(sessionRaw);
    committedAnswers = session.committed ?? {};
    questionOrder = session.questionOrder ?? [];
  } else {
    // Fallback to Postgres
    const { data: answers } = await supabase
      .from("gate.attempt_answers" as any)
      .select("question_version_id, selected_option_ids, nat_value_raw, nat_value_normalized")
      .eq("attempt_id", attemptId);

    if (answers) {
      for (const a of answers) {
        committedAnswers[a.question_version_id] = {
          selectedOptionIds: a.selected_option_ids ?? undefined,
          natRaw: a.nat_value_raw ?? undefined,
          natNormalized: a.nat_value_normalized ?? undefined,
        };
      }
    }
  }

  // Load attempt and test version
  const { data: attempt } = await supabase
    .from("gate.attempts" as any)
    .select("id, test_version_id")
    .eq("id", attemptId)
    .single();

  if (!attempt) {
    console.error(`[finalize] Attempt ${attemptId} not found`);
    return;
  }

  // Load test version questions with metadata
  const { data: tvQuestions } = await supabase
    .from("gate.test_version_questions" as any)
    .select("question_version_id")
    .eq("test_version_id", attempt.test_version_id);

  if (!tvQuestions || tvQuestions.length === 0) {
    console.error(`[finalize] No questions for test version ${attempt.test_version_id}`);
    return;
  }

  const qvIds = tvQuestions.map((q: any) => q.question_version_id);

  // Load question metadata
  const { data: versions } = await supabase
    .from("gate.question_versions" as any)
    .select("id, question_id, nat_lower_bound, nat_upper_bound, nat_precision")
    .in("id", qvIds);

  const { data: questions } = await supabase
    .from("gate.questions" as any)
    .select("id, type, marks")
    .in("id", (versions ?? []).map((v: any) => v.question_id));

  // Load correct options
  const { data: correctOptions } = await supabase
    .from("gate.question_correct_options" as any)
    .select("question_version_id, option_id")
    .in("question_version_id", qvIds);

  // Build question metadata map
  const questionsById: Record<string, any> = {};
  for (const q of questions ?? []) questionsById[q.id] = q;

  const correctByQv: Record<string, string[]> = {};
  for (const co of correctOptions ?? []) {
    if (!correctByQv[co.question_version_id]) correctByQv[co.question_version_id] = [];
    correctByQv[co.question_version_id].push(co.option_id);
  }

  // Load blueprint pass_percent
  const { data: tv } = await supabase
    .from("gate.test_versions" as any)
    .select("blueprint_profile_id")
    .eq("id", attempt.test_version_id)
    .single();

  const { data: bp } = await supabase
    .from("gate.blueprint_profiles" as any)
    .select("pass_percent")
    .eq("id", tv?.blueprint_profile_id)
    .single();

  const passPercent = bp?.pass_percent ?? 25;

  // Grade each question
  let totalScore = new Decimal(0);
  let totalMax = new Decimal(0);
  const perQuestionScores: Array<{
    attempt_id: string;
    question_version_id: string;
    earned_marks: number;
    max_marks: number;
    correct: boolean;
  }> = [];

  for (const v of versions ?? []) {
    const q = questionsById[v.question_id];
    if (!q) continue;

    const answer = committedAnswers[v.id] ?? null;
    const maxMarks = q.marks;
    totalMax = totalMax.plus(maxMarks);

    let earned = new Decimal(0);
    let correct = false;

    if (!answer) {
      // Unanswered → 0
    } else if (q.type === "MCQ") {
      const selected = answer.selectedOptionIds ?? [];
      const correctIds = correctByQv[v.id] ?? [];
      if (selected.length === 1 && correctIds.length === 1 && selected[0] === correctIds[0]) {
        earned = new Decimal(maxMarks);
        correct = true;
      } else if (selected.length === 1) {
        // Wrong: -marks/3
        earned = new Decimal(-maxMarks).div(3);
      }
    } else if (q.type === "MSQ") {
      const selected = new Set(answer.selectedOptionIds ?? []);
      const correctSet = new Set(correctByQv[v.id] ?? []);
      if (selected.size === correctSet.size && [...selected].every((s) => correctSet.has(s))) {
        earned = new Decimal(maxMarks);
        correct = true;
      }
    } else if (q.type === "NAT") {
      const normalized = answer.natNormalized;
      if (normalized !== null && normalized !== undefined) {
        const lower = v.nat_lower_bound;
        const upper = v.nat_upper_bound;
        if (lower !== null && upper !== null && normalized >= lower && normalized <= upper) {
          earned = new Decimal(maxMarks);
          correct = true;
        }
      }
    }

    totalScore = totalScore.plus(earned);
    perQuestionScores.push({
      attempt_id: attemptId,
      question_version_id: v.id,
      earned_marks: earned.toNumber(),
      max_marks: maxMarks,
      correct,
    });
  }

  const score = totalScore.toNumber();
  const maxScore = totalMax.toNumber();
  const percent = maxScore === 0 ? 0 : totalScore.div(totalMax).times(100).toNumber();
  const passed = percent >= passPercent;

  // Persist scores
  if (perQuestionScores.length > 0) {
    await supabase
      .from("gate.attempt_question_scores" as any)
      .upsert(perQuestionScores, { onConflict: "attempt_id,question_version_id" });
  }

  await supabase
    .from("gate.attempt_results" as any)
    .upsert({
      attempt_id: attemptId,
      score,
      max_score: maxScore,
      percent: Math.round(percent * 100) / 100,
      passed,
      graded_at: new Date().toISOString(),
    }, { onConflict: "attempt_id" });

  // Ensure attempt status is SUBMITTED
  await supabase
    .from("gate.attempts" as any)
    .update({
      status: "SUBMITTED",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("status", "IN_PROGRESS");

  console.log(`[finalize] Attempt ${attemptId} graded: ${score}/${maxScore} (${percent.toFixed(2)}%)`);
}
