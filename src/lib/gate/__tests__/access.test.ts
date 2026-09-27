// src/lib/gate/__tests__/access.test.ts
import { describe, it, expect, vi } from "vitest";

// Mock `server-only` so the import chain doesn't throw in test environment.
vi.mock("server-only", () => ({}));
// Mock the supabase admin client so we don't need actual credentials.
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {},
}));

const { addMonths } = await import("../access");

describe("addMonths", () => {
  it("adds months to a date", () => {
    const d = new Date("2025-01-15T00:00:00Z");
    const result = addMonths(d, 3);
    expect(result.getMonth()).toBe(3); // April (0-indexed)
    expect(result.getDate()).toBe(15);
  });

  it("handles month overflow (Jan 31 + 1 month)", () => {
    const d = new Date("2025-01-31T00:00:00Z");
    const result = addMonths(d, 1);
    // Jan 31 + 1 month → March 3 (since Feb has 28 days in 2025)
    expect(result.getMonth()).toBe(2); // March
    expect(result.getDate()).toBe(3);
  });

  it("handles year boundary", () => {
    const d = new Date("2025-11-15T00:00:00Z");
    const result = addMonths(d, 3);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(1); // February
  });

  it("does not mutate the original date", () => {
    const d = new Date("2025-06-01T00:00:00Z");
    const original = d.getTime();
    addMonths(d, 6);
    expect(d.getTime()).toBe(original);
  });
});
