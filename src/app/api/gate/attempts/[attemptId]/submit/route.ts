// src/app/api/gate/attempts/[attemptId]/submit/route.ts

import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { atomicUpdateSession, emitAttemptEvent } from "@/lib/gate/redis";
import { gradeAttempt } from "@/lib/gate/scoring";
import type { CommittedAnswer, QuestionMeta, QuestionType } from "@/lib/gate/contracts";
import crypto from "crypto";

export const runtime = "nodejs";

const DEMO_COOKIE_NAME = "lm_demo_token";

function isAuthorizedActor(params: {
  ownerUserId: string | null;
  ownerGuestToken: string | null;
  authUserId: string | null;
  demoCookie: string | null;
}): boolean {
  const { ownerUserId, ownerGuestToken, authUserId, demoCookie } = params;

  if (ownerUserId) {
    return authUserId === ownerUserId;
  }

  if (ownerGuestToken) {
    return demoCookie === ownerGuestToken;
  }

  return false;
}

function extractCorrectOptionIds(optionsArray: unknown): string[] {
  if (!Array.isArray(optionsArray)) return [];

  return optionsArray
    .filter((opt: any) => {
      if (!opt || typeof opt !== "object") return false;

      return (
        opt.isCorrect === true ||
        opt.is_correct === true ||
        opt.correct === true ||
        opt.isAnswer === true ||
        opt.answer === true
      );
    })
    .map((opt: any) => String(opt.id ?? ""))
    .filter(Boolean);
}

async function loadPassPercent(testVersionId: string): Promise<number> {
  const { data: tv, error: tvErr } = await supabaseAdmin
    .schema("gate")
    .from("test_versions")
    .select("blueprint_profile_id")
    .eq("id", testVersionId)
    .single();

  if (tvErr || !tv) {
    throw new Error(`Failed to load test version: ${tvErr?.message ?? "not found"}`);
  }

  const { data: bp, error: bpErr } = await supabaseAdmin
    .schema("gate")
    .from("blueprint_profiles")
    .select("pass_percent")
    .eq("id", tv.blueprint_profile_id)
    .single();

  if (bpErr || !bp) {
    throw new Error(`Failed to load blueprint profile: ${bpErr?.message ?? "not found"}`);
  }

  return Number(bp.pass_percent ?? 35);
}

