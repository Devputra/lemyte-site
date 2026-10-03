import { expect, it } from "vitest";
import { attemptedAccuracy, weakestTopics } from "./report-topics";

it("ranks attempted topic accuracy and excludes unanswered and fully correct topics", () => {
  const q = (topicId: string, answered: boolean, correct: boolean) => ({ topicId, answered, correct });
  expect(weakestTopics([q("a", true, true), q("a", true, false), q("b", true, false), q("c", false, false), q("d", true, true)], new Map([["b", "Networks"]])).map((t) => [t.id, t.name])).toEqual([["b", "Networks"], ["a", "Topic"]]);
});
it("does not invent weak topics for an empty attempt", () => {
  expect(weakestTopics([], new Map())).toEqual([]);
});

it("accuracy excludes skipped questions awarded marks-to-all", () => {
  expect(attemptedAccuracy([{ answered: false, correct: true }, { answered: true, correct: true }, { answered: true, correct: false }])).toBe(50);
  expect(attemptedAccuracy([{ answered: false, correct: true }])).toBe(0);
});
