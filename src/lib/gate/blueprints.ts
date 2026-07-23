// src/lib/gate/blueprints.ts
import type { BlueprintProfile } from "./contracts";

/**
 * GATE CS/IT paper structure.
 * Fixed by the exam format (65 questions, 100 marks) - not user-configurable,
 * therefore held in code rather than as DB columns.
 * Merge with DB values at the call site:
 *   { ...GATE_CS_BLUEPRINT, id, durationSeconds, passPercent }
 */
export const GATE_CS_BLUEPRINT: Omit<
  BlueprintProfile,
  "id" | "durationSeconds" | "passPercent"
> = {
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
};