async function loadQuestionMeta(questionVersionIds: string[]): Promise<Map<string, QuestionMeta>> {
  if (questionVersionIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("question_versions")
    .select(
      "id, type, marks, options_array, nat_lower_bound, nat_upper_bound, nat_precision"
    )
    .in("id", questionVersionIds);

  if (error) {
    throw new Error(`Failed to load question versions: ${error.message}`);
  }

  const meta = new Map<string, QuestionMeta>();

  for (const row of data ?? []) {
    const type = String(row.type) as QuestionType;

    const q: QuestionMeta = {
      questionVersionId: String(row.id),
      type,
      marks: Number(row.marks),
      natLowerBound:
        row.nat_lower_bound === null || row.nat_lower_bound === undefined
          ? undefined
          : Number(row.nat_lower_bound),
      natUpperBound:
        row.nat_upper_bound === null || row.nat_upper_bound === undefined
          ? undefined
          : Number(row.nat_upper_bound),
      natPrecision:
        row.nat_precision === null || row.nat_precision === undefined
          ? undefined
          : Number(row.nat_precision),
      correctOptionIds: type === "NAT" ? undefined : extractCorrectOptionIds(row.options_array),
    };

    meta.set(String(row.id), q);
  }

  return meta;
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await ctx.params;

    const supabase = await supabaseServer();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    const authUserId = authErr ? null : authData?.user?.id ?? null;
    const demoCookie = req.cookies.get(DEMO_COOKIE_NAME)?.value ?? null;

    const now = new Date();

    let forbidden = false;
    let terminalStatus: string | null = null;

    // IMPORTANT:
    // - IN_PROGRESS => finalize and grade
    // - SUBMITTED   => allow re-run idempotently (helps recover partial failures)
    // - ABANDONED / EXPIRED => block
    const updated = await atomicUpdateSession(attemptId, (session) => {
      const allowed = isAuthorizedActor({
        ownerUserId: session.userId ?? null,
        ownerGuestToken: session.guestToken ?? null,
        authUserId,
        demoCookie,
      });

      if (!allowed) {
        forbidden = true;
        return session;
      }

      if (session.status === "ABANDONED" || session.status === "EXPIRED") {
        terminalStatus = session.status;
        return session;
      }

      if (session.status === "IN_PROGRESS") {
        session.status = "SUBMITTED";
        (session as any).submittedAt = now.toISOString();
      }

      session.lastSeenAt = now.toISOString();
      return session;
    });

    if (!updated) {
      return Response.json({ error: "Session not found" }, { status: 404 });
    }

    if (forbidden) {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (terminalStatus === "ABANDONED") {
      return Response.json({ error: "ATTEMPT_ABANDONED" }, { status: 409 });
    }

    if (terminalStatus === "EXPIRED") {
      return Response.json({ error: "ATTEMPT_EXPIRED" }, { status: 409 });
    }

    const submittedAt =
      typeof (updated as any).submittedAt === "string"
        ? (updated as any).submittedAt
        : now.toISOString();

    const questionOrder = Array.isArray(updated.questionOrder) ? updated.questionOrder : [];
    const committed = updated.committed ?? {};

    if (questionOrder.length === 0) {
      return Response.json(
        { error: "Attempt has no question order; cannot grade" },
        { status: 500 }
      );
    }

    const [passPercent, questionMetaMap] = await Promise.all([
      loadPassPercent(updated.testVersionId),
      loadQuestionMeta(questionOrder),
    ]);

    if (questionMetaMap.size !== questionOrder.length) {
      return Response.json(
        { error: "Question metadata is incomplete; cannot grade attempt" },
        { status: 500 }
      );
    }

    const answerRows: Array<{
      attempt_id: string;
      question_version_id: string;
      selected_option_ids: string[] | null;
      nat_value_raw: string | null;
      nat_value_normalized: number | null;
      saved_at: string;
    }> = [];

    for (const questionVersionId of questionOrder) {
      const meta = questionMetaMap.get(questionVersionId);

      if (!meta) {
        return Response.json(
          { error: `Missing metadata for question ${questionVersionId}` },
          { status: 500 }
        );
      }

      if (meta.type !== "NAT" && (!meta.correctOptionIds || meta.correctOptionIds.length === 0)) {
        return Response.json(
          { error: `Question ${questionVersionId} has no correct options encoded` },
          { status: 500 }
        );
      }

      const answer = (committed[questionVersionId] ?? null) as CommittedAnswer | null;

      if (answer) {
        answerRows.push({
          attempt_id: attemptId,
          question_version_id: questionVersionId,
          selected_option_ids:
            Array.isArray(answer.selectedOptionIds) && answer.selectedOptionIds.length > 0
              ? answer.selectedOptionIds.map(String)
              : null,
          nat_value_raw:
            typeof answer.natRaw === "string" && answer.natRaw.trim().length > 0
              ? answer.natRaw
              : null,
          nat_value_normalized:
            answer.natNormalized === null || answer.natNormalized === undefined
              ? null
              : Number(answer.natNormalized),
          saved_at: answer.savedAt ?? submittedAt,
        });
      }
    }

    const questions = questionOrder.map((id) => questionMetaMap.get(id)!);
    const committedAnswers: Record<string, CommittedAnswer | null> = {};
    for (const questionVersionId of questionOrder) {
      committedAnswers[questionVersionId] = (committed[questionVersionId] ?? null) as CommittedAnswer | null;
    }

    const graded = gradeAttempt(questions, committedAnswers, passPercent);
    const { score, maxScore, percent, passed } = graded;

    const questionScoreRows = graded.perQuestion.map((pq) => ({
      attempt_id: attemptId,
      question_version_id: pq.questionVersionId,
      earned_marks: pq.earned,
      max_marks: pq.maxMarks,
      correct: pq.correct,
      created_at: now.toISOString(),
    }));

    // -----------------------------------------------------------------------
    // Persist durable report tables
    // -----------------------------------------------------------------------

    // Rebuild answers snapshot for this attempt
    const delAnswers = await supabaseAdmin
      .schema("gate")
      .from("attempt_answers")
      .delete()
      .eq("attempt_id", attemptId);

    if (delAnswers.error) {
      console.error("[gate/attempts/[attemptId]/submit] Failed to clear attempt_answers", delAnswers.error);
      return Response.json({ error: "Failed to persist attempt answers" }, { status: 500 });
    }

    if (answerRows.length > 0) {
      const insAnswers = await supabaseAdmin
        .schema("gate")
        .from("attempt_answers")
        .insert(answerRows);

      if (insAnswers.error) {
        console.error("[gate/attempts/[attemptId]/submit] Failed to insert attempt_answers", insAnswers.error);
        return Response.json({ error: "Failed to persist attempt answers" }, { status: 500 });
      }
    }

    // Rebuild per-question scores snapshot for this attempt
    const delScores = await supabaseAdmin
      .schema("gate")
      .from("attempt_question_scores")
      .delete()
      .eq("attempt_id", attemptId);

    if (delScores.error) {
      console.error("[gate/attempts/[attemptId]/submit] Failed to clear attempt_question_scores", delScores.error);
      return Response.json({ error: "Failed to persist question scores" }, { status: 500 });
    }

    const insScores = await supabaseAdmin
      .schema("gate")
      .from("attempt_question_scores")
      .insert(questionScoreRows);

    if (insScores.error) {
      console.error("[gate/attempts/[attemptId]/submit] Failed to insert attempt_question_scores", insScores.error);
      return Response.json({ error: "Failed to persist question scores" }, { status: 500 });
    }

    const upsertResults = await supabaseAdmin
    .schema("gate")
    .from("attempt_results")
    .upsert(
      {
        attempt_id: attemptId,
        score,
        max_score: maxScore,
        percent,
        passed,
        updated_at: now.toISOString(),
      },
      { onConflict: "attempt_id" }
    );

  if (upsertResults.error) {
    console.error(
      "[gate/attempts/[attemptId]/submit] Failed to upsert attempt_results",
      upsertResults.error
    );
    return Response.json(
      { error: `Failed to persist attempt results: ${upsertResults.error.message}` },
      { status: 500 }
    );
  }

    // Keep Postgres attempt row consistent with finalized state
    const updAttempt = await supabaseAdmin
      .schema("gate")
      .from("attempts")
      .update({
        status: "SUBMITTED",
        submitted_at: submittedAt,
      })
      .eq("id", attemptId);

    if (updAttempt.error) {
      console.error("[gate/attempts/[attemptId]/submit] Failed to update attempt row", updAttempt.error);
      return Response.json({ error: "Failed to finalize attempt in database" }, { status: 500 });
    }

    // Optional audit/analytics event.
    // Do not fail submission if Redis stream is down.
    try {
      await emitAttemptEvent({
        eventId: crypto.randomUUID(),
        attemptId,
        userId: authUserId,
        type: "SUBMIT",
        occurredAt: now.toISOString(),
        payload: {
          committed: updated.committed,
          questionOrder: updated.questionOrder,
          results: {
            score,
            maxScore,
            percent,
            passed,
          },
        },
      });
    } catch (eventErr) {
      console.error(
        "[gate/attempts/[attemptId]/submit] Non-fatal: failed to emit SUBMIT event",
        eventErr
      );
    }

    return Response.json(
      {
        ok: true,
        status: "SUBMITTED",
        submittedAt,
        results: {
          score,
          maxScore,
          percent,
          passed,
        },
        reportUrl: `/gate/report/${attemptId}`,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[gate/attempts/[attemptId]/submit] POST error:", err);
    return Response.json({ error: err?.message ?? "Internal server error" }, { status: 500 });
  }
}
