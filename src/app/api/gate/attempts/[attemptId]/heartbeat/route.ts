// src/app/api/gate/attempts/[attemptId]/heartbeat/route.ts
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { atomicUpdateSession, emitAttemptEvent } from "@/lib/gate/redis";
import { onVisitQuestion } from "@/lib/gate/palette";
import crypto from "crypto";

export const runtime = "nodejs";

const HeartbeatSchema = z.object({
  currentQuestionId: z.string(),
  draftAnswer: z.any().optional(),
  calcState: z.object({ memory: z.number() }).optional(),
  focusLostDelta: z.object({
    count: z.number().int().min(0),
    seconds: z.number().int().min(0),
  }).optional(),
});

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await ctx.params;
  const supabase = supabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const body = await req.json();
  const payload = HeartbeatSchema.parse(body);
  const now = new Date();

  const updated = await atomicUpdateSession(attemptId, (session) => {
    // Check ownership
    if (session.userId && session.userId !== authData.user.id) {
      throw new Error("FORBIDDEN");
    }

    // Check if attempt has ended
    if (now >= new Date(session.endsAt)) {
      throw new Error("ATTEMPT_ENDED");
    }

    session.lastSeenAt = now.toISOString();
    session.currentQuestionId = payload.currentQuestionId;
    onVisitQuestion(session.palette as any, payload.currentQuestionId);

    if (payload.draftAnswer) {
      session.drafts[payload.currentQuestionId] = {
        ...payload.draftAnswer,
        updatedAt: now.toISOString(),
      };
    }

    if (payload.calcState) {
      session.calculator = payload.calcState;
    }

    if (payload.focusLostDelta) {
      session.focusLostCount += payload.focusLostDelta.count;
      session.focusLostSeconds += payload.focusLostDelta.seconds;
    }

    return session;
  });

  if (!updated) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  await emitAttemptEvent({
    eventId: crypto.randomUUID(),
    attemptId,
    userId: authData.user.id,
    type: "HEARTBEAT",
    occurredAt: now.toISOString(),
    payload: { currentQuestionId: payload.currentQuestionId },
  });

  const remaining = new Date(updated.endsAt).getTime() - now.getTime();

  return Response.json({
    ok: true,
    serverTime: now.toISOString(),
    remainingMs: Math.max(0, remaining),
  });
}
