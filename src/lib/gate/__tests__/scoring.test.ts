// src/lib/gate/__tests__/scoring.test.ts
import { describe, it, expect } from "vitest";
import { gradeQuestion, gradeAttempt } from "../scoring";
import type { QuestionMeta, CommittedAnswer } from "../contracts";

describe("gradeQuestion", () => {
  describe("MCQ scoring", () => {
    const mcq1Mark: QuestionMeta = {
      questionVersionId: "q1",
      questionId: "q1-base",
      type: "MCQ",
      marks: 1,
      correctOptionIds: ["opt-a"],
    };

    const mcq2Mark: QuestionMeta = {
      questionVersionId: "q2",
      questionId: "q2-base",
      type: "MCQ",
      marks: 2,
      correctOptionIds: ["opt-x"],
    };

    it("should award +1 for correct 1-mark MCQ", () => {
      const answer: CommittedAnswer = {
        type: "MCQ",
        selectedOptionIds: ["opt-a"],
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(mcq1Mark, answer);
      expect(result.earned).toBe(1);
      expect(result.correct).toBe(true);
    });

    it("should award +2 for correct 2-mark MCQ", () => {
      const answer: CommittedAnswer = {
        type: "MCQ",
        selectedOptionIds: ["opt-x"],
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(mcq2Mark, answer);
      expect(result.earned).toBe(2);
      expect(result.correct).toBe(true);
    });

    it("should penalize -1/3 for wrong 1-mark MCQ (exact fraction)", () => {
      const answer: CommittedAnswer = {
        type: "MCQ",
        selectedOptionIds: ["opt-wrong"],
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(mcq1Mark, answer);
      // -1/3 ≈ -0.3333...
      expect(result.earned).toBeCloseTo(-1 / 3, 10);
      expect(result.correct).toBe(false);
    });

    it("should penalize -2/3 for wrong 2-mark MCQ (exact fraction)", () => {
      const answer: CommittedAnswer = {
        type: "MCQ",
        selectedOptionIds: ["opt-wrong"],
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(mcq2Mark, answer);
      // -2/3 ≈ -0.6666...
      expect(result.earned).toBeCloseTo(-2 / 3, 10);
      expect(result.correct).toBe(false);
    });

    it("should return 0 for unanswered MCQ", () => {
      const result = gradeQuestion(mcq1Mark, null);
      expect(result.earned).toBe(0);
      expect(result.correct).toBe(false);
    });

    it("should return 0 for empty selection MCQ", () => {
      const answer: CommittedAnswer = {
        type: "MCQ",
        selectedOptionIds: [],
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(mcq1Mark, answer);
      expect(result.earned).toBe(0);
    });
  });

  describe("MSQ scoring", () => {
    const msq: QuestionMeta = {
      questionVersionId: "q3",
      questionId: "q3-base",
      type: "MSQ",
      marks: 2,
      correctOptionIds: ["opt-a", "opt-b", "opt-c"],
    };

    it("should award full marks for exactly correct selection", () => {
      const answer: CommittedAnswer = {
        type: "MSQ",
        selectedOptionIds: ["opt-b", "opt-a", "opt-c"], // order doesn't matter
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(msq, answer);
      expect(result.earned).toBe(2);
      expect(result.correct).toBe(true);
    });

    it("should return 0 for partial correct (missing one)", () => {
      const answer: CommittedAnswer = {
        type: "MSQ",
        selectedOptionIds: ["opt-a", "opt-b"],
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(msq, answer);
      expect(result.earned).toBe(0);
      expect(result.correct).toBe(false);
    });

    it("should return 0 for extra incorrect option selected", () => {
      const answer: CommittedAnswer = {
        type: "MSQ",
        selectedOptionIds: ["opt-a", "opt-b", "opt-c", "opt-d"],
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(msq, answer);
      expect(result.earned).toBe(0);
      expect(result.correct).toBe(false);
    });

    it("should return 0 for unanswered MSQ (no negative)", () => {
      const result = gradeQuestion(msq, null);
      expect(result.earned).toBe(0);
    });

    it("should return 0 for completely wrong MSQ (no negative)", () => {
      const answer: CommittedAnswer = {
        type: "MSQ",
        selectedOptionIds: ["opt-x", "opt-y"],
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(msq, answer);
      expect(result.earned).toBe(0); // NOT negative
    });
  });

  describe("NAT scoring", () => {
    const nat: QuestionMeta = {
      questionVersionId: "q4",
      questionId: "q4-base",
      type: "NAT",
      marks: 2,
      natLowerBound: 2.5,
      natUpperBound: 2.7,
      natPrecision: 2,
    };

    it("should award marks for value within bounds", () => {
      const answer: CommittedAnswer = {
        type: "NAT",
        natRaw: "2.6",
        natNormalized: 2.6,
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(nat, answer);
      expect(result.earned).toBe(2);
      expect(result.correct).toBe(true);
    });

    it("should award marks for value at lower bound (inclusive)", () => {
      const answer: CommittedAnswer = {
        type: "NAT",
        natRaw: "2.5",
        natNormalized: 2.5,
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(nat, answer);
      expect(result.earned).toBe(2);
      expect(result.correct).toBe(true);
    });

    it("should award marks for value at upper bound (inclusive)", () => {
      const answer: CommittedAnswer = {
        type: "NAT",
        natRaw: "2.7",
        natNormalized: 2.7,
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(nat, answer);
      expect(result.earned).toBe(2);
      expect(result.correct).toBe(true);
    });

    it("should return 0 for value outside bounds (no negative)", () => {
      const answer: CommittedAnswer = {
        type: "NAT",
        natRaw: "3.0",
        natNormalized: 3.0,
        savedAt: new Date().toISOString(),
      };
      const result = gradeQuestion(nat, answer);
      expect(result.earned).toBe(0); // NOT negative
      expect(result.correct).toBe(false);
    });

    it("should return 0 for unanswered NAT (no negative)", () => {
      const result = gradeQuestion(nat, null);
      expect(result.earned).toBe(0);
    });
  });
});

describe("gradeAttempt", () => {
  it("should sum scores correctly with fractional negatives", () => {
    const questions: QuestionMeta[] = [
      { questionVersionId: "q1", questionId: "q1b", type: "MCQ", marks: 1, correctOptionIds: ["a"] },
      { questionVersionId: "q2", questionId: "q2b", type: "MCQ", marks: 2, correctOptionIds: ["b"] },
      { questionVersionId: "q3", questionId: "q3b", type: "MSQ", marks: 2, correctOptionIds: ["c", "d"] },
      { questionVersionId: "q4", questionId: "q4b", type: "NAT", marks: 1, natLowerBound: 5, natUpperBound: 5, natPrecision: 0 },
    ];

    const answers: Record<string, CommittedAnswer | null> = {
      q1: { type: "MCQ", selectedOptionIds: ["a"], savedAt: "" }, // +1
      q2: { type: "MCQ", selectedOptionIds: ["wrong"], savedAt: "" }, // -2/3
      q3: { type: "MSQ", selectedOptionIds: ["c", "d"], savedAt: "" }, // +2
      q4: { type: "NAT", natRaw: "5", natNormalized: 5, savedAt: "" }, // +1
    };

    const result = gradeAttempt(questions, answers, 25);

    // Expected: 1 + (-2/3) + 2 + 1 = 3.333...
    expect(result.score).toBeCloseTo(1 - 2 / 3 + 2 + 1, 10);
    expect(result.maxScore).toBe(6);
    expect(result.perQuestion).toHaveLength(4);
    expect(result.perQuestion[0].correct).toBe(true);
    expect(result.perQuestion[1].correct).toBe(false);
    expect(result.perQuestion[1].earned).toBeCloseTo(-2 / 3, 10);
  });
});
