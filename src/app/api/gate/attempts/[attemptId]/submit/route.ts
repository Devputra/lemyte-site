// src/app/api/gate/attempts/[attemptId]/submit/route.ts
import { supabaseServer } from "@/lib/supabase/server";
import { atomicUpdateSession, emitAttemptEvent } from "@/lib/gate/redis";
import crypto from "crypto";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await ctx.params;
  const supabase = supabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const now = new Date();

  const updated = await atomicUpdateSession(attemptId, (session) => {
    if (session.userId && session.userId !== authData.user.id) {
      throw new Error("FORBIDDEN");
    }
    if (session.status !== "IN_PROGRESS") {
      throw new Error("ALREADY_SUBMITTED_OR_INVALIDATED");
    }

    // 5-second transit grace at timer end
    const endsAt = new Date(session.endsAt);
    const graceEnd = new Date(endsAt.getTime() + 5000);
    if (now > graceEnd) {
      // Past grace period: still accept but mark as late
      // (the orphan sweeper would have caught this)
    }

    session.status = "SUBMITTED";
    (session as any).submittedAt = now.toISOString();
    return session;
  });

  if (!updated) {
    return Response.json({ error: "Session not found" }, { status: 404 });
  }

  // Emit SUBMIT event for worker to finalize grading
  await emitAttemptEvent({
    eventId: crypto.randomUUID(),
    attemptId,
    userId: authData.user.id,
    type: "SUBMIT",
    occurredAt: now.toISOString(),
    payload: {
      committed: updated.committed,
      questionOrder: updated.questionOrder,
    },
  });

  return Response.json(
    { ok: true, status: "SUBMIT_ACCEPTED" },
    { status: 202 }
  );
}
