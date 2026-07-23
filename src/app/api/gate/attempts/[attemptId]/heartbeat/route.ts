// src/app/api/gate/attempts/[attemptId]/heartbeat/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { atomicUpdateSession, emitAttemptEvent } from "@/lib/gate/redis";
import { onVisitQuestion } from "@/lib/gate/palette";
import type { DraftAnswer } from "@/lib/gate/contracts";
import crypto from "crypto";

export const runtime = "nodejs";

const DEMO_COOKIE_NAME = "lm_demo_token";

const HeartbeatSchema = z.object({
  currentQuestionId: z.string().uuid(),
  draftAnswer: z.any().optional(),
  calcState: z.object({ memory: z.number() }).optional(),
  focusLostDelta: z
    .object({
      count: z.number().int().min(0),
      seconds: z.number().int().min(0),
    })
    .optional(),
});

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

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ attemptId: string }> }
) {
  try {
    const { attemptId } = await ctx.params;

    const supabase = await supabaseServer();
    const { data: authData, error: authErr } = await supabase.auth.getUser();

    // Logged-in user is optional for DEMO mode
    const authUserId = authErr ? null : authData?.user?.id ?? null;
    const demoCookie = req.cookies.get(DEMO_COOKIE_NAME)?.value ?? null;

    const body = await req.json();
    const payload = HeartbeatSchema.parse(body);
    const now = new Date();

    let forbidden = false;
    let attemptEnded = false;
    let questionNotInAttempt = false;

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

      if (now >= new Date(session.endsAt)) {
        attemptEnded = true;
        return session;
      }

      if (!session.questionOrder.includes(payload.currentQuestionId)) {
        questionNotInAttempt = true;
        return session;
      }

      session.lastSeenAt = now.toISOString();
      session.currentQuestionId = payload.currentQuestionId;

      onVisitQuestion(session.palette as any, payload.currentQuestionId);

      if (payload.draftAnswer) {
        session.drafts[payload.currentQuestionId] = {
          ...(payload.draftAnswer as Partial<DraftAnswer>),
          updatedAt: now.toISOString(),
        } as DraftAnswer;
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

    if (forbidden) {
      return Response.json({ error: "FORBIDDEN" }, { status: 403 });
    }

    if (attemptEnded) {
      return Response.json({ error: "ATTEMPT_ENDED" }, { status: 409 });
    }

    if (questionNotInAttempt) {
      return Response.json({ error: "QUESTION_NOT_IN_ATTEMPT" }, { status: 400 });
    }

    await emitAttemptEvent({
      eventId: crypto.randomUUID(),
      attemptId,
      userId: authUserId,
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
  } catch (err: any) {
    if (err?.issues) {
      return Response.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 }
      );
    }

    console.error("[gate/attempts/[attemptId]/heartbeat] PUT error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
