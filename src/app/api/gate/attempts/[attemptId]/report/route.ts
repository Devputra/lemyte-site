// src/app/api/gate/attempts/[attemptId]/report/route.ts

import { signMedia } from "@/lib/gate/media";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { hasRealOptions, stripInlineOptions } from "@/lib/gate/question-text";
import { checkEntitlement } from "@/lib/gate/entitlements";
import { getAttemptSession } from "@/lib/gate/redis";
import { isAuthorizedActor } from "@/lib/gate/auth";
import { extractCorrectOptionIds, normalizeOptions } from "@/lib/gate/options";
import {
  safeNumber,
  round2,
  computeDurationUsedSeconds,
  deriveResultsFromQuestionScores,
} from "@/lib/gate/report-helpers";
import { attemptRoute, getActor } from "@/lib/gate/attempt-route";

export const runtime = "nodejs";

function hasAnswer(
  answer:
    | {
        selected_option_ids: string[] | null;
        nat_value_raw: string | null;
        nat_value_normalized: number | null;
      }
    | null
    | undefined,
): boolean {
  if (!answer) return false;

  return Boolean(
    (answer.selected_option_ids && answer.selected_option_ids.length > 0) ||
    (answer.nat_value_raw && answer.nat_value_raw.trim().length > 0) ||
    answer.nat_value_normalized !== null,
  );
}

