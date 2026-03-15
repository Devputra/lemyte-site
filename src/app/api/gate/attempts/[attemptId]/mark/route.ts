// src/app/api/gate/attempts/[attemptId]/mark/route.ts
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { atomicUpdateSession, emitAttemptEvent } from "@/lib/gate/redis";
import { onMarkToggle } from "@/lib/gate/palette";
import crypto from "crypto";

export const runtime = "nodejs";

const MarkSchema = z.object({ questionId: z.string() });

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
  const { questionId } = MarkSchema.parse(body);
  const now = new Date();

  const updated = await atomicUpdateSession(attemptId, (session) => {
    if (session.userId && session.userId !== authData.user.id) {
      throw new Error("FORBIDDEN");
    }
    if (now >= new Date(session.endsAt)) {
      throw new Error("ATTEMPT_ENDED");
    }

    onMarkToggle(session.palette as any, questionId);
    return session;
  });

  if (!updated) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  await emitAttemptEvent({
    eventId: crypto.randomUUID(),
    attemptId,
    userId: authData.user.id,
    type: "PALETTE_UPDATE",
    occurredAt: now.toISOString(),
    payload: { questionId, action: "MARK_TOGGLE" },
  });

  return Response.json({
    ok: true,
    paletteState: updated.palette[questionId],
  });
}
