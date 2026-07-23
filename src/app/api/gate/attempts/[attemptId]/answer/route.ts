// src/app/api/gate/attempts/[attemptId]/answer/route.ts

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { atomicUpdateSession, emitAttemptEvent } from "@/lib/gate/redis";
import { onSaveAndNext } from "@/lib/gate/palette";
import { validateAndNormalizeNAT } from "@/lib/gate/nat";
import type { DraftAnswer } from "@/lib/gate/contracts";
import crypto from "crypto";

export const runtime = "nodejs";

const DEMO_COOKIE_NAME = "lm_demo_token";

const AnswerSchema = z.object({
  questionId: z.string().uuid(),
  type: z.enum(["MCQ", "MSQ", "NAT"]),
  selectedOptionIds: z.array(z.string()).optional(),
  natRaw: z.string().optional(),
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

    // Authenticated user is optional for DEMO mode
    const authUserId = authErr ? null : authData?.user?.id ?? null;
    const demoCookie = req.cookies.get(DEMO_COOKIE_NAME)?.value ?? null;

    const body = await req.json();
    const payload = AnswerSchema.parse(body);
    const now = new Date();

    // Lightweight payload sanity checks
    if (payload.type === "NAT") {
      if (payload.selectedOptionIds && payload.selectedOptionIds.length > 0) {
        return Response.json(
          { error: "NAT answers must not contain selectedOptionIds" },
          { status: 400 }
        );
      }
    } else {
      if (payload.natRaw && payload.natRaw.trim().length > 0) {
        return Response.json(
          { error: `${payload.type} answers must not contain natRaw` },
          { status: 400 }
        );
      }

      if (!payload.selectedOptionIds || payload.selectedOptionIds.length === 0) {
        return Response.json(
          { error: `${payload.type} answers require selectedOptionIds` },
          { status: 400 }
        );
      }

      if (payload.type === "MCQ" && payload.selectedOptionIds.length !== 1) {
        return Response.json(
          { error: "MCQ answers must contain exactly one selected option" },
          { status: 400 }
        );
      }
    }

    // For NAT: validate and normalize server-side
    let natNormalized: number | null = null;
    if (payload.type === "NAT" && payload.natRaw && payload.natRaw.trim().length > 0) {
      const { data: qv, error: qvErr } = await supabaseAdmin
        .schema("gate")
        .from("question_versions")
        .select("nat_lower_bound, nat_upper_bound, nat_precision")
        .eq("id", payload.questionId)
        .single();

      if (qvErr || !qv) {
        return Response.json({ error: "Question not found" }, { status: 404 });
      }

      const natResult = validateAndNormalizeNAT(
        payload.natRaw,
        qv.nat_precision ?? 0,
      );

      if (natResult !== null && !natResult.valid) {
        return Response.json({ error: (natResult as any).error }, { status: 400 });
      }

      natNormalized = natResult && natResult.valid ? natResult.normalized : null;
    }

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

      if (!session.questionOrder.includes(payload.questionId)) {
        questionNotInAttempt = true;
        return session;
      }

      const draft: DraftAnswer = {
        type: payload.type,
        selectedOptionIds: payload.selectedOptionIds,
        natRaw: payload.natRaw,
        natNormalized,
        updatedAt: now.toISOString(),
      };

      session.drafts[payload.questionId] = draft;

      // Save current answer and transition palette state.
      onSaveAndNext(
        session.palette as any,
        session.drafts as any,
        session.committed as any,
        payload.questionId
      );

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
      type: "ANSWER_COMMIT",
      occurredAt: now.toISOString(),
      payload: {
        questionId: payload.questionId,
        answerType: payload.type,
        selectedOptionIds: payload.selectedOptionIds ?? [],
        natNormalized,
      },
    });

    return Response.json({
      ok: true,
      questionId: payload.questionId,
      paletteState: updated.palette[payload.questionId],
      savedAt: now.toISOString(),
    });
  } catch (err: any) {
    if (err?.issues) {
      return Response.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 }
      );
    }

    console.error("[gate/attempts/[attemptId]/answer] PUT error:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
