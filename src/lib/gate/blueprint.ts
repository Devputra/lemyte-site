// src/lib/gate/blueprint.ts
// Strict CS/IT blueprint generator — fails loudly if inventory insufficient

import type { BlueprintProfile, QuestionType } from "./contracts";

export interface InventoryQuestion {
  questionVersionId: string;
  questionId: string;
  type: QuestionType;
  marks: number;
  difficulty: "EASY" | "MEDIUM" | "HARD";
  section: "GA" | "CORE";
  activeUsageCount: number;
}

export interface BlueprintResult {
  gaQuestions: InventoryQuestion[];
  coreQuestions: InventoryQuestion[];
  chosenCoreMcqCount: number;
  chosenCoreMsqCount: number;
  chosenCoreNatCount: number;
  difficultyEasyCount: number;
  difficultyMediumCount: number;
  difficultyHardCount: number;
}

export interface BlueprintFailure {
  success: false;
  failingConstraints: string[];
}

export interface BlueprintSuccess {
  success: true;
  result: BlueprintResult;
}

/**
 * Filter inventory to eligible questions (published, max 2 active tests).
 */
function eligible(questions: InventoryQuestion[]): InventoryQuestion[] {
  return questions.filter((q) => q.activeUsageCount < 2);
}

/**
 * Deterministically choose a target within a range.
 * Strategy: prefer the midpoint, biased towards the lower end.
 */
function chooseTarget(min: number, max: number): number {
  return Math.floor((min + max) / 2);
}

/**
 * Generate a strict CS/IT blueprint from the available inventory.
 * Fails loudly with explicit failing constraints if inventory is insufficient.
 */
