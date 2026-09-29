// src/app/api/gate/attempts/[attemptId]/heartbeat/route.ts — periodic sync: current question,
// unsaved draft, calculator memory and focus-loss counters. Returns the server's remaining time.
import { z } from "zod";

import { attemptRoute, emitEvent, getActor, updateInProgress } from "@/lib/gate/attempt-route";
import type { DraftAnswer } from "@/lib/gate/contracts";
import { onVisitQuestion } from "@/lib/gate/palette";

export const runtime = "nodejs";

const HeartbeatSchema = z.object({
  currentQuestionId: z.string().uuid(),
  draftAnswer: z
    .object({
      type: z.enum(["MCQ", "MSQ", "NAT"]),
      selectedOptionIds: z.array(z.string()).optional(),
      natRaw: z.string().optional(),
      natNormalized: z.number().nullable().optional(),
      updatedAt: z.string().optional(),
    })
    .optional(),
  calcState: z.object({ memory: z.number() }).optional(),
  focusLostDelta: z.object({ count: z.number().int().min(0), seconds: z.number().int().min(0) }).optional(),
});

export const PUT = attemptRoute("heartbeat", async (req, attemptId) => {
  const actor = await getActor(req);
  const p = HeartbeatSchema.parse(await req.json());
  const now = new Date();

  const updated = await updateInProgress(attemptId, actor, p.currentQuestionId, now, (s) => {
    s.currentQuestionId = p.currentQuestionId;
    onVisitQuestion(s.palette, p.currentQuestionId);
    if (p.draftAnswer) s.drafts[p.currentQuestionId] = { ...p.draftAnswer, updatedAt: now.toISOString() } as DraftAnswer;
    if (p.calcState) s.calculator = p.calcState;
    if (p.focusLostDelta) {
      s.focusLostCount += p.focusLostDelta.count;
      s.focusLostSeconds += p.focusLostDelta.seconds;
    }
  });
  if (updated instanceof Response) return updated;

  await emitEvent(attemptId, actor.authUserId, "HEARTBEAT", now, { currentQuestionId: p.currentQuestionId });
  return Response.json({
    ok: true,
    serverTime: now.toISOString(),
    remainingMs: Math.max(0, new Date(updated.endsAt).getTime() - now.getTime()),
  });
});
