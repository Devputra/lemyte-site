import { supabaseAdmin } from "@/lib/supabase/admin";
import { selectMistakes, type ReviewAnswer } from "./mistake-review";
import { isAnswered } from "./tracker";

async function allRows<T>(query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}

export async function loadMistakeQuestions(userId: string, count: number) {
  const db = supabaseAdmin.schema("gate");
  const attempts = await allRows((from, to) => db.from("attempts")
    .select("id, submitted_at, ends_at").eq("user_id", userId).in("status", ["SUBMITTED", "EXPIRED"])
    .order("id").range(from, to));
  const history: ReviewAnswer[] = [];
  for (let offset = 0; offset < attempts.length; offset += 50) {
    const chunk = attempts.slice(offset, offset + 50);
    const ids = chunk.map((a) => String(a.id));
    const [scores, answers] = await Promise.all([
      allRows((from, to) => db.from("attempt_question_scores").select("attempt_id, question_version_id, correct")
        .in("attempt_id", ids).order("attempt_id").order("question_version_id").range(from, to)),
      allRows((from, to) => db.from("attempt_answers").select("attempt_id, question_version_id, selected_option_ids, nat_value_raw")
        .in("attempt_id", ids).order("attempt_id").order("question_version_id").range(from, to)),
    ]);
    const answerMap = new Map(answers.map((a) => [`${a.attempt_id}:${a.question_version_id}`, a]));
    const times = new Map(chunk.map((a) => [String(a.id), String(a.submitted_at ?? a.ends_at)]));
    for (const score of scores) {
      const answer = answerMap.get(`${score.attempt_id}:${score.question_version_id}`);
      history.push({ questionId: String(score.question_version_id), seenAt: times.get(String(score.attempt_id))!, answered: Boolean(answer && isAnswered(answer)), correct: Boolean(score.correct) });
    }
  }
  const ids = selectMistakes(history, Date.now());
  const chosen: { id: string; marks: number; section_kind: string }[] = [];
  for (let offset = 0; offset < ids.length && chosen.length < count; offset += 100) {
    const batch = ids.slice(offset, offset + 100);
    const { data, error } = await db.from("question_versions").select("id, marks, section_kind")
      .in("id", batch).eq("source_kind", "PYQ").eq("status", "PUBLISHED");
    if (error) throw error;
    const byId = new Map((data ?? []).map((q) => [String(q.id), q]));
    for (const id of batch) {
      const q = byId.get(id);
      if (q && chosen.length < count) chosen.push({ id, marks: Number(q.marks), section_kind: String(q.section_kind) });
    }
  }
  return chosen;
}
