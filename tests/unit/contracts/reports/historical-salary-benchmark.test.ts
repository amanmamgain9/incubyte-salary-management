import { describe, expect, it } from "vitest";
import { HistoricalSalaryBenchmarkInput } from "@/contracts/reports/historical-salary-benchmark";

const issuesOf = (input: unknown) =>
  HistoricalSalaryBenchmarkInput.safeParse(input).error?.issues.map(({ path, message }) => ({ path, message }));

describe("HistoricalSalaryBenchmarkInput", () => {
  it("accepts a partial final month and optional filters", () => {
    expect(
      HistoricalSalaryBenchmarkInput.parse({ from: "2024-11-01", to: "2026-10-21", salary_currency_code: "EUR" }),
    ).toEqual({ from: "2024-11-01", to: "2026-10-21", salary_currency_code: "EUR" });
  });

  it("rejects a start date that is not the first day of a month, keyed by `from`", () => {
    expect(issuesOf({ from: "2026-01-02", to: "2026-03-31" })).toEqual([
      { path: ["from"], message: "Use the first day of a month" },
    ]);
  });

  it("rejects an end date before the start date, keyed by `to`", () => {
    expect(issuesOf({ from: "2026-03-01", to: "2026-02-28" })).toEqual([
      { path: ["to"], message: "Must be on or after the start date" },
    ]);
  });

  it("accepts 180 visible months and rejects 181, keyed by `to`", () => {
    expect(issuesOf({ from: "2011-11-01", to: "2026-10-21" })).toBeUndefined();
    expect(issuesOf({ from: "2011-10-01", to: "2026-10-01" })).toEqual([
      { path: ["to"], message: "Choose at most 180 months" },
    ]);
  });
});
