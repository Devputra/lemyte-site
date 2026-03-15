// src/lib/gate/__tests__/shuffle.test.ts
import { describe, it, expect } from "vitest";
import { seededShuffle, createShuffleSeed, hashQuestionOrder } from "../shuffle";

describe("seededShuffle", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"];

  it("should produce a deterministic result for the same seed", () => {
    const seed = "test-seed-123";
    const result1 = seededShuffle(items, seed);
    const result2 = seededShuffle(items, seed);
    expect(result1).toEqual(result2);
  });

  it("should produce different results for different seeds", () => {
    const result1 = seededShuffle(items, "seed-alpha");
    const result2 = seededShuffle(items, "seed-beta");
    // Could theoretically be equal, but practically never for 10 items
    expect(result1).not.toEqual(result2);
  });

  it("should not modify the original array", () => {
    const original = [...items];
    seededShuffle(items, "some-seed");
    expect(items).toEqual(original);
  });

  it("should contain all original elements (no duplicates, no loss)", () => {
    const result = seededShuffle(items, "shuffle-test");
    expect(result.sort()).toEqual([...items].sort());
  });

  it("should be reproducible across calls (session resume)", () => {
    const seed = createShuffleSeed();
    const order1 = seededShuffle(items, seed);
    // Simulate resume: same seed should produce same order
    const order2 = seededShuffle(items, seed);
    expect(order1).toEqual(order2);
  });
});

describe("hashQuestionOrder", () => {
  it("should produce consistent hash for same order", () => {
    const order = ["q1", "q2", "q3"];
    expect(hashQuestionOrder(order)).toBe(hashQuestionOrder(order));
  });

  it("should produce different hash for different order", () => {
    const order1 = ["q1", "q2", "q3"];
    const order2 = ["q3", "q1", "q2"];
    expect(hashQuestionOrder(order1)).not.toBe(hashQuestionOrder(order2));
  });
});

describe("createShuffleSeed", () => {
  it("should generate unique seeds", () => {
    const seeds = new Set(Array.from({ length: 100 }, () => createShuffleSeed()));
    expect(seeds.size).toBe(100);
  });

  it("should generate 64-character hex strings", () => {
    const seed = createShuffleSeed();
    expect(seed).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(seed)).toBe(true);
  });
});
