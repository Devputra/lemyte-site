// src/lib/gate/attempt-route.ts — shared plumbing for /api/gate/attempts/* route handlers:
// who is calling (signed-in user or demo guest), the error wrapper, and the standard
// "update an in-progress session" flow used by answer / clear / mark / heartbeat.
import "server-only";
import crypto from "crypto";
import type { NextRequest } from "next/server";

import { isAuthorizedActor } from "@/lib/gate/auth";
import type { AttemptSession } from "@/lib/gate/contracts";
import { handleRouteError } from "@/lib/gate/errors";
import { atomicUpdateSession, emitAttemptEvent } from "@/lib/gate/redis";
import { supabaseServer } from "@/lib/supabase/server";

export const DEMO_COOKIE_NAME = "lm_demo_token";

export type Actor = { authUserId: string | null; demoCookie: string | null };

/** The caller: a signed-in user id (optional for DEMO attempts) and the guest demo cookie. */
export async function getActor(req: NextRequest): Promise<Actor> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();
  return {
    authUserId: error ? null : (data?.user?.id ?? null),
    demoCookie: req.cookies.get(DEMO_COOKIE_NAME)?.value ?? null,
  };
}

type Ctx = { params: Promise<{ attemptId: string }> };

/** Wraps a handler: resolves the attemptId param and turns thrown errors into JSON responses. */
export function attemptRoute(label: string, handler: (req: NextRequest, attemptId: string) => Promise<Response>) {
  return async (req: NextRequest, ctx: Ctx) => {
    try {
      return await handler(req, (await ctx.params).attemptId);
    } catch (err: unknown) {
      return handleRouteError(err, `gate/attempts/[attemptId]/${label}`);
    }
  };
}

/**
 * Atomically update an in-progress session for `questionId`, after checking that the caller owns
 * the attempt, time hasn't run out, and the question is part of it. Returns the updated session,
 * or the error Response to send back.
 */
export async function updateInProgress(
  attemptId: string,
  actor: Actor,
  questionId: string,
  now: Date,
  apply: (session: AttemptSession) => void,
): Promise<AttemptSession | Response> {
  let failure: Response | null = null;
  const updated = await atomicUpdateSession(attemptId, (session) => {
    const allowed = isAuthorizedActor({
      ownerUserId: session.userId ?? null,
      ownerGuestToken: session.guestToken ?? null,
      ...actor,
    });
    if (!allowed) failure = Response.json({ error: "FORBIDDEN" }, { status: 403 });
    else if (now >= new Date(session.endsAt)) failure = Response.json({ error: "ATTEMPT_ENDED" }, { status: 409 });
    else if (!session.questionOrder.includes(questionId))
      failure = Response.json({ error: "QUESTION_NOT_IN_ATTEMPT" }, { status: 400 });
    else {
      apply(session);
      session.lastSeenAt = now.toISOString();
    }
    return session;
  });
  if (!updated) return Response.json({ error: "Session not found" }, { status: 404 });
  return failure ?? updated;
}

/** Append an event to the attempt event stream. */
export function emitEvent(
  attemptId: string,
  userId: string | null,
  type: Parameters<typeof emitAttemptEvent>[0]["type"],
  now: Date,
  payload: Record<string, unknown>,
) {
  return emitAttemptEvent({ eventId: crypto.randomUUID(), attemptId, userId, type, occurredAt: now.toISOString(), payload });
}
