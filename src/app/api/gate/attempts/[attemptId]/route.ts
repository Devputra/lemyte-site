// src/app/api/gate/attempts/[attemptId]/route.ts
// GET: Resume / Redis Loss Invalidation
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getAttemptSession, emitAttemptEvent } from "@/lib/gate/redis";
import crypto from "crypto";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await ctx.params;

  // Auth: try authenticated user, or check guest token
  const supabase = supabaseServer();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id ?? null;

  // ========== TRY REDIS FIRST ==========
  const session = await getAttemptSession(attemptId);

  if (session) {
    // Verify ownership
    if (session.userId && session.userId !== userId) {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    const now = new Date();
    const remaining = new Date(session.endsAt).getTime() - now.getTime();

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
    });
  }

  // ========== REDIS SESSION MISSING → CHECK POSTGRES ==========
  const { data: attempt, error: atErr } = await supabaseAdmin
    .from("gate.attempts" as any)
    .select("id, user_id, status, submitted_at, ends_at, mode, test_version_id")
    .eq("id", attemptId)
    .single();

  if (atErr || !attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }

  // Verify ownership
  if (attempt.user_id && attempt.user_id !== userId) {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (attempt.status === "SUBMITTED") {
    return Response.json({
      status: "SUBMITTED",
      attemptId: attempt.id,
      submittedAt: attempt.submitted_at,
    });
  }

  if (attempt.status === "INVALIDATED") {
    return Response.json({
      status: "INVALIDATED",
      attemptId: attempt.id,
      error: "Attempt was invalidated",
    });
  }

  if (attempt.status === "IN_PROGRESS") {
    // CRITICAL FIX: Redis session lost but DB says IN_PROGRESS
    // Free the concurrency lock by invalidating
    const now = new Date();

    await supabaseAdmin
      .from("gate.attempts" as any)
      .update({
        status: "INVALIDATED",
        invalidated_at: now.toISOString(),
        invalidation_reason: "REDIS_DATA_LOSS",
      })
      .eq("id", attemptId);

    await emitAttemptEvent({
      eventId: crypto.randomUUID(),
      attemptId,
      userId,
      type: "INVALIDATE",
      occurredAt: now.toISOString(),
      payload: { reason: "REDIS_DATA_LOSS" },
    });

    return Response.json(
      {
        error: "Session unavailable. Attempt invalidated due to data loss. Please start a new attempt.",
        status: "INVALIDATED",
      },
      { status: 409 }
    );
  }

  return Response.json({ error: "Unknown attempt state" }, { status: 500 });
}
