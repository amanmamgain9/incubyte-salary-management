import { describe, expect, it } from "vitest";
import {
  historicalSalaryBenchmarkSearch,
  periodErrors,
  readFilterForm,
  reportFilterSearch,
  salaryGrowthSearch,
} from "@/features/reports/search-params";
import { parseSearchParams } from "@/lib/search-params";

const today = "2026-10-21";

describe("reportFilterSearch", () => {
  it("builds the commitment and department input from the URL", () => {
    expect(
      parseSearchParams(reportFilterSearch, {
        work_country_code: "IN",
        department_id: "engineering",
        salary_currency_code: "USD",
        cursor: "opaque",
      }),
    ).toEqual({ work_country_code: "IN", department_id: "engineering", salary_currency_code: "USD", cursor: "opaque" });
  });

  it("drops malformed codes instead of failing", () => {
    expect(parseSearchParams(reportFilterSearch, { work_country_code: "india", salary_currency_code: "usd" })).toEqual({
      work_country_code: undefined,
      department_id: undefined,
      salary_currency_code: undefined,
      cursor: undefined,
    });
  });
});

describe("salaryGrowthSearch", () => {
  it("defaults to the 12 months ending today", () => {
    expect(parseSearchParams(salaryGrowthSearch(today), {})).toMatchObject({ from: "2025-11-01", to: today });
  });

  it("keeps a valid period and the filters", () => {
    expect(
      parseSearchParams(salaryGrowthSearch(today), { from: "2026-01-15", to: "2026-03-31", work_country_code: "DE" }),
    ).toMatchObject({ from: "2026-01-15", to: "2026-03-31", work_country_code: "DE" });
  });

  it("falls back to the default period when it is reversed or ends after today", () => {
    expect(parseSearchParams(salaryGrowthSearch(today), { from: "2026-05-01", to: "2026-04-01" })).toMatchObject({
      from: "2025-11-01",
      to: today,
    });
    expect(parseSearchParams(salaryGrowthSearch(today), { from: "2026-05-01", to: "2026-10-22" })).toMatchObject({
      from: "2025-11-01",
      to: today,
    });
  });

  it("replaces an impossible date with its default", () => {
    expect(parseSearchParams(salaryGrowthSearch(today), { from: "2026-02-30", to: "2026-09-30" })).toMatchObject({
      from: "2025-11-01",
      to: "2026-09-30",
    });
  });
});

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

describe("periodErrors", () => {
  it("accepts a valid period", () => {
    expect(periodErrors("dates", { from: "2026-01-01", to: today }, today)).toEqual({});
  });

  it("keys the contract's range errors by field", () => {
    expect(periodErrors("dates", { from: "2026-05-01", to: "2026-04-30" }, today)).toEqual({
      to: "Must be on or after the start date",
    });
    expect(periodErrors("months", { from: "2011-01-01", to: "2026-01-01" }, today)).toEqual({
      to: "Choose at most 180 months",
    });
    expect(periodErrors("dates", { from: "", to: today }, today)).toEqual({ from: "Use a valid date (YYYY-MM-DD)" });
  });

  it("rejects an end date after today", () => {
    expect(periodErrors("dates", { from: "2026-01-01", to: "2026-10-22" }, today)).toEqual({
      to: "Must be today or earlier",
    });
  });
});

describe("readFilterForm", () => {
  it("patches only the report's own controls, blank meaning all", () => {
    expect(
      readFilterForm(["country", "department", "currency"], { work_country_code: "IN", department_id: "" }, today),
    ).toEqual({ patch: { work_country_code: "IN", department_id: "", salary_currency_code: "" }, errors: {} });
  });

  it("turns a month control into its first day", () => {
    expect(readFilterForm(["months", "country"], { from: "2025-02", to: "2026-01-31", work_country_code: "" }, today))
      .toEqual({ patch: { work_country_code: "", from: "2025-02-01", to: "2026-01-31" }, errors: {} });
  });

  it("returns the period's errors", () => {
    expect(readFilterForm(["dates"], { from: "2026-06-01", to: "2026-05-01" }, today).errors).toEqual({
      to: "Must be on or after the start date",
    });
  });
});
