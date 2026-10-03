import { describe, expect, it } from "vitest";

import {
  computeStats,
  computeStreak,
  computeTopics,
  focusTopics,
  istDay,
  levelFor,
  peerSummary,
  type AnswerRow,
  type AttemptRow,
  type QuestionMeta,
  type ScoreRow,
} from "../tracker";

const meta = new Map<string, QuestionMeta>([
  ["q1", { subjectId: "ME", topicId: "SOM", marks: 1 }],
  ["q2", { subjectId: "ME", topicId: "SOM", marks: 2 }],
  ["q3", { subjectId: "ME", topicId: "FM", marks: 2 }],
  ["x1", { subjectId: "CE", topicId: "GEO", marks: 1 }],
]);
const ans = (attempt: string, qv: string, saved = "2026-09-29T05:00:00Z", pick = true): AnswerRow => ({
  attempt_id: attempt,
  question_version_id: qv,
  selected_option_ids: pick ? ["o"] : [],
  nat_value_raw: null,
  saved_at: saved,
});
const attempts: AttemptRow[] = [
  { id: "a1", status: "SUBMITTED", started_at: "2026-09-29T05:00:00Z", submitted_at: "2026-09-29T05:30:00Z", ends_at: "2026-09-29T06:00:00Z" },
  { id: "a2", status: "IN_PROGRESS", started_at: "2026-09-29T07:00:00Z", submitted_at: null, ends_at: "2026-09-29T08:00:00Z" },
];
const answers = [ans("a1", "q1"), ans("a1", "q2"), ans("a1", "q3", undefined, false), ans("a2", "q1"), ans("a1", "x1")];
const scores: ScoreRow[] = [
  { attempt_id: "a1", question_version_id: "q1", correct: true },
  { attempt_id: "a1", question_version_id: "q2", correct: false },
  { attempt_id: "a1", question_version_id: "q3", correct: false }, // skipped: not counted
  { attempt_id: "a1", question_version_id: "x1", correct: true }, // other paper
];

describe("computeStats", () => {
  const s = computeStats(attempts, answers, scores, meta, "ME", 10);
  it("counts distinct answered and solved questions within the paper", () => {
    expect(s.answered).toBe(2);
    expect(s.solved).toBe(1);
    expect(s.coverage).toBe(20);
  });
  it("ignores skipped questions in accuracy", () => {
    expect(s.graded).toBe(2);
    expect(s.accuracy).toBe(50);
  });
  it("counts only finished attempts for tests and time", () => {
    expect(s.tests).toBe(1);
    expect(s.timeSec).toBe(1800);
  });
  it("awards 10 x marks per solved question plus 2 per answer", () => {
    expect(s.points).toBe(10 * 1 + 3 * 2);
  });
});

describe("levels and streaks", () => {
  it("maps points to levels with progress", () => {
    expect(levelFor(0).name).toBe("Started");
    expect(levelFor(400)).toMatchObject({ name: "Regular", progress: 50 });
    expect(levelFor(5000)).toMatchObject({ name: "Dedicated", next: null, progress: 100 });
  });
  it("converts timestamps to Indian calendar days", () => {
    expect(istDay("2026-09-28T19:00:00Z")).toBe("2026-09-29");
  });
  it("keeps the streak alive until the day is over", () => {
    const days = ["2026-09-25", "2026-09-27", "2026-09-28", "2026-09-28"];
    expect(computeStreak(days, "2026-09-29")).toMatchObject({ current: 2, best: 2 });
    expect(computeStreak(days, "2026-09-30").current).toBe(0);
  });
});

describe("topics", () => {
  const pyq = new Map([["SOM", 5], ["FM", 8], ["TOM", 3]]);
  const topics = computeTopics(["SOM", "FM", "TOM"], pyq, answers, scores, meta, "ME");
  it("computes per-topic accuracy and coverage", () => {
    const som = topics.find((t) => t.topicId === "SOM")!;
    expect(som).toMatchObject({ answered: 2, solved: 1, graded: 2, accuracy: 50, coverage: 40, status: "started" });
    expect(topics.find((t) => t.topicId === "TOM")!.status).toBe("new");
  });
  it("suggests weak topics before untouched ones", () => {
    const rows = [
      { ...topics[0], status: "weak" as const, accuracy: 30 },
      { ...topics[1], status: "new" as const },
      { ...topics[2], status: "developing" as const, accuracy: 60 },
    ];
    expect(focusTopics(rows).map((t) => t.topicId)).toEqual(["SOM", "TOM", "FM"]);
  });
  it("summarises peers", () => {
    const p = peerSummary([computeStats(attempts, answers, scores, meta, "ME", 10)]);
    expect(p.count).toBe(1);
    expect(p.best.solved).toBe(1);
    expect(p.levels[0]).toBe(1);
  });
});
