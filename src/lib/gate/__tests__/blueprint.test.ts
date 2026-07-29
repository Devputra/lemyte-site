// src/lib/gate/__tests__/blueprint.test.ts
import { describe, it, expect } from "vitest";
import { generateBlueprint, type InventoryQuestion } from "../blueprint";
import type { BlueprintProfile } from "../contracts";

const CS_IT_PROFILE: BlueprintProfile = {
  id: "test-profile",
  name: "CS_IT_V1",
  paperCode: "CS",
  totalQuestions: 65,
  totalMarks: 100,
  gaQuestions: 10,
  gaMarks: 15,
  ga1MarkCount: 5,
  ga2MarkCount: 5,
  coreQuestions: 55,
  coreMarks: 85,
  core1MarkCount: 25,
  core2MarkCount: 30,
  coreMcqMin: 35,
  coreMcqMax: 45,
  coreMsqMin: 5,
  coreMsqMax: 15,
  coreNatMin: 10,
  coreNatMax: 20,
  difficultyEasyPct: 30,
  difficultyMediumPct: 50,
  difficultyHardPct: 20,
  durationSeconds: 10800,
  passPercent: 25,
};

function makeQuestion(
  id: number,
  section: "GA" | "CORE",
  type: "MCQ" | "MSQ" | "NAT",
  marks: 1 | 2,
  difficulty: "EASY" | "MEDIUM" | "HARD"
): InventoryQuestion {
  return {
    questionVersionId: `qv-${id}`,
    questionId: `q-${id}`,
    type,
    marks,
    difficulty,
    section,
    activeUsageCount: 0,
  };
}

function buildSufficientInventory(): InventoryQuestion[] {
  const questions: InventoryQuestion[] = [];
  let id = 0;

  // GA: 10 MCQ (5×1-mark + 5×2-mark), plus extras
  for (let i = 0; i < 8; i++) questions.push(makeQuestion(id++, "GA", "MCQ", 1, "EASY"));
  for (let i = 0; i < 8; i++) questions.push(makeQuestion(id++, "GA", "MCQ", 2, "MEDIUM"));

  // Core MCQ: need ~40, provide 50
  for (let i = 0; i < 25; i++) questions.push(makeQuestion(id++, "CORE", "MCQ", 1, "EASY"));
  for (let i = 0; i < 25; i++) questions.push(makeQuestion(id++, "CORE", "MCQ", 2, "MEDIUM"));

  // Core MSQ: need ~10, provide 20
  for (let i = 0; i < 10; i++) questions.push(makeQuestion(id++, "CORE", "MSQ", 1, "MEDIUM"));
  for (let i = 0; i < 10; i++) questions.push(makeQuestion(id++, "CORE", "MSQ", 2, "HARD"));

  // Core NAT: need ~15, provide 25
  for (let i = 0; i < 13; i++) questions.push(makeQuestion(id++, "CORE", "NAT", 1, "HARD"));
  for (let i = 0; i < 12; i++) questions.push(makeQuestion(id++, "CORE", "NAT", 2, "MEDIUM"));

  return questions;
}

describe("generateBlueprint", () => {
  it("should succeed with sufficient inventory", () => {
    const inventory = buildSufficientInventory();
    const result = generateBlueprint(CS_IT_PROFILE, inventory);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.result.gaQuestions).toHaveLength(10);
      expect(result.result.chosenCoreMcqCount).toBeGreaterThanOrEqual(CS_IT_PROFILE.coreMcqMin);
      expect(result.result.chosenCoreMcqCount).toBeLessThanOrEqual(CS_IT_PROFILE.coreMcqMax);
      expect(result.result.chosenCoreMsqCount).toBeGreaterThanOrEqual(CS_IT_PROFILE.coreMsqMin);
      expect(result.result.chosenCoreMsqCount).toBeLessThanOrEqual(CS_IT_PROFILE.coreMsqMax);
      expect(result.result.chosenCoreNatCount).toBeGreaterThanOrEqual(CS_IT_PROFILE.coreNatMin);
      expect(result.result.chosenCoreNatCount).toBeLessThanOrEqual(CS_IT_PROFILE.coreNatMax);
    }
  });

  it("should fail loudly with insufficient GA MCQ 1-mark", () => {
    const inventory = buildSufficientInventory().filter(
      (q) => !(q.section === "GA" && q.marks === 1)
    );
    const result = generateBlueprint(CS_IT_PROFILE, inventory);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failingConstraints.some((c) => c.includes("GA MCQ 1-mark"))).toBe(true);
    }
  });

  it("should fail loudly with insufficient Core NAT", () => {
    const inventory = buildSufficientInventory().filter(
      (q) => !(q.section === "CORE" && q.type === "NAT")
    );
    const result = generateBlueprint(CS_IT_PROFILE, inventory);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failingConstraints.some((c) => c.includes("Core NAT"))).toBe(true);
    }
  });

  it("should fail loudly with empty inventory", () => {
    const result = generateBlueprint(CS_IT_PROFILE, []);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.failingConstraints.length).toBeGreaterThan(0);
    }
  });

  it("should produce a paper of exactly 65 questions totalling 100 marks", () => {
    const inventory = buildSufficientInventory();
    const result = generateBlueprint(CS_IT_PROFILE, inventory);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const { gaQuestions, coreQuestions } = result.result;
    expect(gaQuestions).toHaveLength(10);
    expect(coreQuestions).toHaveLength(55);

    const total = [...gaQuestions, ...coreQuestions].reduce((s, q) => s + q.marks, 0);
    expect(total).toBe(100);

    expect(coreQuestions.filter((q) => q.marks === 1)).toHaveLength(25);
    expect(coreQuestions.filter((q) => q.marks === 2)).toHaveLength(30);
  });

  it("should exclude questions with activeUsageCount >= 2", () => {
    const inventory = buildSufficientInventory().map((q) => ({
      ...q,
      activeUsageCount: 2, // All at max usage
    }));
    const result = generateBlueprint(CS_IT_PROFILE, inventory);

    expect(result.success).toBe(false);
  });
});
