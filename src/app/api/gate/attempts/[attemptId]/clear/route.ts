// src/app/api/gate/attempts/[attemptId]/clear/route.ts
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { atomicUpdateSession, emitAttemptEvent } from "@/lib/gate/redis";
import { onClear } from "@/lib/gate/palette";
import crypto from "crypto";

export const runtime = "nodejs";

const ClearSchema = z.object({ questionId: z.string() });

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
  const { questionId } = ClearSchema.parse(body);
  const now = new Date();

  const updated = await atomicUpdateSession(attemptId, (session) => {
    if (session.userId && session.userId !== authData.user.id) {
      throw new Error("FORBIDDEN");
    }
    if (now >= new Date(session.endsAt)) {
      throw new Error("ATTEMPT_ENDED");
    }

    onClear(
      session.palette as any,
      session.drafts as any,
      session.committed as any,
      questionId
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
    payload: { questionId, action: "CLEAR" },
  });

  return Response.json({
    ok: true,
    paletteState: updated.palette[questionId],
  });
}
