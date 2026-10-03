import { describe, expect, it } from "vitest";

import { casUpdate } from "../redis-cas";

// In-memory stand-in for the two Redis calls casUpdate makes; eval mimics CAS_SCRIPT's compare-and-set.
function fakeRedis(initial: string | null, { interfereOnce = false } = {}) {
  let value = initial;
  let interfere = interfereOnce;
  return {
    get value() {
      return value;
    },
    async get() {
      return value;
    },
    async eval(_script: string, _n: number, _key: string, expected: string, next: string) {
      if (interfere) {
        // Another request writes between our read and our write.
        interfere = false;
        value = JSON.stringify({ ...JSON.parse(value!), n: JSON.parse(value!).n + 100 });
      }
      if (value === null) return -1;
      if (value !== expected) return 0;
      value = next;
      return 1;
    },
  };
}

describe("casUpdate", () => {
  it("writes the updated value", async () => {
    const r = fakeRedis(JSON.stringify({ n: 1 }));
    const out = await casUpdate<{ n: number }>(r as never, "k", (v) => ({ n: v.n + 1 }));
    expect(out).toEqual({ n: 2 });
    expect(JSON.parse(r.value!)).toEqual({ n: 2 });
  });

  it("re-reads and re-applies after a concurrent write instead of overwriting it", async () => {
    const r = fakeRedis(JSON.stringify({ n: 1 }), { interfereOnce: true });
    await casUpdate<{ n: number }>(r as never, "k", (v) => ({ n: v.n + 1 }));
    expect(JSON.parse(r.value!)).toEqual({ n: 102 }); // the other write (+100) is kept, ours applied on top
  });

  it("returns null when the key does not exist", async () => {
    expect(await casUpdate(fakeRedis(null) as never, "k", (v) => v)).toBeNull();
  });
});
