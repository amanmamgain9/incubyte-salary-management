import { describe, expect, it } from "vitest";
import { divideRounded, fromMinorUnits, toMinorUnits } from "@/lib/money";

describe("toMinorUnits", () => {
  it.each([
    ["1200000.00", 120000000n],
    ["98500.5", 9850050n],
    ["7", 700n],
    ["0.01", 1n],
    ["-0.01", -1n],
    ["-33.3", -3330n],
    ["9999999999999999.99", 999999999999999999n],
  ])("reads %s as %s", (amount, units) => {
    expect(toMinorUnits(amount)).toBe(units);
  });

  it.each(["", "abc", "1.234", "1e5", " 1", "1,000", "+1", ".5", "1."])("rejects %j", (amount) => {
    expect(toMinorUnits(amount)).toBeNull();
  });
});

describe("fromMinorUnits", () => {
  it.each([
    [120000000n, "1200000.00"],
    [9850050n, "98500.50"],
    [1n, "0.01"],
    [0n, "0.00"],
    [-1n, "-0.01"],
    [-3330n, "-33.30"],
    [999999999999999999n, "9999999999999999.99"],
  ])("writes %s as %s", (units, amount) => {
    expect(fromMinorUnits(units)).toBe(amount);
  });
});

describe("divideRounded", () => {
  it("rounds halves away from zero", () => {
    expect(divideRounded(5n, 2n)).toBe(3n);
    expect(divideRounded(-5n, 2n)).toBe(-3n);
    expect(divideRounded(7n, -2n)).toBe(-4n);
  });

  it("rounds other remainders to the nearest integer", () => {
    expect(divideRounded(10n, 3n)).toBe(3n);
    expect(divideRounded(20n, 3n)).toBe(7n);
    expect(divideRounded(-20n, 3n)).toBe(-7n);
  });

  it("rejects division by zero", () => {
    expect(() => divideRounded(1n, 0n)).toThrow(RangeError);
  });
});
