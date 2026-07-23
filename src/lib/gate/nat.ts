// src/lib/gate/nat.ts
// NAT (Numeric Answer Type) validation — backend-authoritative

function countDecimals(s: string): number {
  const dotIdx = s.indexOf(".");
  if (dotIdx === -1) return 0;
  return s.length - dotIdx - 1;
}

/**
 * Round a number to the given decimal places using round-half-up.
 * (NOT banker's rounding)
 */
function roundHalfUp(value: number, precision: number): number {
  const factor = Math.pow(10, precision);
  return Math.round(value * factor + Number.EPSILON) / factor;
}

export interface NATValidationResult {
  valid: true;
  normalized: number;
}

export interface NATValidationError {
  valid: false;
  error: string;
}

/**
 * Validate and normalize a NAT input string.
 *
 * Rules:
 * 1. Reject scientific notation (e/E)
 * 2. Empty input -> null (unanswered is allowed)
 * 3. Reject if not a valid decimal format
 * 4. Reject if decimal places exceed natPrecision
 * 5. Normalize by rounding to natPrecision using round-half-up
 *
 * Note:
 * - Inclusive lower/upper bound checks are handled during grading, not here.
 */
export function validateAndNormalizeNAT(
  inputStr: string | null | undefined,
  natPrecision: number
): NATValidationResult | NATValidationError | null {
  if (inputStr === null || inputStr === undefined || inputStr.trim() === "") {
    return null;
  }

  const trimmed = inputStr.trim();

  if (/[eE]/.test(trimmed)) {
    return { valid: false, error: "Scientific notation is not allowed" };
  }

  if (!/^[+-]?(\d+)(\.\d+)?$/.test(trimmed)) {
    return { valid: false, error: "Invalid decimal format" };
  }

  const decimals = countDecimals(trimmed);
  if (decimals > natPrecision) {
    return {
      valid: false,
      error: `Too many decimal places: ${decimals} exceeds maximum of ${natPrecision}`,
    };
  }

  const value = parseFloat(trimmed);
  if (!Number.isFinite(value)) {
    return { valid: false, error: "Value is not a finite number" };
  }

  const normalized = roundHalfUp(value, natPrecision);
  return { valid: true, normalized };
}

/**
 * Inclusive bound check used during grading.
 */
export function isNATCorrect(
  normalizedValue: number,
  lowerBound: number,
  upperBound: number
): boolean {
  return normalizedValue >= lowerBound && normalizedValue <= upperBound;
}
