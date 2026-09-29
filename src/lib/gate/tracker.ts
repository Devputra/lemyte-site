// src/lib/gate/tracker.ts
//
// Pure calculations behind the student tracker (/gate/dashboard): headline stats, streaks,
// mastery points/levels and per-topic health. No I/O here, so it is unit-tested and reused for
// the signed-in student and for peer averages.

export type AttemptRow = {
  id: string;
  status: string; // IN_PROGRESS | SUBMITTED | EXPIRED | ...
  started_at: string;
  submitted_at: string | null;
  ends_at: string;
};
export type AnswerRow = {
  attempt_id: string;
  question_version_id: string;
  selected_option_ids: string[] | null;
  nat_value_raw: string | null;
  saved_at: string;
};
export type ScoreRow = { attempt_id: string; question_version_id: string; correct: boolean };
export type QuestionMeta = { subjectId: string | null; topicId: string | null; marks: number };

export const LEVELS = [
  { name: "Starter", min: 0 },
  { name: "Learner", min: 200 },
  { name: "Achiever", min: 600 },
  { name: "Expert", min: 1500 },
  { name: "Topper", min: 3000 },
] as const;

export type Stats = {
  answered: number; // distinct questions answered
  solved: number; // distinct questions answered correctly at least once
  graded: number; // graded answer instances
  correct: number; // correct graded answer instances
  coverage: number; // 0..100
  accuracy: number; // 0..100
  tests: number; // submitted / expired attempts
  timeSec: number;
  points: number;
};

export type TopicStat = {
  topicId: string;
  pyqCount: number;
  answered: number;
  solved: number;
  graded: number;
  correct: number;
  accuracy: number | null; // null until something is graded
  coverage: number; // 0..100
  status: "new" | "started" | "weak" | "developing" | "strong";
};

const MIN_GRADED_FOR_STATUS = 3;

export function isAnswered(a: Pick<AnswerRow, "selected_option_ids" | "nat_value_raw">): boolean {
  return (a.selected_option_ids?.length ?? 0) > 0 || !!a.nat_value_raw?.trim();
}

/** Calendar day in India (YYYY-MM-DD) for an ISO timestamp. */
export function istDay(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 330 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/**
 * Headline stats for one student within one GATE paper.
 * `meta` must contain every question_version_id referenced by answers/scores (others are ignored).
 */
export function computeStats(
  attempts: AttemptRow[],
  answers: AnswerRow[],
  scores: ScoreRow[],
  meta: Map<string, QuestionMeta>,
  subjectId: string,
  totalPyq: number,
): Stats {
  const inSubject = (qv: string) => meta.get(qv)?.subjectId === subjectId;
  const answeredKeys = new Set<string>();
  const answeredQs = new Set<string>();
  let answerInstances = 0;
  const touchedAttempts = new Set<string>();
  for (const a of answers) {
    if (!isAnswered(a) || !inSubject(a.question_version_id)) continue;
    answeredKeys.add(`${a.attempt_id}|${a.question_version_id}`);
    answeredQs.add(a.question_version_id);
    touchedAttempts.add(a.attempt_id);
    answerInstances += 1;
  }
  const solvedQs = new Set<string>();
  let graded = 0;
  let correct = 0;
  for (const s of scores) {
    if (!answeredKeys.has(`${s.attempt_id}|${s.question_version_id}`)) continue; // skipped questions
    graded += 1;
    if (s.correct) {
      correct += 1;
      solvedQs.add(s.question_version_id);
    }
  }
  let tests = 0;
  let timeSec = 0;
  for (const at of attempts) {
    if (!touchedAttempts.has(at.id) || (at.status !== "SUBMITTED" && at.status !== "EXPIRED")) continue;
    tests += 1;
    const end = Math.min(new Date(at.submitted_at ?? at.ends_at).getTime(), new Date(at.ends_at).getTime());
    timeSec += Math.max(0, Math.round((end - new Date(at.started_at).getTime()) / 1000));
  }
  let points = answerInstances * 2;
  for (const qv of solvedQs) points += 10 * (meta.get(qv)?.marks ?? 1);
  return {
    answered: answeredQs.size,
    solved: solvedQs.size,
    graded,
    correct,
    coverage: totalPyq > 0 ? round1((answeredQs.size / totalPyq) * 100) : 0,
    accuracy: graded > 0 ? round1((correct / graded) * 100) : 0,
    tests,
    timeSec,
    points,
  };
}

export function levelFor(points: number) {
  let index = 0;
  LEVELS.forEach((l, i) => {
    if (points >= l.min) index = i;
  });
  const next = LEVELS[index + 1] ?? null;
  return {
    index,
    name: LEVELS[index].name,
    min: LEVELS[index].min,
    next: next ? { name: next.name, min: next.min } : null,
    progress: next ? round1(((points - LEVELS[index].min) / (next.min - LEVELS[index].min)) * 100) : 100,
  };
}

/** Streak info from activity days (YYYY-MM-DD, any order, duplicates allowed). */
export function computeStreak(days: string[], today: string) {
  const set = new Set(days);
  const sorted = [...set].sort();
  const prev = (d: string) => {
    const t = new Date(`${d}T00:00:00Z`);
    t.setUTCDate(t.getUTCDate() - 1);
    return t.toISOString().slice(0, 10);
  };
  // current streak: ends today, or yesterday if nothing yet today
  let cursor = set.has(today) ? today : prev(today);
  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor = prev(cursor);
  }
  let best = 0;
  let run = 0;
  let last: string | null = null;
  for (const d of sorted) {
    run = last !== null && prev(d) === last ? run + 1 : 1;
    best = Math.max(best, run);
    last = d;
  }
  return { current, best, activeDays: sorted };
}

