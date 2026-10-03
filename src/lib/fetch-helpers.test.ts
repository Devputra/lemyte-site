import { afterEach, expect, it, vi } from "vitest";
import { fetchJson } from "./fetch-helpers";

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
it("rejects HTTP errors instead of treating them as empty catalogues", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503 })));
  await expect(fetchJson("/catalogue")).rejects.toThrow("503");
});
it("aborts a stalled request after twelve seconds", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn((_url, init) => new Promise((_resolve, reject) => {
    init.signal.addEventListener("abort", () => reject(new Error("aborted")));
  })));
  const result = expect(fetchJson("/catalogue")).rejects.toThrow("aborted");
  await vi.advanceTimersByTimeAsync(12_000);
  await result;
});
