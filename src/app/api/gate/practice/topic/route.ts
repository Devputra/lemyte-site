// src/app/api/gate/practice/topic/route.ts
//
// Auth required.
// Body: { topicId: uuid, count?: number (default 10, capped at 30) }
//
// Builds an ad-hoc PRACTICE test_version from PUBLISHED PYQs in the given
// topic, then returns the synthesized testVersionId. The client then calls
// /api/gate/attempts/start with mode=PRACTICE + that id.
//
// Why this design:
//   - attempts.test_version_id is NOT NULL, so topic-wise practice must
//     resolve to a real test_version row.
//   - We mark these rows is_active=false so they never appear in catalogs.
//   - The description is prefixed [adhoc-topic-practice] for the cleanup
//     job a future migration might add.
//   - Duration is derived from a heuristic: 2 minutes per question, capped
//     at 60 minutes. We use the smallest blueprint_profile that fits, or
//     fall back to creating a one-off blueprint when none matches.

import { NextRequest } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkEntitlement } from "@/lib/gate/entitlements";

export const runtime = "nodejs";

const Body = z.object({
  topicId: z.string().uuid(),
  count: z.number().int().min(5).max(30).optional(),
});

const ADHOC_PREFIX = "[adhoc-topic-practice]";

async function pickOrCreateBlueprint(
  durationSeconds: number
): Promise<string | null> {
  // Try to reuse an existing blueprint with matching duration.
  const { data: existing } = await supabaseAdmin
    .schema("gate")
    .from("blueprint_profiles")
    .select("id")
    .eq("duration_seconds", durationSeconds)
    .limit(1)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabaseAdmin
    .schema("gate")
    .from("blueprint_profiles")
    .insert({
      name: `Adhoc topic practice (${durationSeconds}s)`,
      duration_seconds: durationSeconds,
      pass_percent: 35,
    })
    .select("id")
    .single();

  if (error || !created) {
    console.error("[gate/practice/topic] blueprint create failed", error);
    return null;
  }
  return created.id as string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return Response.json({ error: "Authentication required" }, { status: 401 });
    }
    const userId = auth.user.id;

    const ent = await checkEntitlement(userId, "START_ATTEMPT");
    if (!ent.allowed) {
      return Response.json({ error: ent.reason }, { status: 403 });
    }

    const input = Body.parse(await req.json());
    const targetCount = input.count ?? 10;

    // Load topic + subject for the title
    const { data: topic, error: topErr } = await supabaseAdmin
      .schema("gate")
      .from("topics")
      .select("id, name, subject_id, section_kind")
      .eq("id", input.topicId)
      .maybeSingle();

    if (topErr) {
      console.error("[gate/practice/topic] topic lookup failed", topErr);
      return Response.json({ error: "Failed to load topic" }, { status: 500 });
    }
    if (!topic) {
      return Response.json({ error: "Topic not found" }, { status: 404 });
    }

    let subjectName = "";
    if (topic.subject_id) {
      const { data: subj } = await supabaseAdmin
        .schema("gate")
        .from("subjects")
        .select("name")
        .eq("id", topic.subject_id)
        .maybeSingle();
      subjectName = (subj?.name as string | undefined) ?? "";
    }

    // Pull all eligible PYQs in this topic.
    const { data: questions, error: qErr } = await supabaseAdmin
      .schema("gate")
      .from("question_versions")
      .select("id, marks")
      .eq("topic_id", input.topicId)
      .eq("source_kind", "PYQ")
      .eq("status", "PUBLISHED");

    if (qErr) {
      console.error("[gate/practice/topic] question query failed", qErr);
      return Response.json({ error: "Failed to load questions" }, { status: 500 });
    }
    if (!questions || questions.length === 0) {
      return Response.json(
        { error: "No PYQs available for this topic yet" },
        { status: 422 }
      );
    }

    // Random pick. Fisher-Yates, take first N.
    const pool = [...questions];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const chosen = pool.slice(0, Math.min(targetCount, pool.length));

    // Duration heuristic: 2 minutes per question, cap 60 min, floor 10 min.
    const durationSeconds = Math.min(
      60 * 60,
      Math.max(10 * 60, chosen.length * 2 * 60)
    );

    const blueprintId = await pickOrCreateBlueprint(durationSeconds);
    if (!blueprintId) {
      return Response.json(
        { error: "Failed to set up blueprint" },
        { status: 500 }
      );
    }

    const titleSubject = subjectName ? `${subjectName} · ` : "";
    const title = `Topic Practice — ${titleSubject}${topic.name}`;

    // Insert the ad-hoc test_version. is_active=false hides it from catalogs.
    const { data: tv, error: tvErr } = await supabaseAdmin
      .schema("gate")
      .from("test_versions")
      .insert({
        blueprint_profile_id: blueprintId,
        title,
        description: `${ADHOC_PREFIX} user=${userId} topic=${input.topicId}`,
        is_demo: false,
        is_active: true, // must be active for the start route; hidden from
                         // catalogs via description-prefix filter instead
        kind: "PRACTICE",
        access_tier: "PAID",
        subject_id: topic.subject_id ?? null,
      })
      .select("id")
      .single();

    if (tvErr || !tv) {
      console.error("[gate/practice/topic] test_version insert failed", tvErr);
      return Response.json(
        { error: "Failed to create practice session" },
        { status: 500 }
      );
    }

    // Insert test_version_questions in the chosen order.
    const tvqRows = chosen.map((q, idx) => ({
      test_version_id: tv.id as string,
      question_version_id: q.id as string,
      // section uses GA/CORE/FOUNDATION depending on the question's
      // section_kind; we keep it simple here and inherit topic's section.
      section: (topic.section_kind as string) === "GA" ? "GA" : "CORE",
      question_order: idx + 1,
    }));

    const { error: tvqErr } = await supabaseAdmin
      .schema("gate")
      .from("test_version_questions")
      .insert(tvqRows);

    if (tvqErr) {
      console.error("[gate/practice/topic] tvq insert failed", tvqErr);
      // Roll back the test_version row to avoid an empty stub.
      await supabaseAdmin
        .schema("gate")
        .from("test_versions")
        .delete()
        .eq("id", tv.id);

      return Response.json(
        { error: "Failed to populate practice session" },
        { status: 500 }
      );
    }

    return Response.json({
      testVersionId: tv.id,
      title,
      questionCount: chosen.length,
      durationSeconds,
    });
  } catch (err: any) {
    if (err?.issues) {
      return Response.json(
        { error: "Invalid request body", details: err.issues },
        { status: 400 }
      );
    }
    console.error("[gate/practice/topic] error", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