/** Per-topic health for one student within one paper. */
export function computeTopics(
  topicIds: string[],
  pyqByTopic: Map<string, number>,
  answers: AnswerRow[],
  scores: ScoreRow[],
  meta: Map<string, QuestionMeta>,
  subjectId: string,
): TopicStat[] {
  const rows = new Map<string, { answered: Set<string>; solved: Set<string>; graded: number; correct: number }>();
  for (const t of topicIds) rows.set(t, { answered: new Set(), solved: new Set(), graded: 0, correct: 0 });
  const answeredKeys = new Set<string>();
  for (const a of answers) {
    const m = meta.get(a.question_version_id);
    if (!isAnswered(a) || m?.subjectId !== subjectId || !m.topicId || !rows.has(m.topicId)) continue;
    answeredKeys.add(`${a.attempt_id}|${a.question_version_id}`);
    rows.get(m.topicId)!.answered.add(a.question_version_id);
  }
  for (const s of scores) {
    const m = meta.get(s.question_version_id);
    if (!m?.topicId || !answeredKeys.has(`${s.attempt_id}|${s.question_version_id}`)) continue;
    const r = rows.get(m.topicId);
    if (!r) continue;
    r.graded += 1;
    if (s.correct) {
      r.correct += 1;
      r.solved.add(s.question_version_id);
    }
  }
  return topicIds.map((topicId) => {
    const r = rows.get(topicId)!;
    const pyqCount = pyqByTopic.get(topicId) ?? 0;
    const accuracy = r.graded > 0 ? round1((r.correct / r.graded) * 100) : null;
    let status: TopicStat["status"] = "new";
    if (r.answered.size > 0) status = "started";
    if (accuracy !== null && r.graded >= MIN_GRADED_FOR_STATUS) {
      status = accuracy < 50 ? "weak" : accuracy < 75 ? "developing" : "strong";
    }
    return {
      topicId,
      pyqCount,
      answered: r.answered.size,
      solved: r.solved.size,
      graded: r.graded,
      correct: r.correct,
      accuracy,
      coverage: pyqCount > 0 ? round1((r.answered.size / pyqCount) * 100) : 0,
      status,
    };
  });
}

/** What to practise next: weakest studied topics first, then untouched topics with the most PYQs. */
export function focusTopics(topics: TopicStat[], limit = 5): TopicStat[] {
  const studied = topics
    .filter((t) => t.status === "weak" || t.status === "developing")
    .sort((a, b) => (a.accuracy ?? 0) - (b.accuracy ?? 0));
  const fresh = topics
    .filter((t) => (t.status === "new" || t.status === "started") && t.pyqCount > 0)
    .sort((a, b) => b.pyqCount - a.pyqCount);
  return [...studied, ...fresh].slice(0, limit);
}

/** Average and best of each headline stat across peers (students with any activity in the paper). */
export function peerSummary(peers: Stats[]) {
  const keys = ["coverage", "accuracy", "solved", "tests", "timeSec", "points"] as const;
  const avg = {} as Record<(typeof keys)[number], number>;
  const best = {} as Record<(typeof keys)[number], number>;
  for (const k of keys) {
    const vals = peers.map((p) => p[k]);
    avg[k] = vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    best[k] = vals.length ? Math.max(...vals) : 0;
  }
  const levels = LEVELS.map(() => 0);
  for (const p of peers) levels[levelFor(p.points).index] += 1;
  return { count: peers.length, avg, best, levels };
}
