import { describe, expect, it } from "vitest";
import { createRandom } from "@scripts/data-generation/random";

const draws = (seed: string, count = 20) => {
  const random = createRandom(seed);
  return Array.from({ length: count }, () => random.next());
};

describe("createRandom", () => {
  it("repeats the same sequence for the same seed", () => {
    expect(draws("acme")).toEqual(draws("acme"));
  });

  it("produces a different sequence for a different seed", () => {
    expect(draws("acme")).not.toEqual(draws("acme-2"));
  });

  it("draws floats in [0, 1)", () => {
    for (const value of draws("range", 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("draws integers within an inclusive range, reaching both ends", () => {
    const random = createRandom("ints");
    const seen = new Set(Array.from({ length: 2_000 }, () => random.int(-2, 3)));
    expect([...seen].sort((a, b) => a - b)).toEqual([-2, -1, 0, 1, 2, 3]);
  });

  it("rejects an empty or fractional integer range", () => {
    const random = createRandom("bad");
    expect(() => random.int(3, 2)).toThrow(RangeError);
    expect(() => random.int(0, 1.5)).toThrow(RangeError);
  });

  it("shuffles a copy that keeps every item", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const shuffled = createRandom("shuffle").shuffle(items);
    expect(items).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...shuffled].sort((a, b) => a - b)).toEqual(items);
    expect(shuffled).not.toEqual(items);
  });

  it("picks from the list and rejects an empty one", () => {
    const random = createRandom("pick");
    expect(["a", "b"]).toContain(random.pick(["a", "b"]));
    expect(() => random.pick([])).toThrow(RangeError);
  });

  it("forks streams that depend only on the seed and label, not on earlier draws", () => {
    const fresh = createRandom("acme").fork("history");
    const used = createRandom("acme");
    used.next();
    used.next();
    const forked = used.fork("history");
    expect([forked.next(), forked.next()]).toEqual([fresh.next(), fresh.next()]);
    expect(createRandom("acme").fork("names").next()).not.toBe(createRandom("acme").fork("history").next());
  });

  it("hits a probability close to its rate", () => {
    const random = createRandom("chance");
    const hits = Array.from({ length: 10_000 }, () => random.chance(0.3)).filter(Boolean).length;
    expect(hits).toBeGreaterThan(2_800);
    expect(hits).toBeLessThan(3_200);
  });
});
