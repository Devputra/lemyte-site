// src/app/api/gate/attempts/[attemptId]/answer/route.ts
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { atomicUpdateSession, emitAttemptEvent } from "@/lib/gate/redis";
import { onSaveAndNext } from "@/lib/gate/palette";
import { validateAndNormalizeNAT } from "@/lib/gate/nat";
import type { DraftAnswer } from "@/lib/gate/contracts";
import crypto from "crypto";

export const runtime = "nodejs";

const AnswerSchema = z.object({
  questionId: z.string(),
  type: z.enum(["MCQ", "MSQ", "NAT"]),
  selectedOptionIds: z.array(z.string()).optional(),
  natRaw: z.string().optional(),
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
  const payload = AnswerSchema.parse(body);
  const now = new Date();

  // For NAT: validate and normalize server-side
  let natNormalized: number | null = null;
  if (payload.type === "NAT" && payload.natRaw) {
    // Load question metadata for NAT bounds
    const { data: qv } = await supabaseAdmin
      .from("gate.question_versions" as any)
      .select("nat_lower_bound, nat_upper_bound, nat_precision")
      .eq("id", payload.questionId)
      .single();

    if (!qv) {
      return Response.json({ error: "Question not found" }, { status: 404 });
    }

    const natResult = validateAndNormalizeNAT(
      payload.natRaw,
      qv.nat_precision ?? 0,
      qv.nat_lower_bound ?? 0,
      qv.nat_upper_bound ?? 0
    );

    if (natResult !== null && !natResult.valid) {
      return Response.json({ error: (natResult as any).error }, { status: 400 });
    }

    natNormalized = natResult && natResult.valid ? natResult.normalized : null;
  }

  const updated = await atomicUpdateSession(attemptId, (session) => {
    if (session.userId && session.userId !== authData.user.id) {
      throw new Error("FORBIDDEN");
    }
    if (now >= new Date(session.endsAt)) {
      throw new Error("ATTEMPT_ENDED");
    }

    const draft: DraftAnswer = {
      type: payload.type,
      selectedOptionIds: payload.selectedOptionIds,
      natRaw: payload.natRaw,
      natNormalized,
      updatedAt: now.toISOString(),
    };

    session.drafts[payload.questionId] = draft;

    // Execute Save & Next transition
    onSaveAndNext(
      session.palette as any,
      session.drafts as any,
      session.committed as any,
      payload.questionId
    );

    return session;
  });

  if (!updated) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  await emitAttemptEvent({
    eventId: crypto.randomUUID(),
    attemptId,
    userId: authData.user.id,
    type: "ANSWER_COMMIT",
    occurredAt: now.toISOString(),
    payload: {
      questionId: payload.questionId,
      type: payload.type,
    },
  });

  return Response.json({
    ok: true,
    paletteState: updated.palette[payload.questionId],
  });
}
