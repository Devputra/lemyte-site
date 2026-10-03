import { expect, it } from "vitest";
import { selectMistakes, type ReviewAnswer } from "./mistake-review";

const now = Date.parse("2026-10-04T12:00:00Z");
const row = (questionId: string, daysAgo: number, correct = false, answered = true): ReviewAnswer => ({ questionId, seenAt: new Date(now - daysAgo * 86_400_000).toISOString(), correct, answered });
it("prefers questions last seen at least two days ago, without duplicates", () => {
  expect(selectMistakes([row("recent", 1), row("old", 5), row("old", 4), row("due", 2)], now)).toEqual(["old", "due", "recent"]);
});
it("removes later corrections and skipped questions", () => {
  expect(selectMistakes([row("fixed", 5), row("fixed", 1, true), row("skipped", 3, false, false)], now)).toEqual([]);
});
it("uses the latest sighting even when history is unordered", () => {
  expect(selectMistakes([row("a", 0), row("b", 3), row("a", 9)], now)).toEqual(["b", "a"]);
});
