// src/app/api/gate/tests/route.ts
//
// Public catalog of test_versions, optionally filtered by kind.
// Query params:
//   kind=PRACTICE | RANKED   (required)
//
// Returns minimal data the catalog pages need. Excludes ad-hoc topic-practice
// test_versions (which are inserted with is_active=false for that reason).

import { NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const kindParam = url.searchParams.get("kind");

  if (kindParam !== "RANKED" && kindParam !== "PRACTICE") {
    return Response.json(
      { error: "kind must be RANKED or PRACTICE" },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .schema("gate")
    .from("test_versions")
    .select(
      "id, title, description, kind, access_tier, available_from, available_until, max_attempts_per_user, subject_id, blueprint_profile_id"
    )
    .eq("kind", kindParam)
    .eq("is_active", true)
    .eq("is_demo", false)
    .not("description", "ilike", "[adhoc-topic-practice]%")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[gate/tests] catalog query failed", error);
    return Response.json({ error: "Failed to load tests" }, { status: 500 });
  }

  // Pull blueprint durations in one batch so we can show "180 min" on cards.
  const blueprintIds = Array.from(
    new Set((data ?? []).map((t) => t.blueprint_profile_id).filter(Boolean))
  );

  const durationByBp = new Map<string, number>();
  if (blueprintIds.length > 0) {
    const { data: bps } = await supabaseAdmin
      .schema("gate")
      .from("blueprint_profiles")
      .select("id, duration_seconds")
      .in("id", blueprintIds);

    for (const bp of bps ?? []) {
      durationByBp.set(bp.id as string, bp.duration_seconds as number);
    }
  }

  // Same for subjects (optional).
  const subjectIds = Array.from(
    new Set((data ?? []).map((t) => t.subject_id).filter(Boolean))
  );
  const subjectByid = new Map<string, { code: string; name: string }>();
  if (subjectIds.length > 0) {
    const { data: subs } = await supabaseAdmin
      .schema("gate")
      .from("subjects")
      .select("id, code, name")
      .in("id", subjectIds);
    for (const s of subs ?? []) {
      subjectByid.set(s.id as string, {
        code: s.code as string,
        name: s.name as string,
      });
    }
  }

  return Response.json({
    tests: (data ?? []).map((t) => ({
      id: t.id as string,
      title: t.title as string,
      description: (t.description as string | null) ?? null,
      kind: t.kind as string,
      accessTier: t.access_tier as string,
      availableFrom: (t.available_from as string | null) ?? null,
      availableUntil: (t.available_until as string | null) ?? null,
      maxAttemptsPerUser: (t.max_attempts_per_user as number | null) ?? null,
      durationSeconds: durationByBp.get(t.blueprint_profile_id as string) ?? null,
      subject: t.subject_id ? subjectByid.get(t.subject_id as string) ?? null : null,
    })),
  });
}
