import { describe, expect, it } from "vitest";
import { salaryDelta } from "@/features/salaries/salary-delta";

const inr = (annual_base_pay: string) => ({ annual_base_pay, salary_currency_code: "INR" });

describe("salaryDelta", () => {
  it("gives a raise as a positive change and percentage of current pay", () => {
    expect(salaryDelta(inr("1200000.00"), inr("1350000.5"))).toEqual({ change: "150000.50", percent: "12.50" });
  });

  it("gives a cut as a negative change and percentage", () => {
    expect(salaryDelta(inr("1000.00"), inr("966.67"))).toEqual({ change: "-33.33", percent: "-3.33" });
  });

  it("gives zero for unchanged pay", () => {
    expect(salaryDelta(inr("1200000.00"), inr("1200000"))).toEqual({ change: "0.00", percent: "0.00" });
  });

  it("computes exactly where binary floating point would not", () => {
    expect(salaryDelta(inr("0.10"), inr("0.30"))).toEqual({ change: "0.20", percent: "200.00" });
    expect(salaryDelta(inr("9999999999999999.98"), inr("9999999999999999.99"))).toEqual({
      change: "0.01",
      percent: "0.00",
    });
  });

  it("rounds the percentage half away from zero", () => {
    expect(salaryDelta(inr("8.00"), inr("8.01"))).toEqual({ change: "0.01", percent: "0.13" });
    expect(salaryDelta(inr("8.00"), inr("7.99"))).toEqual({ change: "-0.01", percent: "-0.13" });
  });

  it("shows a tiny cut that rounds to zero percent without a sign", () => {
    expect(salaryDelta(inr("9999999999999999.99"), inr("9999999999999999.98"))).toEqual({
      change: "-0.01",
      percent: "0.00",
    });
  });

  it("has no delta across currencies, since amounts are never converted", () => {
    expect(salaryDelta(inr("1200000.00"), { annual_base_pay: "15000.00", salary_currency_code: "USD" })).toBeNull();
  });

  it.each(["", "abc", "12.345", "1e5", "0", "0.00", "-5"])(
    "has no delta while the new amount is %j",
    (annual_base_pay) => {
      expect(salaryDelta(inr("1200000.00"), inr(annual_base_pay))).toBeNull();
    },
  );
});
