import { describe, expect, it } from "vitest";
import { Money, Month } from "@/contracts/primitives";

describe("Money", () => {
  it.each(["1", "0.01", "98500.5", "1200000.00", "9999999999999999.99"])("accepts %s", (amount) => {
    expect(Money.safeParse(amount).success).toBe(true);
  });

  it.each(["0", "0.00", "-1", "1.234", "1e5", " 1", "1,000", "10000000000000000"])("rejects %s", (amount) => {
    expect(Money.safeParse(amount).error?.issues[0]?.message).toBe("Use a positive amount with at most two decimals");
  });
});

describe("Month", () => {
  it.each(["2026-01", "2026-12", "1999-10"])("accepts %s", (month) => {
    expect(Month.safeParse(month).success).toBe(true);
  });

  it.each(["2026-00", "2026-13", "2026-1", "2026-01-01", "26-01"])("rejects %s", (month) => {
    expect(Month.safeParse(month).error?.issues[0]?.message).toBe("Use a month (YYYY-MM)");
  });
});
