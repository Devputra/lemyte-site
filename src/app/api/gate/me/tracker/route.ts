// src/app/api/gate/me/tracker/route.ts
//
// GET /api/gate/me/tracker?subject=ME
// Student tracker: headline stats (with peer avg/best), streak calendar, mastery level and
// per-topic health for one GATE paper. Calculations live in src/lib/gate/tracker.ts.

import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";
import {
  computeStats,
  computeStreak,
  computeTopics,
  focusTopics,
  isAnswered,
  istDay,
  levelFor,
  peerSummary,
  type AnswerRow,
  type AttemptRow,
  type QuestionMeta,
  type ScoreRow,
} from "@/lib/gate/tracker";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PEER_ATTEMPT_LIMIT = 3000; // most recent attempts used for peer averages
const CACHE_MS = 10 * 60 * 1000;

type Db = ReturnType<typeof supabaseAdmin.schema>;
const gate = (): Db => supabaseAdmin.schema("gate");

// PostgREST caps responses at 1000 rows: page through.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchAll<T>(make: () => any, page = 1000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += page) {
    const { data, error } = await make().range(from, from + page - 1);
    if (error) throw error;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < page) return out;
  }
}

async function inChunks<T>(ids: string[], size: number, fn: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const out: T[] = [];
  for (let i = 0; i < ids.length; i += size) out.push(...(await fn(ids.slice(i, i + size))));
  return out;
}

async function loadActivity(attemptIds: string[]) {
  const answers = await inChunks(attemptIds, 100, (c) =>
    fetchAll<AnswerRow>(() =>
      gate()
        .from("attempt_answers")
        .select("attempt_id, question_version_id, selected_option_ids, nat_value_raw, saved_at")
        .in("attempt_id", c),
    ),
  );
  const scores = await inChunks(attemptIds, 100, (c) =>
    fetchAll<ScoreRow>(() =>
      gate().from("attempt_question_scores").select("attempt_id, question_version_id, correct").in("attempt_id", c),
    ),
  );
  return { answers, scores };
}

async function loadMeta(qvIds: string[], meta: Map<string, QuestionMeta>) {
  const missing = qvIds.filter((id) => !meta.has(id));
  const rows = await inChunks(missing, 150, (c) =>
    fetchAll<{ id: string; subject_id: string | null; topic_id: string | null; marks: number }>(() =>
      gate().from("question_versions").select("id, subject_id, topic_id, marks").in("id", c),
    ),
  );
  for (const r of rows) meta.set(r.id, { subjectId: r.subject_id, topicId: r.topic_id, marks: Number(r.marks ?? 1) });
}

type PaperInfo = { total: number; byTopic: Map<string, number>; topics: { id: string; code: string; name: string; section: string }[] };
const paperCache = new Map<string, { at: number; value: PaperInfo }>();
const peerCache = new Map<string, { at: number; value: ReturnType<typeof peerSummary> }>();

async function paperInfo(subjectId: string): Promise<PaperInfo> {
  const hit = paperCache.get(subjectId);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const qs = await fetchAll<{ topic_id: string | null }>(() =>
    gate()
      .from("question_versions")
      .select("topic_id")
      .eq("subject_id", subjectId)
      .eq("status", "PUBLISHED")
      .eq("source_kind", "PYQ"),
  );
  const byTopic = new Map<string, number>();
  for (const q of qs) if (q.topic_id) byTopic.set(q.topic_id, (byTopic.get(q.topic_id) ?? 0) + 1);
  const { data: topics, error } = await gate()
    .from("topics")
    .select("id, code, name, section_kind, sort_order, subject_id, is_active")
    .or(`subject_id.eq.${subjectId},subject_id.is.null`);
  if (error) throw error;
  const order: Record<string, number> = { GA: 0, FOUNDATION: 1, CORE: 2 };
  const list = (topics ?? [])
    .filter((t) => t.is_active !== false && (t.subject_id === subjectId || byTopic.has(t.id as string)))
    .sort(
      (a, b) =>
        (order[a.section_kind as string] ?? 9) - (order[b.section_kind as string] ?? 9) ||
        Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0),
    )
    .map((t) => ({ id: t.id as string, code: t.code as string, name: t.name as string, section: t.section_kind as string }));
  const value = { total: qs.length, byTopic, topics: list };
  paperCache.set(subjectId, { at: Date.now(), value });
  return value;
}

