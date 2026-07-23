import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/authz";
import { gradeAttempt } from "@/lib/engine/grading";
import { one } from "@/lib/utils";

function first<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

export async function POST(_: Request, ctx: { params: Promise<{ attemptId: string }> }) {
  const user = await requireUser();
  const { attemptId } = await ctx.params;

  const supabase = await supabaseServer();
  const { data: at, error: atErr } = await supabase
    .from("attempts")
    .select(`
      id, ends_at, submitted_at, assignment_id,
      test_assignments!inner (
        id, employee_id, test_id,
        tests!inner ( pass_percent, show_score_to_employee )
      )
    `)
    .eq("id", attemptId)
    .single();

  if (atErr || !at) return Response.json({ error: atErr?.message ?? "NOT_FOUND" }, { status: 404 });

  const asg = one(at.test_assignments);
  if (!asg) return Response.json({ error: "ASSIGNMENT_NOT_FOUND" }, { status: 404 });

  if (asg.employee_id !== user.id) return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  if (at.submitted_at) return Response.json({ error: "ALREADY_SUBMITTED" }, { status: 400 });

  // Normalize joined test row safely
  const test = first((asg as any).tests);
  if (!test) {
    // This should not happen because of tests!inner, but it *can* if join shape differs.
    return Response.json({ error: "TEST_JOIN_MISSING" }, { status: 500 });
  }

  const passPercent =
    typeof (test as any).pass_percent === "number" ? (test as any).pass_percent : 0;
  const showScore = !!(test as any).show_score_to_employee;

  // Load attempt questions
  const atq = await supabaseAdmin
    .from("attempt_questions")
    .select("question_id")
    .eq("attempt_id", attemptId);

  if (atq.error) return Response.json({ error: atq.error.message }, { status: 400 });

  const qids = (atq.data ?? []).map((r: any) => r.question_id as string);
  if (qids.length === 0) {
    return Response.json({ error: "NO_QUESTIONS_FOR_ATTEMPT" }, { status: 400 });
  }

  // Marks
  const qs = await supabaseAdmin.from("questions").select("id, marks").in("id", qids);
  if (qs.error) return Response.json({ error: qs.error.message }, { status: 400 });

  const marksById: Record<string, number> = {};
  for (const q of (qs.data ?? []) as any[]) marksById[q.id] = Number(q.marks ?? 0);

  // Answers
  const ans = await supabaseAdmin
    .from("attempt_answers")
    .select("question_id, selected_option_ids")
    .eq("attempt_id", attemptId);

  if (ans.error) return Response.json({ error: ans.error.message }, { status: 400 });

  const selectedByQid: Record<string, string[]> = {};
  for (const a of (ans.data ?? []) as any[]) {
    selectedByQid[a.question_id] = (a.selected_option_ids ?? []) as string[];
  }

  // Correct options
  const corr = await supabaseAdmin
    .from("question_correct_options")
    .select("question_id, option_id")
    .in("question_id", qids);

  if (corr.error) return Response.json({ error: corr.error.message }, { status: 400 });

  const correctByQid: Record<string, string[]> = {};
  for (const row of (corr.data ?? []) as any[]) {
    correctByQid[row.question_id] = [...(correctByQid[row.question_id] ?? []), row.option_id];
  }

  const graded = gradeAttempt({
    questionMarksById: marksById,
    correctOptionIdsByQuestionId: correctByQid,
    selectedOptionIdsByQuestionId: selectedByQid,
    passPercent,
  });

  // Persist: submitted_at, assignment status, per-question scores, summary
  const nowIso = new Date().toISOString();

  const upAttempt = await supabaseAdmin.from("attempts").update({ submitted_at: nowIso }).eq("id", attemptId);
  if (upAttempt.error) return Response.json({ error: upAttempt.error.message }, { status: 400 });

  const upAsg = await supabaseAdmin
    .from("test_assignments")
    .update({ status: "SUBMITTED" })
    .eq("id", at.assignment_id);
  if (upAsg.error) return Response.json({ error: upAsg.error.message }, { status: 400 });

  const pqRows = graded.perQuestion.map((p) => ({
    attempt_id: attemptId,
    question_id: p.questionId,
    earned_marks: p.earned,
    max_marks: p.max,
    correct: p.correct,
  }));

  const pqIns = await supabaseAdmin.from("attempt_question_scores").insert(pqRows);
  if (pqIns.error) return Response.json({ error: pqIns.error.message }, { status: 400 });

  const resIns = await supabaseAdmin.from("attempt_results").insert({
    attempt_id: attemptId,
    score: graded.score,
    max_score: graded.maxScore,
    percent: graded.percent,
    passed: graded.passed,
  });
  if (resIns.error) return Response.json({ error: resIns.error.message }, { status: 400 });

  // Only return score if test allows; RLS also enforces this on reads.
  if (!showScore) {
    return Response.json({ submitted: true });
  }

  return Response.json({
    submitted: true,
    score: graded.score,
    maxScore: graded.maxScore,
    percent: graded.percent,
    passed: graded.passed,
  });
}
