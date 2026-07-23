// src/app/api/gate/me/dashboard/route.ts

import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECENT_LIMIT = 20;
const PERF_LIMIT_ATTEMPTS = 50;

export async function GET() {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();

  if (authErr || !auth?.user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const userId = auth.user.id;
  const nowIso = new Date().toISOString();

  const accessQ = supabaseAdmin
    .schema("gate")
    .from("access_passes")
    .select("id, plan_id, status, starts_at, ends_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const attemptsQ = supabaseAdmin
    .schema("gate")
    .from("attempts")
    .select("id, test_version_id, mode, status, started_at, submitted_at, ends_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(RECENT_LIMIT);

  const [accessRes, attemptsRes] = await Promise.all([accessQ, attemptsQ]);

  if (accessRes.error) {
    console.error("[gate/me/dashboard] access_passes failed", accessRes.error);
    return Response.json({ error: "Failed to load dashboard" }, { status: 500 });
  }

  if (attemptsRes.error) {
    console.error("[gate/me/dashboard] attempts failed", attemptsRes.error);
    return Response.json({ error: "Failed to load dashboard" }, { status: 500 });
  }

  const passes = accessRes.data ?? [];
  const attempts = attemptsRes.data ?? [];

  const activePass =
    passes.find(
      (p: any) =>
        p.status === "ACTIVE" &&
        (!p.starts_at || new Date(p.starts_at) <= new Date(nowIso)) &&
        (!p.ends_at || new Date(p.ends_at) > new Date(nowIso))
    ) ?? null;

  let activePlan: {
    id: string;
    code: string;
    name: string;
    durationMonths: number;
  } | null = null;

  if (activePass?.plan_id) {
    const { data: plan } = await supabaseAdmin
      .schema("gate")
      .from("plans")
      .select("id, code, name, duration_months")
      .eq("id", activePass.plan_id)
      .maybeSingle();

    if (plan) {
      activePlan = {
        id: plan.id as string,
        code: plan.code as string,
        name: plan.name as string,
        durationMonths: plan.duration_months as number,
      };
    }
  }

  const inProgress = attempts.find((a: any) => a.status === "IN_PROGRESS") ?? null;

  const tvIds = Array.from(new Set(attempts.map((a: any) => a.test_version_id)));
  const tvTitles = new Map<string, { title: string; kind: string }>();

  if (tvIds.length > 0) {
    const { data: tvs } = await supabaseAdmin
      .schema("gate")
      .from("test_versions")
      .select("id, title, kind")
      .in("id", tvIds);

    for (const tv of tvs ?? []) {
      tvTitles.set(tv.id as string, {
        title: tv.title as string,
        kind: tv.kind as string,
      });
    }
  }

  const submittedIds = attempts
    .filter((a: any) => a.status === "SUBMITTED" || a.status === "EXPIRED")
    .map((a: any) => a.id as string);

  const resultsById = new Map<
    string,
    {
      score: number;
      maxScore: number;
      percent: number;
      passed: boolean;
      rank: number | null;
      percentile: number | null;
    }
  >();

  if (submittedIds.length > 0) {
    const { data: results } = await supabaseAdmin
      .schema("gate")
      .from("attempt_results")
      .select("attempt_id, score, max_score, percent, passed, rank, percentile")
      .in("attempt_id", submittedIds);

    for (const r of results ?? []) {
      resultsById.set(r.attempt_id as string, {
        score: Number(r.score ?? 0),
        maxScore: Number(r.max_score ?? 0),
        percent: Number(r.percent ?? 0),
        passed: !!r.passed,
        rank: (r.rank as number | null) ?? null,
        percentile: r.percentile === null ? null : Number(r.percentile),
      });
    }
  }

  const recentSubmitted = attempts
    .filter((a: any) => a.status === "SUBMITTED")
    .slice(0, PERF_LIMIT_ATTEMPTS)
    .map((a: any) => a.id as string);

  const perfBySubject: Record<
    string,
    { subjectName: string; earned: number; max: number; correct: number; total: number }
  > = {};

  if (recentSubmitted.length > 0) {
    const { data: scores, error: scoresErr } = await supabaseAdmin
      .schema("gate")
      .from("attempt_question_scores")
      .select("attempt_id, question_version_id, earned_marks, max_marks, correct")
      .in("attempt_id", recentSubmitted);

    if (scoresErr) {
      console.warn("[gate/me/dashboard] scores join failed", scoresErr);
    } else if (scores && scores.length > 0) {
      const qvIds = Array.from(
        new Set(scores.map((s: any) => s.question_version_id as string))
      );

      const { data: qvs } = await supabaseAdmin
        .schema("gate")
        .from("question_versions")
        .select("id, subject_id")
        .in("id", qvIds);

      const subjectByQv = new Map<string, string>();
      for (const qv of qvs ?? []) {
        if (qv.subject_id) {
          subjectByQv.set(qv.id as string, qv.subject_id as string);
        }
      }

      const subjectIds = Array.from(new Set(subjectByQv.values()));
      const subjectNameById = new Map<string, string>();

      if (subjectIds.length > 0) {
        const { data: subs2 } = await supabaseAdmin
          .schema("gate")
          .from("subjects")
          .select("id, name")
          .in("id", subjectIds);

        for (const s of subs2 ?? []) {
          subjectNameById.set(s.id as string, s.name as string);
        }
      }

      for (const s of scores) {
        const subjId = subjectByQv.get(s.question_version_id as string);
        if (!subjId) continue;

        const bucket = (perfBySubject[subjId] ??= {
          subjectName: subjectNameById.get(subjId) ?? "Unknown",
          earned: 0,
          max: 0,
          correct: 0,
          total: 0,
        });

        bucket.earned += Number(s.earned_marks ?? 0);
        bucket.max += Number(s.max_marks ?? 0);
        bucket.total += 1;
        if (s.correct) bucket.correct += 1;
      }
    }
  }

  return Response.json({
    user: { id: userId, email: auth.user.email ?? null },
    accessPass: activePass
      ? {
          id: activePass.id,
          status: activePass.status,
          startsAt: activePass.starts_at,
          endsAt: activePass.ends_at,
          plan: activePlan,
        }
      : null,
    inProgressAttemptId: inProgress?.id ?? null,
    recentAttempts: attempts.map((a: any) => {
      const tv = tvTitles.get(a.test_version_id as string);
      const r = resultsById.get(a.id as string);

      return {
        id: a.id,
        mode: a.mode,
        status: a.status,
        startedAt: a.started_at,
        submittedAt: a.submitted_at,
        endsAt: a.ends_at,
        testTitle: tv?.title ?? "—",
        testKind: tv?.kind ?? null,
        result: r ?? null,
      };
    }),
    perSubject: Object.entries(perfBySubject).map(([subjectId, b]) => ({
      subjectId,
      subjectName: b.subjectName,
      earned: Math.round(b.earned * 100) / 100,
      max: Math.round(b.max * 100) / 100,
      percent: b.max > 0 ? Math.round((b.earned / b.max) * 1000) / 10 : 0,
      correct: b.correct,
      total: b.total,
    })),
  });
}
