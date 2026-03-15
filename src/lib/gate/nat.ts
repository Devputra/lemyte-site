// src/lib/gate/nat.ts
// NAT (Numeric Answer Type) validation — backend-authoritative

/**
 * Count decimal places in a string representation.
 */
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
 * Rules (executed in exact sequence per PRD):
 * 1. Reject scientific notation (e/E)
 * 2. Reject if empty (returns null — unanswered is allowed)
 * 3. Reject if not a valid decimal format
 * 4. Count decimal places → reject if exceeds nat_precision
 * 5. Normalize by rounding to nat_precision using round-half-up
 * 6. Return normalized value (range check is done at grading time, not here)
 */
export function validateAndNormalizeNAT(
  inputStr: string | null | undefined,
  natPrecision: number,
  _natLowerBound: number,
  _natUpperBound: number
): NATValidationResult | NATValidationError | null {
  // Empty input = unanswered (allowed)
  if (inputStr === null || inputStr === undefined || inputStr.trim() === "") {
    return null;
  }

  const trimmed = inputStr.trim();

  // Step 1: Reject scientific notation
  if (/[eE]/.test(trimmed)) {
    return { valid: false, error: "Scientific notation is not allowed" };
  }

  // Step 3: Validate decimal format (optional leading +/-, digits, optional decimal point + digits)
  if (!/^[+-]?(\d+)(\.\d+)?$/.test(trimmed)) {
    return { valid: false, error: "Invalid decimal format" };
  }

  // Step 4: Count decimal places
  const decimals = countDecimals(trimmed);
  if (decimals > natPrecision) {
    return {
      valid: false,
      error: `Too many decimal places: ${decimals} exceeds maximum of ${natPrecision}`,
    };
  }

  // Step 5: Parse and normalize
  const value = parseFloat(trimmed);
  if (!Number.isFinite(value)) {
    return { valid: false, error: "Value is not a finite number" };
  }

  const normalized = roundHalfUp(value, natPrecision);

  // Step 6: Return normalized value
  // Note: Range check is NOT an error; it's just "incorrect" at grading time
  return { valid: true, normalized };
}

/**
 * Check if a normalized NAT value falls within the inclusive bounds.
 * Used during grading (not during input validation).
 */
export function isNATCorrect(
  normalizedValue: number,
  lowerBound: number,
  upperBound: number
): boolean {
  return normalizedValue >= lowerBound && normalizedValue <= upperBound;
}