export const GET = attemptRoute("report", async (req, attemptId) => {
  const { authUserId, demoCookie } = await getActor(req);

  // 1) Attempt
  const { data: attempt, error: atErr } = await supabaseAdmin
    .schema("gate")
    .from("attempts")
    .select(
      "id, user_id, guest_token, status, test_version_id, mode, started_at, submitted_at, ends_at",
    )
    .eq("id", attemptId)
    .single();

  if (atErr || !attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }

  // 2) Ownership
  const allowed = isAuthorizedActor({
    ownerUserId: attempt.user_id ?? null,
    ownerGuestToken: attempt.guest_token ?? null,
    authUserId,
    demoCookie,
  });

  if (!allowed) {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // 3) Entitlement only for non-demo
  if (attempt.mode !== "DEMO") {
    if (!authUserId) {
      return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    const entitlement = await checkEntitlement(authUserId, "VIEW_REPORT");
    if (!entitlement.allowed) {
      return Response.json({ error: entitlement.reason }, { status: 403 });
    }
  }

  // 4) Final-state only
  if (attempt.status === "IN_PROGRESS") {
    return Response.json(
      { error: "Attempt not yet submitted" },
      { status: 409 },
    );
  }

  if (attempt.status === "ABANDONED") {
    return Response.json({ error: "Attempt was abandoned" }, { status: 409 });
  }

  if (attempt.status === "EXPIRED") {
    return Response.json(
      { error: "Attempt expired before report generation" },
      { status: 409 },
    );
  }

  if (attempt.status !== "SUBMITTED") {
    return Response.json(
      { error: `Unsupported attempt status: ${attempt.status}` },
      { status: 400 },
    );
  }

  // 5) Test + pass threshold
  const { data: testVersion, error: tvErr } = await supabaseAdmin
    .schema("gate")
    .from("test_versions")
    .select("id, title, blueprint_profile_id")
    .eq("id", attempt.test_version_id)
    .single();

  if (tvErr || !testVersion) {
    return Response.json(
      { error: "Failed to load test version" },
      { status: 500 },
    );
  }

  const { data: blueprint } = await supabaseAdmin
    .schema("gate")
    .from("blueprint_profiles")
    .select("pass_percent")
    .eq("id", testVersion.blueprint_profile_id)
    .maybeSingle();

  const passPercent = safeNumber(blueprint?.pass_percent, 35);

  // 6) Primary report bundle + optional Redis session for exact order
  const [
    resultsRes,
    questionScoresRes,
    answersRes,
    metadataRes,
    tvQuestionsRes,
    session,
  ] = await Promise.all([
    supabaseAdmin
      .schema("gate")
      .from("attempt_results")
      .select("score, max_score, percent, passed")
      .eq("attempt_id", attemptId)
      .maybeSingle(),

    supabaseAdmin
      .schema("gate")
      .from("attempt_question_scores")
      .select("question_version_id, earned_marks, max_marks, correct")
      .eq("attempt_id", attemptId),

    supabaseAdmin
      .schema("gate")
      .from("attempt_answers")
      .select(
        "question_version_id, selected_option_ids, nat_value_raw, nat_value_normalized",
      )
      .eq("attempt_id", attemptId),

    supabaseAdmin
      .schema("gate")
      .from("attempt_metadata")
      .select("shuffle_seed, question_order_hash")
      .eq("attempt_id", attemptId)
      .maybeSingle(),

    supabaseAdmin
      .schema("gate")
      .from("test_version_questions")
      .select("question_version_id, section, question_order")
      .eq("test_version_id", attempt.test_version_id)
      .order("question_order", { ascending: true }),

    getAttemptSession(attemptId).catch((redisErr) => {
      console.warn(
        "[gate/attempts/[attemptId]/report] Redis session fetch failed, using DB only",
        redisErr,
      );
      return null;
    }),
  ]);

  if (resultsRes.error) {
    console.error(
      "[gate/attempts/[attemptId]/report] results lookup failed",
      resultsRes.error,
    );
    return Response.json(
      { error: "Failed to load attempt results" },
      { status: 500 },
    );
  }

  if (questionScoresRes.error) {
    console.error(
      "[gate/attempts/[attemptId]/report] question scores lookup failed",
      questionScoresRes.error,
    );
    return Response.json(
      { error: "Failed to load question scores" },
      { status: 500 },
    );
  }

  if (answersRes.error) {
    console.error(
      "[gate/attempts/[attemptId]/report] answers lookup failed",
      answersRes.error,
    );
    return Response.json({ error: "Failed to load answers" }, { status: 500 });
  }

  if (metadataRes.error) {
    console.error(
      "[gate/attempts/[attemptId]/report] metadata lookup failed",
      metadataRes.error,
    );
    return Response.json(
      { error: "Failed to load attempt metadata" },
      { status: 500 },
    );
  }

  if (tvQuestionsRes.error) {
    console.error(
      "[gate/attempts/[attemptId]/report] test_version_questions lookup failed",
      tvQuestionsRes.error,
    );
    return Response.json(
      { error: "Failed to load test version questions" },
      { status: 500 },
    );
  }

  const questionScores = questionScoresRes.data ?? [];
  const answers = answersRes.data ?? [];
  const tvQuestions = tvQuestionsRes.data ?? [];

  // If both results and question_scores are absent, grading genuinely isn't ready.
  if (!resultsRes.data && questionScores.length === 0) {
    return Response.json({ error: "Report is not ready yet" }, { status: 202 });
  }

  // 7) Determine display order
  const orderFromRedis =
    session &&
    Array.isArray(session.questionOrder) &&
    session.questionOrder.length > 0
      ? session.questionOrder.map(String)
      : [];

  const orderFromTestVersion = tvQuestions.map((row) =>
    String(row.question_version_id),
  );

  const orderedQuestionIds =
    orderFromRedis.length > 0 ? orderFromRedis : orderFromTestVersion;

  const sectionByQuestionId = new Map<string, string>();
  const baseOrderByQuestionId = new Map<string, number>();

  tvQuestions.forEach((row, idx) => {
    sectionByQuestionId.set(
      String(row.question_version_id),
      String(row.section ?? "CORE"),
    );
    baseOrderByQuestionId.set(String(row.question_version_id), idx + 1);
  });

  // 8) Load question content
  const idsForQuestionLoad =
    orderedQuestionIds.length > 0
      ? orderedQuestionIds
      : [
          ...new Set([
            ...questionScores.map((q) => String(q.question_version_id)),
            ...answers.map((a) => String(a.question_version_id)),
          ]),
        ];

  const { data: versions, error: versionsErr } = await supabaseAdmin
    .schema("gate")
    .from("question_versions")
    .select(
      "id, type, marks, markdown_content, options_array, explanation_markdown",
    )
    .in("id", idsForQuestionLoad);

  if (versionsErr) {
    console.error(
      "[gate/attempts/[attemptId]/report] question_versions lookup failed",
      versionsErr,
    );
    return Response.json(
      { error: "Failed to load question content" },
      { status: 500 },
    );
  }

  const versionsById = new Map((versions ?? []).map((v) => [String(v.id), v]));

  const answersByQid = new Map(
    answers.map((a) => [String(a.question_version_id), a]),
  );

  const scoresByQid = new Map(
    questionScores.map((q) => [String(q.question_version_id), q]),
  );

  const reviewQuestions = idsForQuestionLoad.map((questionVersionId, index) => {
    const v = versionsById.get(questionVersionId);
    const a = answersByQid.get(questionVersionId) ?? null;
    const s = scoresByQid.get(questionVersionId) ?? null;

    const selectedOptionIds = a?.selected_option_ids ?? null;
    const natValueRaw = a?.nat_value_raw ?? null;
    const natValueNormalized =
      a?.nat_value_normalized === null || a?.nat_value_normalized === undefined
        ? null
        : safeNumber(a.nat_value_normalized);

    const answered = hasAnswer(a);
    const correct = Boolean(s?.correct);
    const earnedMarks = safeNumber(s?.earned_marks, 0);
    const maxMarks = safeNumber(s?.max_marks, safeNumber(v?.marks, 0));
    const type = String(v?.type ?? "MCQ");
    const section = sectionByQuestionId.get(questionVersionId) ?? "CORE";
    const correctOptionIds = extractCorrectOptionIds(v?.options_array);
    const options = normalizeOptions(v?.options_array, selectedOptionIds);

    let resultStatus: "CORRECT" | "WRONG" | "UNANSWERED" = "UNANSWERED";
    if (correct) {
      resultStatus = "CORRECT";
    } else if (answered) {
      resultStatus = "WRONG";
    }

    return {
      questionNumber:
        orderFromRedis.length > 0
          ? index + 1
          : (baseOrderByQuestionId.get(questionVersionId) ?? index + 1),
      questionVersionId,
      type,
      section,
      marks: safeNumber(v?.marks, 0),
      questionMarkdown: stripInlineOptions(
        String(v?.markdown_content ?? ""),
        hasRealOptions(
          Array.isArray(v?.options_array) ? v.options_array : null,
        ),
      ),
      options,
      correctOptionIds,
      selectedOptionIds,
      natValueRaw,
      natValueNormalized,
      answered,
      correct,
      earnedMarks,
      maxMarks,
      resultStatus,
      explanationMarkdown: String(v?.explanation_markdown ?? ""),
    };
  });

  const correctCount = reviewQuestions.filter(
    (q) => q.resultStatus === "CORRECT",
  ).length;
  const wrongCount = reviewQuestions.filter(
    (q) => q.resultStatus === "WRONG",
  ).length;
  const unansweredCount = reviewQuestions.filter(
    (q) => q.resultStatus === "UNANSWERED",
  ).length;
  const attemptedCount = reviewQuestions.filter((q) => q.answered).length;
  const totalQuestions = reviewQuestions.length;
  const accuracyPercent =
    attemptedCount > 0 ? round2((correctCount / attemptedCount) * 100) : 0;
  const negativeMarksLost = round2(
    reviewQuestions
      .filter((q) => q.earnedMarks < 0)
      .reduce((sum, q) => sum + Math.abs(q.earnedMarks), 0),
  );

  const sectionSummaryMap = new Map<
    string,
    {
      section: string;
      totalQuestions: number;
      attemptedCount: number;
      correctCount: number;
      wrongCount: number;
      unansweredCount: number;
      score: number;
      maxScore: number;
    }
  >();

  for (const q of reviewQuestions) {
    const prev = sectionSummaryMap.get(q.section) ?? {
      section: q.section,
      totalQuestions: 0,
      attemptedCount: 0,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 0,
      score: 0,
      maxScore: 0,
    };

    prev.totalQuestions += 1;
    prev.score = round2(prev.score + q.earnedMarks);
    prev.maxScore = round2(prev.maxScore + q.maxMarks);

    if (q.answered) prev.attemptedCount += 1;
    if (q.resultStatus === "CORRECT") prev.correctCount += 1;
    if (q.resultStatus === "WRONG") prev.wrongCount += 1;
    if (q.resultStatus === "UNANSWERED") prev.unansweredCount += 1;

    sectionSummaryMap.set(q.section, prev);
  }

  const sectionSummary = [...sectionSummaryMap.values()].map((s) => ({
    ...s,
    accuracyPercent:
      s.attemptedCount > 0
        ? round2((s.correctCount / s.attemptedCount) * 100)
        : 0,
  }));

  const results = resultsRes.data
    ? {
        score: safeNumber(resultsRes.data.score),
        max_score: safeNumber(resultsRes.data.max_score),
        percent: safeNumber(resultsRes.data.percent),
        passed: Boolean(resultsRes.data.passed),
        source: "attempt_results" as const,
      }
    : deriveResultsFromQuestionScores(questionScores, passPercent);

  return Response.json(await signMedia({
    attempt: {
      id: attempt.id,
      mode: attempt.mode,
      status: attempt.status,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      endsAt: attempt.ends_at,
    },
    test: {
      id: testVersion.id,
      title: testVersion.title,
      passPercent,
    },
    results,
    summary: {
      totalQuestions,
      attemptedCount,
      correctCount,
      wrongCount,
      unansweredCount,
      accuracyPercent,
      negativeMarksLost,
      durationUsedSeconds: computeDurationUsedSeconds(
        attempt.started_at,
        attempt.submitted_at,
        attempt.ends_at,
      ),
    },
    metadata: {
      shuffle_seed: metadataRes.data?.shuffle_seed ?? null,
      question_order_hash: metadataRes.data?.question_order_hash ?? null,
      questionOrderSource: orderFromRedis.length > 0 ? "redis" : "test_version",
    },
    sectionSummary,
    reviewQuestions,
    // Keep old keys too so the current page doesn't break immediately.
    questionScores,
    answers,
  }));
});
