// src/lib/gate/__tests__/helpers.test.ts
import { describe, it, expect } from "vitest";
import { isAuthorizedActor } from "../auth";
import { extractCorrectOptionIds, normalizeOptions } from "../options";
import {
  safeNumber,
  round2,
  computeDurationUsedSeconds,
  deriveResultsFromQuestionScores,
} from "../report-helpers";

// ---------------------------------------------------------------------------
// isAuthorizedActor
// ---------------------------------------------------------------------------
describe("isAuthorizedActor", () => {
  it("returns true when authUserId matches ownerUserId", () => {
    expect(
      isAuthorizedActor({
        ownerUserId: "u1",
        ownerGuestToken: null,
        authUserId: "u1",
        demoCookie: null,
      })
    ).toBe(true);
  });

  it("returns false when authUserId does not match ownerUserId", () => {
    expect(
      isAuthorizedActor({
        ownerUserId: "u1",
        ownerGuestToken: null,
        authUserId: "u2",
        demoCookie: null,
      })
    ).toBe(false);
  });

  it("returns true when demoCookie matches ownerGuestToken", () => {
    expect(
      isAuthorizedActor({
        ownerUserId: null,
        ownerGuestToken: "gt-123",
        authUserId: null,
        demoCookie: "gt-123",
      })
    ).toBe(true);
  });

  it("returns false when demoCookie does not match ownerGuestToken", () => {
    expect(
      isAuthorizedActor({
        ownerUserId: null,
        ownerGuestToken: "gt-123",
        authUserId: null,
        demoCookie: "gt-wrong",
      })
    ).toBe(false);
  });

  it("returns false when there is no owner", () => {
    expect(
      isAuthorizedActor({
        ownerUserId: null,
        ownerGuestToken: null,
        authUserId: "u1",
        demoCookie: null,
      })
    ).toBe(false);
  });

  it("prefers ownerUserId over ownerGuestToken", () => {
    expect(
      isAuthorizedActor({
        ownerUserId: "u1",
        ownerGuestToken: "gt-123",
        authUserId: "u1",
        demoCookie: "gt-wrong",
      })
    ).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// extractCorrectOptionIds
// ---------------------------------------------------------------------------
describe("extractCorrectOptionIds", () => {
  it("returns empty array for non-array input", () => {
    expect(extractCorrectOptionIds(null)).toEqual([]);
    expect(extractCorrectOptionIds("not an array")).toEqual([]);
    expect(extractCorrectOptionIds(42)).toEqual([]);
  });

  it("extracts ids with isCorrect flag", () => {
    const options = [
      { id: "a", isCorrect: true },
      { id: "b", isCorrect: false },
      { id: "c" },
    ];
    expect(extractCorrectOptionIds(options)).toEqual(["a"]);
  });

  it("extracts ids with is_correct flag", () => {
    const options = [
      { id: "a", is_correct: true },
      { id: "b", is_correct: false },
    ];
    expect(extractCorrectOptionIds(options)).toEqual(["a"]);
  });

  it("handles multiple correct flags across variants", () => {
    const options = [
      { id: "a", isCorrect: true },
      { id: "b", correct: true },
      { id: "c", isAnswer: true },
      { id: "d", answer: true },
      { id: "e" },
    ];
    expect(extractCorrectOptionIds(options)).toEqual(["a", "b", "c", "d"]);
  });

  it("filters out entries with empty/null id", () => {
    const options = [
      { isCorrect: true }, // no id
      { id: "", isCorrect: true },
      { id: "a", isCorrect: true },
    ];
    expect(extractCorrectOptionIds(options)).toEqual(["a"]);
  });
});

// ---------------------------------------------------------------------------
// normalizeOptions
// ---------------------------------------------------------------------------
describe("normalizeOptions", () => {
  it("returns empty array for non-array input", () => {
    expect(normalizeOptions(null, null)).toEqual([]);
    expect(normalizeOptions(undefined, [])).toEqual([]);
  });

  it("returns options with selection state", () => {
    const options = [
      { id: "a", markdown: "Option A", isCorrect: true },
      { id: "b", markdown: "Option B", isCorrect: false },
    ];
    const result = normalizeOptions(options, ["a"]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      id: "a",
      markdown: "Option A",
      text: "Option A",
      isCorrect: true,
      isSelected: true,
    });
    expect(result[1]).toEqual({
      id: "b",
      markdown: "Option B",
      text: "Option B",
      isCorrect: false,
      isSelected: false,
    });
  });
});

// ---------------------------------------------------------------------------
// safeNumber / round2
// ---------------------------------------------------------------------------
describe("safeNumber", () => {
  it("returns the number for valid input", () => {
    expect(safeNumber(42)).toBe(42);
    expect(safeNumber("3.14")).toBe(3.14);
  });

  it("returns fallback for non-finite values", () => {
    expect(safeNumber(NaN)).toBe(0);
    expect(safeNumber(undefined, 5)).toBe(5);
    // Number(null) === 0 which is finite, so it returns 0 not the fallback
    expect(safeNumber(null)).toBe(0);
    expect(safeNumber("not-a-number", 10)).toBe(10);
  });
});

describe("round2", () => {
  it("rounds to two decimal places", () => {
    expect(round2(3.14159)).toBe(3.14);
    expect(round2(2.005)).toBe(2.01);
    expect(round2(10)).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// computeDurationUsedSeconds
// ---------------------------------------------------------------------------
describe("computeDurationUsedSeconds", () => {
  it("computes normal duration from start to submit", () => {
    const start = "2025-01-01T00:00:00Z";
    const submit = "2025-01-01T01:30:00Z";
    expect(computeDurationUsedSeconds(start, submit, null)).toBe(5400);
  });

  it("falls back to endsAt when submittedAt is null", () => {
    const start = "2025-01-01T00:00:00Z";
    const endsAt = "2025-01-01T03:00:00Z";
    expect(computeDurationUsedSeconds(start, null, endsAt)).toBe(10800);
  });

  it("returns 0 for invalid dates", () => {
    expect(computeDurationUsedSeconds(null, null, null)).toBe(0);
    expect(computeDurationUsedSeconds("invalid", "also-invalid", null)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// deriveResultsFromQuestionScores
// ---------------------------------------------------------------------------
describe("deriveResultsFromQuestionScores", () => {
  it("computes aggregate results from per-question scores", () => {
    const scores = [
      { earned_marks: 2, max_marks: 2 },
      { earned_marks: 0, max_marks: 1 },
      { earned_marks: -0.33, max_marks: 1 },
      { earned_marks: 1, max_marks: 2 },
    ];
    const result = deriveResultsFromQuestionScores(scores, 50);

    expect(result.score).toBe(2.67);
    expect(result.max_score).toBe(6);
    expect(result.percent).toBeCloseTo(44.5, 0);
    expect(result.passed).toBe(false);
    expect(result.source).toBe("derived_from_question_scores");
  });
});
