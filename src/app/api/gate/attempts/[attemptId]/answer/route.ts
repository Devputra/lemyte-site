// src/app/api/gate/attempts/[attemptId]/answer/route.ts — save an answer ("Save & next").
import { z } from "zod";

import { attemptRoute, emitEvent, getActor, updateInProgress } from "@/lib/gate/attempt-route";
import type { DraftAnswer } from "@/lib/gate/contracts";
import { validateAndNormalizeNAT } from "@/lib/gate/nat";
import { onSaveAndNext } from "@/lib/gate/palette";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const AnswerSchema = z.object({
  questionId: z.string().uuid(),
  type: z.enum(["MCQ", "MSQ", "NAT"]),
  selectedOptionIds: z.array(z.string()).optional(),
  natRaw: z.string().optional(),
});
type Answer = z.infer<typeof AnswerSchema>;

const bad = (error: string) => Response.json({ error }, { status: 400 });

/** Shape checks: NAT carries only text, MCQ exactly one option, MSQ at least one. */
function shapeError(p: Answer): string | null {
  if (p.type === "NAT") return p.selectedOptionIds?.length ? "NAT answers must not contain selectedOptionIds" : null;
  if (p.natRaw?.trim()) return `${p.type} answers must not contain natRaw`;
  if (!p.selectedOptionIds?.length) return `${p.type} answers require selectedOptionIds`;
  if (p.type === "MCQ" && p.selectedOptionIds.length !== 1) return "MCQ answers must contain exactly one selected option";
  return null;
}

export const PUT = attemptRoute("answer", async (req, attemptId) => {
  const actor = await getActor(req);
  const p = AnswerSchema.parse(await req.json());
  const now = new Date();

  const shape = shapeError(p);
  if (shape) return bad(shape);

  // NAT: validate and normalise on the server, using the question's precision.
  let natNormalized: number | null = null;
  if (p.type === "NAT" && p.natRaw?.trim()) {
    const { data: qv, error } = await supabaseAdmin
      .schema("gate")
      .from("question_versions")
      .select("nat_precision")
      .eq("id", p.questionId)
      .single();
    if (error || !qv) return Response.json({ error: "Question not found" }, { status: 404 });
    const nat = validateAndNormalizeNAT(p.natRaw, qv.nat_precision ?? 0);
    if (nat && !nat.valid) return bad(nat.error);
    natNormalized = nat?.valid ? nat.normalized : null;
  }

  const updated = await updateInProgress(attemptId, actor, p.questionId, now, (s) => {
    const draft: DraftAnswer = {
      type: p.type,
      selectedOptionIds: p.selectedOptionIds,
      natRaw: p.natRaw,
      natNormalized,
      updatedAt: now.toISOString(),
    };
    s.drafts[p.questionId] = draft;
    onSaveAndNext(s.palette, s.drafts, s.committed, p.questionId);
  });
  if (updated instanceof Response) return updated;

  await emitEvent(attemptId, actor.authUserId, "ANSWER_COMMIT", now, {
    questionId: p.questionId,
    answerType: p.type,
    selectedOptionIds: p.selectedOptionIds ?? [],
    natNormalized,
  });
  return Response.json({ ok: true, questionId: p.questionId, paletteState: updated.palette[p.questionId], savedAt: now.toISOString() });
});
