import { describe, expect, it } from "vitest";
import { SalaryGrowthInput } from "@/contracts/reports/salary-growth";

const issuesOf = (input: unknown) =>
  SalaryGrowthInput.safeParse(input).error?.issues.map(({ path, message }) => ({ path, message }));

describe("SalaryGrowthInput", () => {
  it("accepts a one-day period with optional filters", () => {
    expect(SalaryGrowthInput.parse({ from: "2026-03-01", to: "2026-03-01", work_country_code: "IN" })).toEqual({
      from: "2026-03-01",
      to: "2026-03-01",
      work_country_code: "IN",
    });
  });

  it("rejects an end date before the start date, keyed by `to`", () => {
    expect(issuesOf({ from: "2026-03-02", to: "2026-03-01" })).toEqual([
      { path: ["to"], message: "Must be on or after the start date" },
    ]);
  });

  it("requires both dates and rejects impossible ones", () => {
    expect(issuesOf({ to: "2026-02-30" })?.map(({ path }) => path)).toEqual([["from"], ["to"]]);
  });

  it("has no salary currency filter", () => {
    expect(SalaryGrowthInput.parse({ from: "2026-01-01", to: "2026-01-31", salary_currency_code: "INR" })).toEqual({
      from: "2026-01-01",
      to: "2026-01-31",
    });
  });
});
