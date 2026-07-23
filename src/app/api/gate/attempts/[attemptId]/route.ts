// src/app/api/gate/attempts/[attemptId]/route.ts
//
// GET: Resume attempt — returns session state AND question content.

import { NextRequest } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAttemptSession, emitAttemptEvent } from "@/lib/gate/redis";
import crypto from "crypto";

export const runtime = "nodejs";

const DEMO_COOKIE_NAME = "lm_demo_token";

type QuestionContent = {
  questionVersionId: string;
  type: string;
  marks: number;
  markdown: string;
  text: string;
  options: Array<{
    id: string;
    markdown: string;
    text: string;
  }>;
  section: string;
};

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

async function loadQuestionContent(
  questionVersionIds: string[],
  testVersionId: string
): Promise<Record<string, QuestionContent>> {
  if (questionVersionIds.length === 0) return {};

  const { data: versions, error: versionsErr } = await supabaseAdmin
    .schema("gate")
    .from("question_versions")
    .select("id, type, marks, markdown_content, options_array, explanation_markdown")
    .in("id", questionVersionIds);

  if (versionsErr) {
    throw new Error(`Failed to load question_versions: ${versionsErr.message}`);
  }

  const { data: tvQuestions, error: tvqErr } = await supabaseAdmin
    .schema("gate")
    .from("test_version_questions")
    .select("question_version_id, section")
    .eq("test_version_id", testVersionId)
    .in("question_version_id", questionVersionIds);

  if (tvqErr) {
    throw new Error(`Failed to load test_version_questions: ${tvqErr.message}`);
  }

  const sectionMap: Record<string, string> = {};
  for (const tvq of tvQuestions ?? []) {
    sectionMap[String(tvq.question_version_id)] = String(tvq.section ?? "CORE");
  }

  const questions: Record<string, QuestionContent> = {};
  for (const v of versions ?? []) {
    const options = Array.isArray(v.options_array)
      ? v.options_array.map((opt: any) => ({
          id: String(opt.id),
          markdown: String(opt.markdown ?? ""),
          text: String(opt.markdown ?? ""),
        }))
      : [];

    questions[String(v.id)] = {
      questionVersionId: String(v.id),
      type: String(v.type),
      marks: Number(v.marks),
      markdown: String(v.markdown_content),
      text: String(v.markdown_content),
      options,
      section: sectionMap[String(v.id)] ?? "CORE",
    };
  }

  return questions;
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await ctx.params;

    const supabase = await supabaseServer();
    const { data: authData } = await supabase.auth.getUser();
    const authUserId = authData?.user?.id ?? null;
    const demoCookie = req.cookies.get(DEMO_COOKIE_NAME)?.value ?? null;

    // ========= TRY REDIS FIRST =========
    let session: Awaited<ReturnType<typeof getAttemptSession>> = null;

    try {
      session = await getAttemptSession(attemptId);
    } catch (redisErr) {
      console.error(
        "[gate/attempts/[attemptId]] Redis read failed, falling back to Postgres",
        redisErr
      );
      session = null;
    }

    if (session) {
      const allowed = isAuthorizedActor({
        ownerUserId: session.userId ?? null,
        ownerGuestToken: session.guestToken ?? null,
        authUserId,
        demoCookie,
      });

      if (!allowed) {
        return Response.json({ error: "FORBIDDEN" }, { status: 403 });
      }

      const now = new Date();
      const remaining = new Date(session.endsAt).getTime() - now.getTime();

      const questions = await loadQuestionContent(
        session.questionOrder,
        session.testVersionId
      );

      return Response.json({
        status: session.status,
        attemptId: session.attemptId,
        testVersionId: session.testVersionId,
        mode: session.mode,
        endsAt: session.endsAt,
        startedAt: session.startedAt,
        shuffleSeed: session.shuffleSeed,
        questionOrder: session.questionOrder,
        optionOrderByQuestion: session.optionOrderByQuestion,
        currentQuestionId: session.currentQuestionId,
        palette: session.palette,
        drafts: session.drafts,
        committed: session.committed,
        calculator: session.calculator,
        focusLostCount: session.focusLostCount,
        focusLostSeconds: session.focusLostSeconds,
        serverTime: now.toISOString(),
        remainingMs: Math.max(0, remaining),
        questions,
      });
    }

    // ========= FALLBACK TO POSTGRES =========
    const { data: attempt, error: atErr } = await supabaseAdmin
      .schema("gate")
      .from("attempts")
      .select("id, user_id, guest_token, status, submitted_at, ends_at, mode, test_version_id")
      .eq("id", attemptId)
      .single();

    if (atErr || !attempt) {
      return Response.json({ error: "Attempt not found" }, { status: 404 });
    }

    const allowed = isAuthorizedActor({
      ownerUserId: attempt.user_id ?? null,
      ownerGuestToken: attempt.guest_token ?? null,
      authUserId,
      demoCookie,
    });

    if (!allowed) {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (attempt.status === "SUBMITTED") {
      return Response.json({
        status: "SUBMITTED",
        attemptId: attempt.id,
        submittedAt: attempt.submitted_at,
      });
    }

    if (attempt.status === "EXPIRED") {
      return Response.json(
        {
          status: "EXPIRED",
          attemptId: attempt.id,
          endsAt: attempt.ends_at,
          error: "Attempt has expired.",
        },
        { status: 409 }
      );
    }

    if (attempt.status === "ABANDONED") {
      return Response.json(
        {
          status: "ABANDONED",
          attemptId: attempt.id,
          error: "Session unavailable. Please start a new attempt.",
        },
        { status: 409 }
      );
    }

    if (attempt.status === "IN_PROGRESS") {
      const now = new Date();

      const { error: updErr } = await supabaseAdmin
        .schema("gate")
        .from("attempts")
        .update({ status: "ABANDONED" })
        .eq("id", attemptId);

      if (updErr) {
        console.error(
          "[gate/attempts/[attemptId]] Failed to abandon lost session",
          updErr
        );
      }

      await emitAttemptEvent({
        eventId: crypto.randomUUID(),
        attemptId,
        userId: authUserId,
        type: "ABANDON",
        occurredAt: now.toISOString(),
        payload: { reason: "REDIS_DATA_LOSS" },
      });

      return Response.json(
        {
          status: "ABANDONED",
          attemptId: attempt.id,
          error: "Session unavailable. Attempt marked abandoned. Please start a new attempt.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      {
        error: "Unknown attempt state",
        status: attempt.status,
      },
      { status: 500 }
    );
  } catch (err: any) {
    console.error("[gate/attempts/[attemptId]] GET error:", err);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
