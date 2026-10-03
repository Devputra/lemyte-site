import { expect, it } from "vitest";
import { rankedStanding } from "./ranking";
import { rankedLine } from "./catalog";

it("uses competition ranks and gives equal scores the same percentile", () => {
  const scores = [90, 80, 80, 50];
  expect(scores.map(score => rankedStanding(scores.length, scores.filter(s => s > score).length))).toEqual([
    { rank: 1, total: 4, percentile: 100 },
    { rank: 2, total: 4, percentile: 75 },
    { rank: 2, total: 4, percentile: 75 },
    { rank: 4, total: 4, percentile: 25 },
  ]);
});
it("handles a single result, empty populations and invalid counts", () => {
  expect(rankedStanding(1, 0)).toEqual({ rank: 1, total: 1, percentile: 100 });
  expect(rankedStanding(0, 0)).toBeNull();
  expect(rankedStanding(2, 2)).toBeNull();
  expect(rankedStanding(2, -1)).toBeNull();
  expect(rankedStanding(3, 2)?.percentile).toBe(33.33);
});
it("changes catalogue copy when ranked tests exist", () => {
  expect(rankedLine(0)).toContain("none scheduled");
  expect(rankedLine(1)).toBe("Ranked tests with one counted attempt");
});
