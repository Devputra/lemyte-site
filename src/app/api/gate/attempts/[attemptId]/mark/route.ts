// src/app/api/gate/attempts/[attemptId]/mark/route.ts — toggle "marked for review" on a question.
import { z } from "zod";

import { attemptRoute, emitEvent, getActor, updateInProgress } from "@/lib/gate/attempt-route";
import { onMarkToggle } from "@/lib/gate/palette";

export const runtime = "nodejs";

const MarkSchema = z.object({ questionId: z.string().uuid() });

export const PUT = attemptRoute("mark", async (req, attemptId) => {
  const actor = await getActor(req);
  const { questionId } = MarkSchema.parse(await req.json());
  const now = new Date();

  const updated = await updateInProgress(attemptId, actor, questionId, now, (s) => onMarkToggle(s.palette, questionId));
  if (updated instanceof Response) return updated;

  await emitEvent(attemptId, actor.authUserId, "PALETTE_UPDATE", now, { questionId, action: "MARK_TOGGLE" });
  return Response.json({ ok: true, questionId, paletteState: updated.palette[questionId], updatedAt: now.toISOString() });
});
