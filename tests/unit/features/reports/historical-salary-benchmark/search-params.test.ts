import { describe, expect, it } from "vitest";
import { historicalSalaryBenchmarkSearch } from "@/features/reports/historical-salary-benchmark/search-params";
import { parseSearchParams } from "@/lib/search-params";

const today = "2026-10-21";

describe("historicalSalaryBenchmarkSearch", () => {
  it("defaults to the 24 months ending today", () => {
    expect(parseSearchParams(historicalSalaryBenchmarkSearch(today), {})).toMatchObject({
      from: "2024-11-01",
      to: today,
    });
  });

  it("moves `from` to the first day of its month and keeps every filter", () => {
    expect(
      parseSearchParams(historicalSalaryBenchmarkSearch(today), {
        from: "2025-03-17",
        to: "2026-06-30",
        work_country_code: "GB",
        department_id: "sales",
        salary_currency_code: "GBP",
      }),
    ).toMatchObject({
      from: "2025-03-01",
      to: "2026-06-30",
      work_country_code: "GB",
      department_id: "sales",
      salary_currency_code: "GBP",
    });
  });

  it("falls back to the default range beyond 180 months", () => {
    expect(
      parseSearchParams(historicalSalaryBenchmarkSearch(today), { from: "2011-10-01", to: "2026-10-01" }),
    ).toMatchObject({ from: "2024-11-01", to: today });
  });
});
