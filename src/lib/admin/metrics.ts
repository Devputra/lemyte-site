// src/lib/admin/metrics.ts — business numbers for /admin/metrics, computed from Supabase.
// Everything is read with the service role; the page itself is restricted to ADMIN_EMAILS.
import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";

const DAY = 86_400_000;
const gate = () => supabaseAdmin.schema("gate");

/** PostgREST returns at most 1000 rows per request; page through with range(). */
async function all<T>(
  query: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < 1000) return out;
  }
}

async function allUsers() {
  const users: {
    id: string;
    email?: string;
    created_at: string;
    last_sign_in_at?: string | null;
  }[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) return users;
  }
}

type Attempt = {
  id: string;
  user_id: string | null;
  mode: string;
  status: string;
  created_at: string;
  test_version_id: string;
};
type Order = {
  user_id: string;
  amount_inr: number;
  status: string;
  created_at: string;
};
type Score = { question_version_id: string; correct: boolean };

export type DayRow = {
  day: string;
  signups: number;
  attempts: number;
  revenue: number;
};

export async function getMetrics(days = 30) {
  const since = new Date(Date.now() - days * DAY).toISOString();
  const inWindow = (iso: string) => iso >= since;

  const [users, attempts, orders, passes, tests, scores] = await Promise.all([
    allUsers(),
    all<Attempt>((a, b) =>
      gate()
        .from("attempts")
        .select("id, user_id, mode, status, created_at, test_version_id")
        .order("created_at")
        .range(a, b),
    ),
    all<Order>((a, b) =>
      gate()
        .from("payment_orders")
        .select("user_id, amount_inr, status, created_at")
        .range(a, b),
    ),
    gate()
      .from("access_passes")
      .select("user_id")
      .eq("status", "ACTIVE")
      .gt("ends_at", new Date().toISOString()),
    gate().from("test_versions").select("id, title, subjects(code)"),
    all<Score>((a, b) =>
      gate()
        .from("attempt_question_scores")
        .select("question_version_id, correct")
        .range(a, b),
    ),
  ]);

  const captured = orders.filter((o) => o.status === "CAPTURED");
  const payers = new Set(captured.map((o) => o.user_id));
  const signups = users.filter((u) => inWindow(u.created_at));
  const recent = attempts.filter((a) => inWindow(a.created_at));

  // Attempts by mode: started vs submitted (completion shows where students drop off).
  const byMode = ["DEMO", "PRACTICE", "RANKED"].map((mode) => {
    const rows = recent.filter((a) => a.mode === mode);
    const submitted = rows.filter((a) => a.status === "SUBMITTED").length;
    return {
      mode,
      started: rows.length,
      submitted,
      completion: rows.length ? Math.round((100 * submitted) / rows.length) : 0,
    };
  });

  // Daily series for the window.
  const series = new Map<string, DayRow>();
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(Date.now() - i * DAY).toISOString().slice(0, 10);
    series.set(day, { day, signups: 0, attempts: 0, revenue: 0 });
  }
  for (const u of signups) series.get(u.created_at.slice(0, 10))!.signups++;
  for (const a of recent) series.get(a.created_at.slice(0, 10))!.attempts++;
  for (const o of captured.filter((o) => inWindow(o.created_at))) {
    const row = series.get(o.created_at.slice(0, 10));
    if (row) row.revenue += o.amount_inr;
  }

  // Which subjects students actually take.
  type TestRow = {
    id: string;
    title: string;
    subjects: { code: string } | null;
  };
  const testById = new Map(
    ((tests.data ?? []) as unknown as TestRow[]).map((t) => [t.id, t]),
  );
  const subjectCounts = new Map<string, number>();
  for (const a of recent) {
    const code =
      testById.get(a.test_version_id)?.subjects?.code ?? "GA / other";
    subjectCounts.set(code, (subjectCounts.get(code) ?? 0) + 1);
  }

  // Question health: questions most students get wrong often have a wrong key or a broken figure.
  const perQuestion = new Map<string, { n: number; correct: number }>();
  for (const s of scores) {
    const q = perQuestion.get(s.question_version_id) ?? { n: 0, correct: 0 };
    q.n++;
    if (s.correct) q.correct++;
    perQuestion.set(s.question_version_id, q);
  }
  const suspicious = [...perQuestion.entries()]
    .filter(([, q]) => q.n >= 5 && q.correct / q.n <= 0.1)
    .map(([id, q]) => ({
      id,
      attempts: q.n,
      correctPct: Math.round((100 * q.correct) / q.n),
    }))
    .sort((a, b) => a.correctPct - b.correctPct || b.attempts - a.attempts)
    .slice(0, 20);

  return {
    days,
    students: {
      total: users.length,
      newInWindow: signups.length,
      activeInWindow: new Set(recent.map((a) => a.user_id).filter(Boolean))
        .size,
    },
    revenue: {
      totalInr: captured.reduce((n, o) => n + o.amount_inr, 0),
      windowInr: captured
        .filter((o) => inWindow(o.created_at))
        .reduce((n, o) => n + o.amount_inr, 0),
      orders: captured.length,
      failed: orders.filter((o) => o.status === "FAILED").length,
      payers: payers.size,
      activePasses: new Set((passes.data ?? []).map((p) => p.user_id)).size,
      conversionPct: users.length
        ? Math.round((1000 * payers.size) / users.length) / 10
        : 0,
    },
    byMode,
    guestDemos: recent.filter((a) => a.mode === "DEMO" && !a.user_id).length,
    series: [...series.values()],
    subjects: [...subjectCounts.entries()].sort((a, b) => b[1] - a[1]),
    suspicious,
    questionsAttempted: perQuestion.size,
  };
}
