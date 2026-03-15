// src/app/api/gate/errata/report/route.ts
import { z } from "zod";
import { requireUser } from "@/lib/authz";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ErrataReportSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  questionVersionId: z.string().uuid(),
  reason: z.string().min(10).max(2000),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const body = await req.json();
  const input = ErrataReportSchema.parse(body);

  // Verify attempt ownership
  const { data: attempt } = await supabaseAdmin
    .from("gate.attempts" as any)
    .select("id, user_id")
    .eq("id", input.attemptId)
    .single();

  if (!attempt || attempt.user_id !== user.id) {
    return Response.json({ error: "Attempt not found or not owned by you" }, { status: 403 });
  }

  const { data: report, error } = await supabaseAdmin
    .from("gate.errata_reports" as any)
    .insert({
      question_id: input.questionId,
      question_version_id: input.questionVersionId,
      reported_by: user.id,
      attempt_id: input.attemptId,
      reason: input.reason,
      status: "OPEN",
    })
    .select("id")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ reportId: report.id }, { status: 201 });
}
