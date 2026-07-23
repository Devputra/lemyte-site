// src/app/api/gate/attempts/[attemptId]/mark/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { atomicUpdateSession, emitAttemptEvent } from "@/lib/gate/redis";
import { onMarkToggle } from "@/lib/gate/palette";
import crypto from "crypto";

export const runtime = "nodejs";

const DEMO_COOKIE_NAME = "lm_demo_token";

const MarkSchema = z.object({
  questionId: z.string().uuid(),
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
    const { questionId } = MarkSchema.parse(body);
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

      if (!session.questionOrder.includes(questionId)) {
        questionNotInAttempt = true;
        return session;
      }

      onMarkToggle(session.palette as any, questionId);
      session.lastSeenAt = now.toISOString();
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
      type: "PALETTE_UPDATE",
      occurredAt: now.toISOString(),
      payload: { questionId, action: "MARK_TOGGLE" },
    });

    return Response.json({
      ok: true,
      questionId,
      paletteState: updated.palette[questionId],
      updatedAt: now.toISOString(),
    });
  } catch (err: any) {
    if (err?.issues) {
      return Response.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 }
      );
    }

    console.error("[gate/attempts/[attemptId]/mark] PUT error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
