import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/authz";
import { one } from "@/lib/utils";

const SaveSchema = z.object({
  questionId: z.string().uuid(),
  selectedOptionIds: z.array(z.string().uuid()).min(1),
});

export async function PUT(req: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await ctx.params;
  const user = await requireUser();
  const body = SaveSchema.parse(await req.json());

  const supabase = await supabaseServer();
  const { data: at, error: atErr } = await supabase
    .from("attempts")
    .select("id, ends_at, submitted_at, test_assignments!inner ( employee_id )")
    .eq("id", attemptId)
    .single();

  if (atErr) return Response.json({ error: atErr.message }, { status: 404 });
  if (!at) return Response.json({ error: "ATTEMPT_NOT_FOUND" }, { status: 404 });
  
  const asg = one(at.test_assignments);
  if (!asg) return Response.json({ error: "ASSIGNMENT_NOT_FOUND" }, { status: 404 });
  if (asg.employee_id !== user.id) return Response.json({ error: "FORBIDDEN" }, { status: 403 });


  if (at.submitted_at) return Response.json({ error: "ALREADY_SUBMITTED" }, { status: 400 });
  if (at.ends_at && new Date() > new Date(at.ends_at)) return Response.json({ error: "TIME_EXPIRED" }, { status: 400 });

  const up = await supabaseAdmin
    .from("attempt_answers")
    .upsert({
      attempt_id: attemptId,
      question_id: body.questionId,
      selected_option_ids: body.selectedOptionIds,
      saved_at: new Date().toISOString(),
    });

  if (up.error) return Response.json({ error: up.error.message }, { status: 400 });
  return Response.json({ ok: true });
}
