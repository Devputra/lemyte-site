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
 * Allocate targets across ranges so they sum exactly to `total`.
 * Starts at each minimum, then distributes the remainder proportionally
 * to available headroom. Returns null if `total` is unreachable.
 */
function allocateTargets(
  total: number,
  ranges: { min: number; max: number }[]
): number[] | null {
  const minSum = ranges.reduce((s, r) => s + r.min, 0);
  const maxSum = ranges.reduce((s, r) => s + r.max, 0);
  if (total < minSum || total > maxSum) return null;

  const targets = ranges.map((r) => r.min);
  const headroom = ranges.map((r) => r.max - r.min);
  const totalHeadroom = headroom.reduce((a, b) => a + b, 0);

  let remaining = total - minSum;
  const initial = remaining;

  if (totalHeadroom > 0) {
    for (let i = 0; i < targets.length; i++) {
      const share = Math.min(
        headroom[i],
        Math.floor((initial * headroom[i]) / totalHeadroom)
      );
      targets[i] += share;
      remaining -= share;
    }
  }
  for (let i = 0; i < targets.length && remaining > 0; i++) {
    const capacity = ranges[i].max - targets[i];
    const add = Math.min(capacity, remaining);
    targets[i] += add;
    remaining -= add;
  }
  return targets;
}

/**
 * Split each type's target into 1-mark and 2-mark counts so that totals
 * across all types hit exactly need1 and need2, and no cell exceeds what
 * the pool actually holds. Returns an error string if no valid split exists.
 */
function allocateMarksSplit(
  typeTargets: number[],
  pools: InventoryQuestion[][],
  need1: number,
  need2: number
): { ones: number[]; twos: number[] } | { error: string } {
  const n = typeTargets.length;
  const labels = ["MCQ", "MSQ", "NAT"];

  if (typeTargets.reduce((a, b) => a + b, 0) !== need1 + need2) {
    return {
      error: `Core targets sum to ${typeTargets.reduce((a, b) => a + b, 0)} but marks split needs ${need1 + need2}`,
    };
  }

  const avail1 = pools.map((p) => p.filter((q) => q.marks === 1).length);
  const avail2 = pools.map((p) => p.filter((q) => q.marks === 2).length);

  const ranges: { min: number; max: number }[] = [];
  for (let i = 0; i < n; i++) {
    const min = Math.max(0, typeTargets[i] - avail2[i]);
    const max = Math.min(typeTargets[i], avail1[i]);
    if (min > max) {
      return {
        error:
          `Core ${labels[i]} (target ${typeTargets[i]}): needs at least ${min} 1-mark ` +
          `but only ${avail1[i]} available (2-mark pool: ${avail2[i]})`,
      };
    }
    ranges.push({ min, max });
  }

  const ones = allocateTargets(need1, ranges);
  if (!ones) {
    return {
      error: `Cannot allocate ${need1} 1-mark questions across core types within available inventory`,
    };
  }

  const twos = typeTargets.map((t, i) => t - ones[i]);
  for (let i = 0; i < n; i++) {
    if (twos[i] < 0 || twos[i] > avail2[i]) {
      return {
        error: `Core ${labels[i]}: needs ${twos[i]} 2-mark but only ${avail2[i]} available`,
      };
    }
  }
  return { ones, twos };
}

function selectByMarks(
  pool: InventoryQuestion[],
  count1: number,
  count2: number
): InventoryQuestion[] {
  return [
    ...pool.filter((q) => q.marks === 1).slice(0, count1),
    ...pool.filter((q) => q.marks === 2).slice(0, count2),
  ];
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
  // Core pools by type
  const coreMcq = corePool.filter((q) => q.type === "MCQ");
  const coreMsq = corePool.filter((q) => q.type === "MSQ");
  const coreNat = corePool.filter((q) => q.type === "NAT");

  // Choose type split targets within ranges, summing exactly to coreQuestions
  const typeTargets = allocateTargets(profile.coreQuestions, [
    { min: profile.coreMcqMin, max: profile.coreMcqMax },
    { min: profile.coreMsqMin, max: profile.coreMsqMax },
    { min: profile.coreNatMin, max: profile.coreNatMax },
  ]);

  if (!typeTargets) {
    failures.push(
      `Core type ranges cannot sum to ${profile.coreQuestions} ` +
        `(MCQ ${profile.coreMcqMin}-${profile.coreMcqMax}, ` +
        `MSQ ${profile.coreMsqMin}-${profile.coreMsqMax}, ` +
        `NAT ${profile.coreNatMin}-${profile.coreNatMax})`
    );
    return { success: false, failingConstraints: failures };
  }

  const [coreMcqTarget, coreMsqTarget, coreNatTarget] = typeTargets;

  if (coreMcq.length < coreMcqTarget) {
    failures.push(`Core MCQ: need ${coreMcqTarget}, have ${coreMcq.length}`);
  }
  if (coreMsq.length < coreMsqTarget) {
    failures.push(`Core MSQ: need ${coreMsqTarget}, have ${coreMsq.length}`);
  }
  if (coreNat.length < coreNatTarget) {
    failures.push(`Core NAT: need ${coreNatTarget}, have ${coreNat.length}`);
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

  // Core selection: split each type's target across 1-mark/2-mark to hit exact totals
  const marksSplit = allocateMarksSplit(
    [coreMcqTarget, coreMsqTarget, coreNatTarget],
    [coreMcq, coreMsq, coreNat],
    profile.core1MarkCount,
    profile.core2MarkCount
  );

  if ("error" in marksSplit) {
    return { success: false, failingConstraints: [marksSplit.error] };
  }

  const selectedCoreMcq = selectByMarks(coreMcq, marksSplit.ones[0], marksSplit.twos[0]);
  const selectedCoreMsq = selectByMarks(coreMsq, marksSplit.ones[1], marksSplit.twos[1]);
  const selectedCoreNat = selectByMarks(coreNat, marksSplit.ones[2], marksSplit.twos[2]);

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
