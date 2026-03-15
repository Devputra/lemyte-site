// src/app/api/gate/attempts/[attemptId]/report/route.ts
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkEntitlement } from "@/lib/gate/entitlements";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ attemptId: string }> }
) {
  const { attemptId } = await ctx.params;
  const supabase = supabaseServer();
  const { data: authData, error: authErr } = await supabase.auth.getUser();
  if (authErr || !authData?.user) {
    return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  // Check entitlement (report access requires active subscription)
  const entitlement = await checkEntitlement(authData.user.id, "VIEW_REPORT");
  if (!entitlement.allowed) {
    return Response.json({ error: entitlement.reason }, { status: 403 });
  }

  // Load attempt
  const { data: attempt, error: atErr } = await supabaseAdmin
    .from("gate.attempts" as any)
    .select("id, user_id, status, test_version_id, mode, started_at, submitted_at")
    .eq("id", attemptId)
    .single();

  if (atErr || !attempt) {
    return Response.json({ error: "Attempt not found" }, { status: 404 });
  }

  if (attempt.user_id !== authData.user.id) {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  if (attempt.status !== "SUBMITTED") {
    return Response.json({ error: "Attempt not yet submitted" }, { status: 400 });
  }

  // Load results
  const { data: results } = await supabaseAdmin
    .from("gate.attempt_results" as any)
    .select("score, max_score, percent, passed, adjusted_score, errata_applied_at, percentile")
    .eq("attempt_id", attemptId)
    .single();

  // Load per-question scores
  const { data: questionScores } = await supabaseAdmin
    .from("gate.attempt_question_scores" as any)
    .select("question_version_id, earned_marks, max_marks, correct")
    .eq("attempt_id", attemptId);

  // Load answers
  const { data: answers } = await supabaseAdmin
    .from("gate.attempt_answers" as any)
    .select("question_version_id, selected_option_ids, nat_value_raw, nat_value_normalized")
    .eq("attempt_id", attemptId);

  // Load attempt metadata for question order
  const { data: metadata } = await supabaseAdmin
    .from("gate.attempt_metadata" as any)
    .select("shuffle_seed, question_order_hash")
    .eq("attempt_id", attemptId)
    .single();

  return Response.json({
    attempt: {
      id: attempt.id,
      mode: attempt.mode,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
    },
    results: results ?? null,
    questionScores: questionScores ?? [],
    answers: answers ?? [],
    metadata: metadata ?? null,
  });
}
