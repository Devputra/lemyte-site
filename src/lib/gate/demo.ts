// src/lib/gate/demo.ts

import crypto from "crypto";
import { unstable_cache } from "next/cache";

import { supabaseAdmin } from "@/lib/supabase/admin";

const DEMO_RATE_LIMIT_REASON =
  "Demo rate limit exceeded. You can try again in 24 hours.";

export function generateGuestToken(): string {
  return `guest_${crypto.randomBytes(16).toString("hex")}`;
}

export async function enforceDemoRateLimit(
  ip: string | null,
  cookieToken: string | null
): Promise<{ allowed: boolean; reason?: string }> {
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 3600 * 1000
  ).toISOString();

  // 1) Check by IP via attempt_metadata -> attempts
  if (ip) {
    const { data: byIp, error: byIpErr } = await supabaseAdmin
      .schema("gate")
      .from("attempt_metadata")
      .select("attempt_id, created_at")
      .eq("client_ip", ip)
      .gte("created_at", twentyFourHoursAgo)
      .limit(5);

    if (byIpErr) {
      console.error("[gate/demo] enforceDemoRateLimit by IP failed", byIpErr);
    }

    if (byIp && byIp.length > 0) {
      const attemptIds = byIp.map((row) => row.attempt_id).filter(Boolean);

      if (attemptIds.length > 0) {
        const { data: attempts, error: attemptsErr } = await supabaseAdmin
          .schema("gate")
          .from("attempts")
          .select("id, status, created_at")
          .in("id", attemptIds)
          .eq("mode", "DEMO")
          .in("status", ["IN_PROGRESS", "SUBMITTED", "EXPIRED"])
          .gte("created_at", twentyFourHoursAgo)
          .limit(1);

        if (attemptsErr) {
          console.error(
            "[gate/demo] enforceDemoRateLimit attempt lookup by IP failed",
            attemptsErr
          );
        }

        if (attempts && attempts.length > 0) {
          return {
            allowed: false,
            reason: DEMO_RATE_LIMIT_REASON,
          };
        }
      }
    }
  }

  // 2) Check by guest cookie token
  if (cookieToken) {
    const { data: byCookie, error: byCookieErr } = await supabaseAdmin
      .schema("gate")
      .from("attempts")
      .select("id, status")
      .eq("guest_token", cookieToken)
      .eq("mode", "DEMO")
      .in("status", ["IN_PROGRESS", "SUBMITTED", "EXPIRED"])
      .gte("created_at", twentyFourHoursAgo)
      .limit(1);

    if (byCookieErr) {
      console.error("[gate/demo] enforceDemoRateLimit by cookie failed", byCookieErr);
    }

    if (byCookie && byCookie.length > 0) {
      return {
        allowed: false,
        reason: DEMO_RATE_LIMIT_REASON,
      };
    }
  }

  return { allowed: true };
}


// ---------- random demo paper ----------
//
// Every demo start gets its own 10 General Aptitude questions (5 one-mark, 5 two-mark, like GATE's GA section),
// drawn from all published GA questions. attempts.test_version_id must point at a real test_version, so each
// draw is stored as an ad-hoc demo test_version (description prefixed [adhoc-demo]); the hand-made demo
// test stays as the template for title, timer and kind. Demo starts are rate-limited per IP and guest token.

export const ADHOC_DEMO_PREFIX = "[adhoc-demo]";
/** PostgREST filter that matches the template demo test but not the per-attempt copies. */
export const DEMO_TEMPLATE_FILTER = `description.is.null,description.not.ilike."${ADHOC_DEMO_PREFIX}*"`;

type PoolItem = { id: string; marks: number };

/** Published GA questions, minus marks-to-all ones and duplicates (papers in one session share their GA section). */
async function loadGaPool(): Promise<PoolItem[]> {
  const rows: { id: string; marks: number; markdown_content: string }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabaseAdmin
      .schema("gate")
      .from("question_versions")
      .select("id, marks, markdown_content")
      .eq("status", "PUBLISHED")
      .eq("section_kind", "GA")
      .not("pyq_paper_code", "is", null)
      .or("grading_policy.is.null,grading_policy.neq.MARKS_TO_ALL")
      .order("id")
      .range(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  const seen = new Set<string>();
  const pool: PoolItem[] = [];
  for (const r of rows) {
    const key = r.markdown_content.replace(/\[gate-source[^\n]*/g, "").replace(/gate-media:\/\/\S+/g, "").replace(/\W+/g, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    pool.push({ id: r.id, marks: Number(r.marks) });
  }
  return pool;
}

const getGaPool = unstable_cache(loadGaPool, ["gate-ga-demo-pool"], { revalidate: 86400 });

function pick<T>(xs: T[], n: number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** Create a demo test_version with 10 random GA questions; returns its id. */
export async function createRandomDemoTest(template: {
  blueprint_profile_id: string;
  title: string;
  kind: string;
  access_tier: string;
  subject_id: string | null;
}): Promise<string> {
  const pool = await getGaPool();
  const chosen = [...pick(pool.filter((q) => q.marks === 1), 5), ...pick(pool.filter((q) => q.marks === 2), 5)];
  if (chosen.length < 10) throw new Error(`Not enough GA questions for a demo (${chosen.length})`);

  const db = supabaseAdmin.schema("gate");
  const { data: tv, error } = await db
    .from("test_versions")
    .insert({
      blueprint_profile_id: template.blueprint_profile_id,
      title: template.title,
      description: `${ADHOC_DEMO_PREFIX} ${new Date().toISOString()}`,
      is_demo: true,
      is_active: true, // the start route requires an active test
      kind: template.kind,
      access_tier: template.access_tier,
      subject_id: template.subject_id,
    })
    .select("id")
    .single();
  if (error || !tv) throw error ?? new Error("Failed to create demo test");

  const { error: qErr } = await db.from("test_version_questions").insert(
    chosen.map((q, i) => ({ test_version_id: tv.id, question_version_id: q.id, section: "GA", question_order: i + 1 })),
  );
  if (qErr) {
    await db.from("test_versions").delete().eq("id", tv.id);
    throw qErr;
  }
  return tv.id as string;
}
