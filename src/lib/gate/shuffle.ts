// src/lib/gate/shuffle.ts
// Deterministic seeded Fisher-Yates shuffle for GATE attempts

import crypto from "crypto";

/**
 * Generate a cryptographically secure shuffle seed.
 */
export function createShuffleSeed(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Convert a string seed to a numeric seed using FNV-1a hash.
 */
function hashToSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Mulberry32 PRNG — deterministic and fast.
 */
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic Fisher-Yates shuffle.
 */
export function seededShuffle<T>(arr: readonly T[], seedStr: string): T[] {
  const rng = mulberry32(hashToSeed(seedStr));
  const a = arr.slice();

  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}

/**
 * Get question order for an attempt.
 */
export function getQuestionOrder(
  questionVersionIds: string[],
  shuffleSeed: string
): string[] {
  return seededShuffle(questionVersionIds, shuffleSeed);
}

/**
 * Hash resolved order for integrity checks.
 */
export function hashQuestionOrder(order: string[]): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(order))
    .digest("hex");
}
