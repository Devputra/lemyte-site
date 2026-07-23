import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/authz";
import { one } from "@/lib/utils";

export async function GET(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const user = await requireUser();
  const { attemptId } = await ctx.params;

  // Validate attempt belongs to user via RLS client
  const supabase = await supabaseServer();
  const { data: at, error: atErr } = await supabase
    .from("attempts")
    .select(`
      id, started_at, ends_at, submitted_at,
      test_assignments!inner ( employee_id, test_id, tests!inner ( title, duration_seconds ) )
    `)
    .eq("id", attemptId)
    .single();

  if (atErr) return Response.json({ error: atErr.message }, { status: 404 });
  const asg = one(at.test_assignments);
  if (!asg) return Response.json({ error: "ASSIGNMENT_NOT_FOUND" }, { status: 404 });

  if (asg.employee_id !== user.id) return Response.json({ error: "FORBIDDEN" }, { status: 403 });

  const test = one(asg.tests);
  

  const { data: atq, error: qErr } = await supabaseAdmin
    .from("attempt_questions")
    .select("question_id, question_order, option_order")
    .eq("attempt_id", attemptId)
    .order("question_order");

  if (qErr) return Response.json({ error: qErr.message }, { status: 400 });

  const qids = atq.map((r: any) => r.question_id as string);

  const qs = await supabaseAdmin
    .from("questions")
    .select("id, text, marks")
    .in("id", qids);

  if (qs.error) return Response.json({ error: qs.error.message }, { status: 400 });

  const qById = new Map((qs.data as any[]).map((q) => [q.id, q]));

  const allOptionIds = atq.flatMap((r: any) => r.option_order as string[]);
  const opts = await supabaseAdmin
    .from("question_options")
    .select("id, option_text, question_id")
    .in("id", allOptionIds);

  if (opts.error) return Response.json({ error: opts.error.message }, { status: 400 });
  const optById = new Map((opts.data as any[]).map((o) => [o.id, o]));

  // saved answers
  const ans = await supabaseAdmin
    .from("attempt_answers")
    .select("question_id, selected_option_ids")
    .eq("attempt_id", attemptId);

  const selectedByQid = new Map((ans.data ?? []).map((a: any) => [a.question_id, a.selected_option_ids]));

  const questions = atq.map((r: any) => {
    const q = qById.get(r.question_id);
    const orderedOpts = (r.option_order as string[]).map((oid) => {
      const o = optById.get(oid);
      return { id: oid, text: o?.option_text ?? "" };
    });

    return {
      id: r.question_id,
      order: r.question_order,
      text: q?.text ?? "",
      marks: q?.marks ?? 1,
      options: orderedOpts,
      selectedOptionIds: selectedByQid.get(r.question_id) ?? [],
    };
  });

  return Response.json({
    attempt: {
        id: at.id,
        startedAt: at.started_at,
        endsAt: at.ends_at,
        submittedAt: at.submitted_at,
        title: test?.title ?? "",
    },
    questions,
    });
    
}
