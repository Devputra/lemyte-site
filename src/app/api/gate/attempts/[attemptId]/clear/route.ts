// src/app/api/gate/attempts/[attemptId]/clear/route.ts — clear the saved answer for a question.
import { z } from "zod";

import { attemptRoute, emitEvent, getActor, updateInProgress } from "@/lib/gate/attempt-route";
import { onClear } from "@/lib/gate/palette";

export const runtime = "nodejs";

const ClearSchema = z.object({ questionId: z.string().uuid() });

export const PUT = attemptRoute("clear", async (req, attemptId) => {
  const actor = await getActor(req);
  const { questionId } = ClearSchema.parse(await req.json());
  const now = new Date();

  const updated = await updateInProgress(attemptId, actor, questionId, now, (s) =>
    onClear(s.palette, s.drafts, s.committed, questionId),
  );
  if (updated instanceof Response) return updated;

  await emitEvent(attemptId, actor.authUserId, "ANSWER_COMMIT", now, { questionId, action: "CLEAR" });
  return Response.json({ ok: true, questionId, paletteState: updated.palette[questionId], clearedAt: now.toISOString() });
});