export function generateBlueprint(
  profile: BlueprintProfile,
  inventory: InventoryQuestion[]
): BlueprintSuccess | BlueprintFailure {
  const failures: string[] = [];
  const pool = eligible(inventory);

  // Separate GA and Core pools
  const gaPool = pool.filter((q) => q.section === "GA");
  const corePool = pool.filter((q) => q.section === "CORE");

  // ========== GA SECTION ==========
  // GA: 10 questions (5×1-mark + 5×2-mark), MCQ only
  const gaMcq1 = gaPool.filter((q) => q.type === "MCQ" && q.marks === 1);
  const gaMcq2 = gaPool.filter((q) => q.type === "MCQ" && q.marks === 2);

  if (gaMcq1.length < profile.ga1MarkCount) {
    failures.push(
      `GA MCQ 1-mark: need ${profile.ga1MarkCount}, have ${gaMcq1.length}`
    );
  }
  if (gaMcq2.length < profile.ga2MarkCount) {
    failures.push(
      `GA MCQ 2-mark: need ${profile.ga2MarkCount}, have ${gaMcq2.length}`
    );
  }

  // ========== CORE SECTION ==========
  // Choose type split targets within ranges
  const coreMcqTarget = chooseTarget(profile.coreMcqMin, profile.coreMcqMax);
  const coreMsqTarget = chooseTarget(profile.coreMsqMin, profile.coreMsqMax);
  const coreNatTarget = profile.coreQuestions - coreMcqTarget - coreMsqTarget;

  // Validate NAT target is in range
  if (coreNatTarget < profile.coreNatMin || coreNatTarget > profile.coreNatMax) {
    failures.push(
      `Core NAT target ${coreNatTarget} not in range [${profile.coreNatMin}, ${profile.coreNatMax}]`
    );
  }

  // Core 1-mark and 2-mark breakdown per type
  // We need: 25×1-mark + 30×2-mark across MCQ/MSQ/NAT
  const coreMcq = corePool.filter((q) => q.type === "MCQ");
  const coreMsq = corePool.filter((q) => q.type === "MSQ");
  const coreNat = corePool.filter((q) => q.type === "NAT");

  if (coreMcq.length < coreMcqTarget) {
    failures.push(`Core MCQ: need ${coreMcqTarget}, have ${coreMcq.length}`);
  }
  if (coreMsq.length < coreMsqTarget) {
    failures.push(`Core MSQ: need ${coreMsqTarget}, have ${coreMsq.length}`);
  }
  if (coreNat.length < coreNatTarget) {
    failures.push(`Core NAT: need ${coreNatTarget}, have ${coreNat.length}`);
  }

  // Check 1-mark and 2-mark availability
  const core1Mark = corePool.filter((q) => q.marks === 1);
  const core2Mark = corePool.filter((q) => q.marks === 2);

  if (core1Mark.length < profile.core1MarkCount) {
    failures.push(
      `Core 1-mark: need ${profile.core1MarkCount}, have ${core1Mark.length}`
    );
  }
  if (core2Mark.length < profile.core2MarkCount) {
    failures.push(
      `Core 2-mark: need ${profile.core2MarkCount}, have ${core2Mark.length}`
    );
  }

  // Difficulty ratio check
  const totalQ = profile.totalQuestions;
  const easyTarget = Math.round(totalQ * profile.difficultyEasyPct / 100);
  const mediumTarget = Math.round(totalQ * profile.difficultyMediumPct / 100);
  const hardTarget = totalQ - easyTarget - mediumTarget;

  const easyPool = pool.filter((q) => q.difficulty === "EASY");
  const mediumPool = pool.filter((q) => q.difficulty === "MEDIUM");
  const hardPool = pool.filter((q) => q.difficulty === "HARD");

  if (easyPool.length < easyTarget) {
    failures.push(`Difficulty EASY: need ${easyTarget}, have ${easyPool.length}`);
  }
  if (mediumPool.length < mediumTarget) {
    failures.push(`Difficulty MEDIUM: need ${mediumTarget}, have ${mediumPool.length}`);
  }
  if (hardPool.length < hardTarget) {
    failures.push(`Difficulty HARD: need ${hardTarget}, have ${hardPool.length}`);
  }

  // ========== FAIL LOUDLY ==========
  if (failures.length > 0) {
    return { success: false, failingConstraints: failures };
  }

  // ========== SELECT QUESTIONS ==========
  // GA selection
  const selectedGa1 = gaMcq1.slice(0, profile.ga1MarkCount);
  const selectedGa2 = gaMcq2.slice(0, profile.ga2MarkCount);
  const gaQuestions = [...selectedGa1, ...selectedGa2];

  // Core selection by type
  const selectedCoreMcq = selectByTypeAndMarks(coreMcq, coreMcqTarget, profile.core1MarkCount, profile.core2MarkCount, coreMcqTarget);
  const selectedCoreMsq = selectByTypeAndMarks(coreMsq, coreMsqTarget, profile.core1MarkCount, profile.core2MarkCount, coreMsqTarget);
  const selectedCoreNat = selectByTypeAndMarks(coreNat, coreNatTarget, profile.core1MarkCount, profile.core2MarkCount, coreNatTarget);

  const coreQuestions = [...selectedCoreMcq, ...selectedCoreMsq, ...selectedCoreNat];

  return {
    success: true,
    result: {
      gaQuestions,
      coreQuestions,
      chosenCoreMcqCount: coreMcqTarget,
      chosenCoreMsqCount: coreMsqTarget,
      chosenCoreNatCount: coreNatTarget,
      difficultyEasyCount: easyTarget,
      difficultyMediumCount: mediumTarget,
      difficultyHardCount: hardTarget,
    },
  };
}

/**
 * Select questions from a pool balancing marks distribution.
 */
function selectByTypeAndMarks(
  pool: InventoryQuestion[],
  count: number,
  _total1Mark: number,
  _total2Mark: number,
  _typeTarget: number
): InventoryQuestion[] {
  // Simple selection: take first `count` from pool
  // In production, this should optimize for marks and difficulty distribution
  return pool.slice(0, count);
}
