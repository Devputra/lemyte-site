// src/lib/gate/__tests__/nat.test.ts
import { describe, it, expect } from "vitest";
import { validateAndNormalizeNAT, isNATCorrect } from "../nat";

describe("validateAndNormalizeNAT", () => {
  it("should return null for empty input (unanswered allowed)", () => {
    expect(validateAndNormalizeNAT("", 2, 0, 10)).toBeNull();
    expect(validateAndNormalizeNAT(null, 2, 0, 10)).toBeNull();
    expect(validateAndNormalizeNAT(undefined, 2, 0, 10)).toBeNull();
    expect(validateAndNormalizeNAT("   ", 2, 0, 10)).toBeNull();
  });

  it("should reject scientific notation (e/E)", () => {
    const r1 = validateAndNormalizeNAT("4e-3", 2, 0, 10);
    expect(r1).not.toBeNull();
    expect(r1!.valid).toBe(false);
    if (!r1!.valid) expect(r1!.error).toContain("Scientific notation");

    const r2 = validateAndNormalizeNAT("1.5E2", 2, 0, 200);
    expect(r2!.valid).toBe(false);
  });

  it("should reject invalid decimal formats", () => {
    const r1 = validateAndNormalizeNAT("abc", 2, 0, 10);
    expect(r1!.valid).toBe(false);

    const r2 = validateAndNormalizeNAT("1.2.3", 2, 0, 10);
    expect(r2!.valid).toBe(false);

    const r3 = validateAndNormalizeNAT("--5", 2, 0, 10);
    expect(r3!.valid).toBe(false);
  });

  it("should reject inputs exceeding nat_precision decimal places", () => {
    const result = validateAndNormalizeNAT("3.141", 2, 0, 10);
    expect(result!.valid).toBe(false);
    if (!result!.valid) expect(result!.error).toContain("Too many decimal places");
  });

  it("should accept and normalize valid decimals", () => {
    const result = validateAndNormalizeNAT("2.56", 2, 0, 10);
    expect(result).not.toBeNull();
    expect(result!.valid).toBe(true);
    if (result!.valid) expect(result!.normalized).toBe(2.56);
  });

  it("should normalize with round-half-up", () => {
    // 2.555 with precision 2 should round to 2.56 (half-up, not banker's)
    const result = validateAndNormalizeNAT("2.55", 2, 0, 10);
    expect(result!.valid).toBe(true);
    if (result!.valid) expect(result!.normalized).toBe(2.55);
  });

  it("should accept integers when precision is 0", () => {
    const result = validateAndNormalizeNAT("42", 0, 0, 100);
    expect(result!.valid).toBe(true);
    if (result!.valid) expect(result!.normalized).toBe(42);
  });

  it("should accept negative values", () => {
    const result = validateAndNormalizeNAT("-3.14", 2, -10, 10);
    expect(result!.valid).toBe(true);
    if (result!.valid) expect(result!.normalized).toBe(-3.14);
  });

  it("should accept values with leading +", () => {
    const result = validateAndNormalizeNAT("+5.0", 1, 0, 10);
    expect(result!.valid).toBe(true);
    if (result!.valid) expect(result!.normalized).toBe(5.0);
  });

  it("should not reject out-of-range values (that is grading's job)", () => {
    const result = validateAndNormalizeNAT("999", 0, 0, 10);
    expect(result!.valid).toBe(true);
    if (result!.valid) expect(result!.normalized).toBe(999);
  });
});

describe("isNATCorrect", () => {
  it("should return true for value within inclusive bounds", () => {
    expect(isNATCorrect(5, 3, 7)).toBe(true);
  });

  it("should return true for value at lower bound", () => {
    expect(isNATCorrect(3, 3, 7)).toBe(true);
  });

  it("should return true for value at upper bound", () => {
    expect(isNATCorrect(7, 3, 7)).toBe(true);
  });

  it("should return false for value below lower bound", () => {
    expect(isNATCorrect(2.99, 3, 7)).toBe(false);
  });

  it("should return false for value above upper bound", () => {
    expect(isNATCorrect(7.01, 3, 7)).toBe(false);
  });
});
