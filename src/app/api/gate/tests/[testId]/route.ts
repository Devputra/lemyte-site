// GET /api/gate/tests/:testId — public summary of one test for the instructions page.
// testId "demo" resolves to the active demo test.
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ testId: string }> }) {
  const { testId } = await ctx.params;
  const gate = supabaseAdmin.schema("gate");
  let q = gate.from("test_versions").select("id, title, kind, is_demo, is_active, blueprint_profile_id, subject_id");
  q = testId === "demo" ? q.eq("is_demo", true).eq("is_active", true) : q.eq("id", testId);
  const { data: tv, error } = await q.limit(1).maybeSingle();
  if (error || !tv || !tv.is_active) return Response.json({ error: "Test not found" }, { status: 404 });

  const [{ data: bp }, { data: rows }, subj] = await Promise.all([
    gate.from("blueprint_profiles").select("duration_seconds").eq("id", tv.blueprint_profile_id).maybeSingle(),
    gate.from("test_version_questions").select("section, question_version_id").eq("test_version_id", tv.id),
    tv.subject_id ? gate.from("subjects").select("name").eq("id", tv.subject_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const ids = (rows ?? []).map((r) => r.question_version_id as string);
  const { data: qs } = ids.length
    ? await gate.from("question_versions").select("id, marks, type").in("id", ids)
    : { data: [] as { id: string; marks: number; type: string }[] };
  const marks = new Map((qs ?? []).map((x) => [x.id as string, Number(x.marks)]));
  const types = { MCQ: 0, MSQ: 0, NAT: 0 } as Record<string, number>;
  for (const x of qs ?? []) types[x.type as string] = (types[x.type as string] ?? 0) + 1;

  const sections: Record<string, { one: number; two: number }> = {};
  for (const r of rows ?? []) {
    const s = (sections[r.section as string] ??= { one: 0, two: 0 });
    if (marks.get(r.question_version_id as string) === 2) s.two += 1;
    else s.one += 1;
  }
  const totalMarks = [...marks.values()].reduce((a, b) => a + b, 0);
  return Response.json({
    id: tv.id,
    title: tv.title,
    kind: tv.kind,
    isDemo: tv.is_demo,
    subject: (subj.data as { name?: string } | null)?.name ?? null,
    durationSeconds: Number(bp?.duration_seconds ?? 0),
    questions: ids.length,
    totalMarks,
    types,
    sections: Object.entries(sections).map(([name, v]) => ({ name, ...v })),
  });
}
