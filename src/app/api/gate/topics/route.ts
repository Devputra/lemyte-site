// src/app/api/gate/topics/route.ts
//
// Subject + topic catalog for topic-wise practice.
// Includes the count of PUBLISHED PYQ questions per topic so the UI can
// show "12 PYQs available" and disable empty topics.

import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface TopicCount {
  topicId: string;
  count: number;
}

export async function GET() {
  const { data: subjects, error: subErr } = await supabaseAdmin
    .schema("gate")
    .from("subjects")
    .select("id, code, name, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (subErr) {
    console.error("[gate/topics] subjects query failed", subErr);
    return Response.json({ error: "Failed to load subjects" }, { status: 500 });
  }

  const { data: topics, error: topErr } = await supabaseAdmin
    .schema("gate")
    .from("topics")
    .select("id, subject_id, code, name, section_kind, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (topErr) {
    console.error("[gate/topics] topics query failed", topErr);
    return Response.json({ error: "Failed to load topics" }, { status: 500 });
  }

  // Compute PYQ counts per topic using Postgres aggregate view.
  // This avoids Supabase/PostgREST's 1000-row response limit.
  const { data: topicCountRows, error: qvErr } = await supabaseAdmin
    .schema("gate")
    .from("topic_pyq_counts")
    .select("topic_id, pyq_count");

  if (qvErr) {
    console.error("[gate/topics] topic count query failed", qvErr);
    return Response.json(
      { error: "Failed to count questions" },
      { status: 500 }
    );
  }

  const counts = new Map<string, number>();

  for (const row of topicCountRows ?? []) {
    counts.set(String(row.topic_id), Number(row.pyq_count ?? 0));
  }

  const topicCounts: TopicCount[] = Array.from(counts.entries()).map(
    ([topicId, count]) => ({ topicId, count })
  );

  return Response.json({
    subjects: (subjects ?? []).map((s) => ({
      id: s.id as string,
      code: s.code as string,
      name: s.name as string,
    })),

    topics: (topics ?? []).map((t) => ({
      id: t.id as string,
      subjectId: (t.subject_id as string | null) ?? null,
      code: t.code as string,
      name: t.name as string,
      sectionKind: t.section_kind as string,
      pyqCount: counts.get(t.id as string) ?? 0,
    })),

    pyqCounts: topicCounts,
  });
}