async function peers(subjectId: string, total: number, excludeUser: string) {
  const key = `${subjectId}|${excludeUser}`;
  const hit = peerCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const { data: rows, error } = await gate()
    .from("attempts")
    .select("id, user_id, status, started_at, submitted_at, ends_at")
    .not("user_id", "is", null)
    .neq("user_id", excludeUser)
    .order("created_at", { ascending: false })
    .limit(PEER_ATTEMPT_LIMIT);
  if (error) throw error;
  const attempts = (rows ?? []) as (AttemptRow & { user_id: string })[];
  const { answers, scores } = await loadActivity(attempts.map((a) => a.id));
  const meta = new Map<string, QuestionMeta>();
  await loadMeta([...new Set(answers.map((a) => a.question_version_id))], meta);
  const byUser = new Map<string, AttemptRow[]>();
  for (const a of attempts) byUser.set(a.user_id, [...(byUser.get(a.user_id) ?? []), a]);
  const owner = new Map(attempts.map((a) => [a.id, a.user_id]));
  const stats = [...byUser.entries()]
    .map(([u, ats]) =>
      computeStats(
        ats,
        answers.filter((x) => owner.get(x.attempt_id) === u),
        scores.filter((x) => owner.get(x.attempt_id) === u),
        meta,
        subjectId,
        total,
      ),
    )
    .filter((s) => s.answered > 0);
  const value = peerSummary(stats);
  peerCache.set(key, { at: Date.now(), value });
  return value;
}

export async function GET(req: Request) {
  const supabase = await supabaseServer();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) return Response.json({ error: "Authentication required" }, { status: 401 });
  const user = auth.user;

  try {
    const { data: subjectRows, error: subErr } = await gate()
      .from("subjects")
      .select("id, code, name, sort_order, is_active")
      .order("sort_order", { ascending: true });
    if (subErr) throw subErr;
    const subjects = (subjectRows ?? []).filter((s) => s.is_active !== false);

    const myAttempts = await fetchAll<AttemptRow>(() =>
      gate()
        .from("attempts")
        .select("id, status, started_at, submitted_at, ends_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    );
    const { answers, scores } = await loadActivity(myAttempts.map((a) => a.id));
    const meta = new Map<string, QuestionMeta>();
    await loadMeta([...new Set(answers.map((a) => a.question_version_id))], meta);

    // Paper: ?subject=CODE, else the paper saved on the profile page, else the one answered most, else the first.
    const saved = (user.user_metadata as Record<string, unknown> | undefined)?.gate_subject;
    const wanted = (new URL(req.url).searchParams.get("subject") ?? (typeof saved === "string" ? saved : undefined))?.toUpperCase();
    const perSubject = new Map<string, number>();
    for (const a of answers) {
      const s = meta.get(a.question_version_id)?.subjectId;
      if (s) perSubject.set(s, (perSubject.get(s) ?? 0) + 1);
    }
    const busiest = [...perSubject.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
    const subject =
      subjects.find((s) => s.code === wanted) ?? subjects.find((s) => s.id === busiest) ?? subjects[0];
    if (!subject) return Response.json({ error: "No GATE papers configured" }, { status: 500 });
    const subjectId = subject.id as string;

    const paper = await paperInfo(subjectId);
    const stats = computeStats(myAttempts, answers, scores, meta, subjectId, paper.total);
    const today = istDay(new Date().toISOString());
    const activityDays = answers.filter(isAnswered).map((a) => istDay(a.saved_at)); // any paper counts for the streak
    const streak = computeStreak(activityDays, today);
    const todayCount = activityDays.filter((d) => d === today).length;
    const topicStats = computeTopics(
      paper.topics.map((t) => t.id),
      paper.byTopic,
      answers,
      scores,
      meta,
      subjectId,
    );
    const byId = new Map(paper.topics.map((t) => [t.id, t]));
    const topics = topicStats.map((t) => ({ ...t, ...byId.get(t.topicId)! }));
    const focus = focusTopics(topicStats).map((t) => ({ ...t, ...byId.get(t.topicId)! }));
    const peer = await peers(subjectId, paper.total, user.id);

    const meta0 = (user.user_metadata ?? {}) as Record<string, unknown>;
    const name =
      (typeof meta0.full_name === "string" && meta0.full_name) ||
      (typeof meta0.name === "string" && meta0.name) ||
      (user.email ?? "").split("@")[0];

    return Response.json({
      user: { name, email: user.email ?? null },
      subjects: subjects.map((s) => ({ code: s.code, name: s.name })),
      subject: { code: subject.code, name: subject.name, topics: paper.topics.length, pyqs: paper.total },
      stats,
      peers: peer,
      streak: { current: streak.current, best: streak.best, activeDays: streak.activeDays, today, todayCount },
      level: levelFor(stats.points),
      topics,
      focus,
    });
  } catch (err) {
    console.error("[gate/me/tracker] failed", err);
    return Response.json({ error: "Failed to load tracker" }, { status: 500 });
  }
}
