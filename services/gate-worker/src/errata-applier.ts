// services/gate-worker/src/errata-applier.ts
// Batch job: Apply errata overlay (adjusted_score without mutating immutable history)

import Decimal from "decimal.js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Redis from "ioredis";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Apply an errata correction for a given question version transition.
 * Finds all attempts that used the old version, re-grades that specific question
 * with the new version's correct answer, and writes `adjusted_score` overlay.
 *
 * The original `score` and per-question scores are NEVER mutated (immutable attempts).
 */
export async function applyErrataOverlay(
  questionId: string,
  fromVersionId: string,
  toVersionId: string,
  supabase: SupabaseClient,
  _redis: Redis
): Promise<{ affectedAttempts: number }> {
  console.log(`[errata-applier] Applying errata Q:${questionId} v:${fromVersionId} → v:${toVersionId}`);

  // Load new version metadata
  const { data: newVersion } = await supabase
    .from("gate.question_versions" as any)
    .select("id, nat_lower_bound, nat_upper_bound, nat_precision")
    .eq("id", toVersionId)
    .single();

  if (!newVersion) {
    console.error(`[errata-applier] New version ${toVersionId} not found`);
    return { affectedAttempts: 0 };
  }

  // Load new correct options
  const { data: newCorrectOptions } = await supabase
    .from("gate.question_correct_options" as any)
    .select("option_id")
    .eq("question_version_id", toVersionId);

  const newCorrectIds = (newCorrectOptions ?? []).map((o: any) => o.option_id);

  // Find question type and marks
  const { data: question } = await supabase
    .from("gate.questions" as any)
    .select("type, marks")
    .eq("id", questionId)
    .single();

  if (!question) {
    console.error(`[errata-applier] Question ${questionId} not found`);
    return { affectedAttempts: 0 };
  }

  // Find all attempts that used the old version (via test_version_questions)
  const { data: tvqs } = await supabase
    .from("gate.test_version_questions" as any)
    .select("test_version_id")
    .eq("question_version_id", fromVersionId);

  if (!tvqs || tvqs.length === 0) {
    return { affectedAttempts: 0 };
  }

  const testVersionIds = tvqs.map((t: any) => t.test_version_id);

  // Find submitted attempts for these test versions
  const { data: attempts } = await supabase
    .from("gate.attempts" as any)
    .select("id")
    .in("test_version_id", testVersionIds)
    .eq("status", "SUBMITTED");

  if (!attempts || attempts.length === 0) {
    return { affectedAttempts: 0 };
  }

  let affectedCount = 0;

  for (const attempt of attempts) {
    // Load current result
    const { data: result } = await supabase
      .from("gate.attempt_results" as any)
      .select("score, adjusted_score, errata_version_used")
      .eq("attempt_id", attempt.id)
      .single();

    if (!result) continue;

    // Load original per-question score for this question
    const { data: origScore } = await supabase
      .from("gate.attempt_question_scores" as any)
      .select("earned_marks")
      .eq("attempt_id", attempt.id)
      .eq("question_version_id", fromVersionId)
      .single();

    if (!origScore) continue;

    // Load the student's answer
    const { data: answer } = await supabase
      .from("gate.attempt_answers" as any)
      .select("selected_option_ids, nat_value_normalized")
      .eq("attempt_id", attempt.id)
      .eq("question_version_id", fromVersionId)
      .single();

    // Re-grade this question with new version
    let newEarned = new Decimal(0);
    const marks = question.marks;

    if (!answer) {
      newEarned = new Decimal(0); // unanswered
    } else if (question.type === "MCQ") {
      const selected = answer.selected_option_ids ?? [];
      if (selected.length === 1 && newCorrectIds.length === 1 && selected[0] === newCorrectIds[0]) {
        newEarned = new Decimal(marks);
      } else if (selected.length === 1) {
        newEarned = new Decimal(-marks).div(3);
      }
    } else if (question.type === "MSQ") {
      const selectedSet = new Set(answer.selected_option_ids ?? []);
      const correctSet = new Set(newCorrectIds);
      if (selectedSet.size === correctSet.size && [...selectedSet].every((s) => correctSet.has(s))) {
        newEarned = new Decimal(marks);
      }
    } else if (question.type === "NAT") {
      const norm = answer.nat_value_normalized;
      if (norm !== null && norm !== undefined) {
        const lower = newVersion.nat_lower_bound;
        const upper = newVersion.nat_upper_bound;
        if (lower !== null && upper !== null && norm >= lower && norm <= upper) {
          newEarned = new Decimal(marks);
        }
      }
    }

    // Compute adjusted score
    const baseScore = new Decimal(result.adjusted_score ?? result.score);
    const oldEarned = new Decimal(origScore.earned_marks);
    const adjustedScore = baseScore.minus(oldEarned).plus(newEarned);

    // Build errata version tracking string
    const existingErrata = result.errata_version_used ?? "";
    const errataEntry = `${questionId}:${toVersionId}`;
    const newErrataUsed = existingErrata
      ? `${existingErrata},${errataEntry}`
      : errataEntry;

    // Update attempt_results overlay
    await supabase
      .from("gate.attempt_results" as any)
      .update({
        adjusted_score: adjustedScore.toNumber(),
        errata_applied_at: new Date().toISOString(),
        errata_version_used: newErrataUsed,
      })
      .eq("attempt_id", attempt.id);

    affectedCount++;
  }

  console.log(`[errata-applier] Applied errata to ${affectedCount} attempts`);
  return { affectedAttempts: affectedCount };
}
