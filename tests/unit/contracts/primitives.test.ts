import { describe, expect, it } from "vitest";
import { Money } from "@/contracts/primitives";

describe("Money", () => {
  it.each(["1", "0.01", "98500.5", "1200000.00", "9999999999999999.99"])("accepts %s", (amount) => {
    expect(Money.safeParse(amount).success).toBe(true);
  });

  it.each(["0", "0.00", "-1", "1.234", "1e5", " 1", "1,000", "10000000000000000"])("rejects %s", (amount) => {
    expect(Money.safeParse(amount).error?.issues[0]?.message).toBe("Use a positive amount with at most two decimals");
  });
});
