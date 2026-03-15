// src/lib/gate/__tests__/palette.test.ts
import { describe, it, expect } from "vitest";
import { PaletteState } from "../contracts";
import type { DraftAnswer, CommittedAnswer } from "../contracts";
import {
  onVisitQuestion,
  onMarkToggle,
  onClear,
  onSaveAndNext,
  hasAnswer,
} from "../palette";

describe("hasAnswer", () => {
  it("should return false for null/undefined", () => {
    expect(hasAnswer(null)).toBe(false);
    expect(hasAnswer(undefined)).toBe(false);
  });

  it("should return true for MCQ with selected options", () => {
    const draft: DraftAnswer = { type: "MCQ", selectedOptionIds: ["a"], updatedAt: "" };
    expect(hasAnswer(draft)).toBe(true);
  });

  it("should return false for MCQ with empty options", () => {
    const draft: DraftAnswer = { type: "MCQ", selectedOptionIds: [], updatedAt: "" };
    expect(hasAnswer(draft)).toBe(false);
  });

  it("should return true for NAT with raw value", () => {
    const draft: DraftAnswer = { type: "NAT", natRaw: "42", updatedAt: "" };
    expect(hasAnswer(draft)).toBe(true);
  });

  it("should return false for NAT with empty raw", () => {
    const draft: DraftAnswer = { type: "NAT", natRaw: "", updatedAt: "" };
    expect(hasAnswer(draft)).toBe(false);
  });
});

describe("onVisitQuestion", () => {
  it("should transition Not_Visited to Not_Answered", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Not_Visited };
    onVisitQuestion(palette, "q1");
    expect(palette.q1).toBe(PaletteState.Not_Answered);
  });

  it("should transition undefined to Not_Answered", () => {
    const palette: Record<string, PaletteState> = {};
    onVisitQuestion(palette, "q1");
    expect(palette.q1).toBe(PaletteState.Not_Answered);
  });

  it("should not change Answered state", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Answered };
    onVisitQuestion(palette, "q1");
    expect(palette.q1).toBe(PaletteState.Answered);
  });
});

describe("onMarkToggle", () => {
  it("Not_Answered → Marked_For_Review", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Not_Answered };
    onMarkToggle(palette, "q1");
    expect(palette.q1).toBe(PaletteState.Marked_For_Review);
  });

  it("Marked_For_Review → Not_Answered", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Marked_For_Review };
    onMarkToggle(palette, "q1");
    expect(palette.q1).toBe(PaletteState.Not_Answered);
  });

  it("Answered → Answered_And_Marked", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Answered };
    onMarkToggle(palette, "q1");
    expect(palette.q1).toBe(PaletteState.Answered_And_Marked);
  });

  it("Answered_And_Marked → Answered", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Answered_And_Marked };
    onMarkToggle(palette, "q1");
    expect(palette.q1).toBe(PaletteState.Answered);
  });

  it("Not_Visited → Marked_For_Review", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Not_Visited };
    onMarkToggle(palette, "q1");
    expect(palette.q1).toBe(PaletteState.Marked_For_Review);
  });
});

describe("onClear", () => {
  it("should delete drafts and committed, reset to Not_Answered", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Answered_And_Marked };
    const drafts: Record<string, DraftAnswer> = {
      q1: { type: "MCQ", selectedOptionIds: ["a"], updatedAt: "" },
    };
    const committed: Record<string, CommittedAnswer> = {
      q1: { type: "MCQ", selectedOptionIds: ["a"], savedAt: "" },
    };

    onClear(palette, drafts, committed, "q1");

    expect(palette.q1).toBe(PaletteState.Not_Answered);
    expect(drafts.q1).toBeUndefined();
    expect(committed.q1).toBeUndefined();
  });
});

describe("onSaveAndNext", () => {
  it("should commit draft and transition to Answered", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Not_Answered };
    const drafts: Record<string, DraftAnswer> = {
      q1: { type: "MCQ", selectedOptionIds: ["opt-a"], updatedAt: "" },
    };
    const committed: Record<string, CommittedAnswer> = {};

    onSaveAndNext(palette, drafts, committed, "q1");

    expect(palette.q1).toBe(PaletteState.Answered);
    expect(committed.q1).toBeDefined();
    expect(committed.q1.selectedOptionIds).toEqual(["opt-a"]);
  });

  it("should transition to Answered_And_Marked if was Marked_For_Review", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Marked_For_Review };
    const drafts: Record<string, DraftAnswer> = {
      q1: { type: "NAT", natRaw: "42", natNormalized: 42, updatedAt: "" },
    };
    const committed: Record<string, CommittedAnswer> = {};

    onSaveAndNext(palette, drafts, committed, "q1");

    expect(palette.q1).toBe(PaletteState.Answered_And_Marked);
  });

  it("should remain Marked_For_Review if no answer in draft", () => {
    const palette: Record<string, PaletteState> = { q1: PaletteState.Marked_For_Review };
    const drafts: Record<string, DraftAnswer> = {
      q1: { type: "MCQ", selectedOptionIds: [], updatedAt: "" },
    };
    const committed: Record<string, CommittedAnswer> = {};

    onSaveAndNext(palette, drafts, committed, "q1");

    expect(palette.q1).toBe(PaletteState.Marked_For_Review);
  });
});
