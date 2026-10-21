import { describe, expect, it } from "vitest";
import { HistoricalSalaryBenchmarkInput } from "@/contracts/reports/historical-salary-benchmark";
import { SalaryGrowthInput } from "@/contracts/reports/salary-growth";
import { periodErrors, readFilterForm, reportFilterSearch, trailingMonths } from "@/features/reports/search-params";
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

describe("periodErrors", () => {
  it("accepts a valid period", () => {
    expect(periodErrors(SalaryGrowthInput, { from: "2026-01-01", to: today }, today)).toEqual({});
  });

  it("keys the contract's range errors by field", () => {
    expect(periodErrors(SalaryGrowthInput, { from: "2026-05-01", to: "2026-04-30" }, today)).toEqual({
      to: "Must be on or after the start date",
    });
    expect(periodErrors(HistoricalSalaryBenchmarkInput, { from: "2011-01-01", to: "2026-01-01" }, today)).toEqual({
      to: "Choose at most 180 months",
    });
    expect(periodErrors(SalaryGrowthInput, { from: "", to: today }, today)).toEqual({ from: "Use a valid date (YYYY-MM-DD)" });
  });

  it("rejects an end date after today", () => {
    expect(periodErrors(SalaryGrowthInput, { from: "2026-01-01", to: "2026-10-22" }, today)).toEqual({
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
    const form = { from: "2025-02", to: "2026-01-31", work_country_code: "" };
    expect(readFilterForm(["months", "country"], form, today, HistoricalSalaryBenchmarkInput)).toEqual({
      patch: { work_country_code: "", from: "2025-02-01", to: "2026-01-31" },
      errors: {},
    });
  });

  it("returns the period's errors", () => {
    const form = { from: "2026-06-01", to: "2026-05-01" };
    expect(readFilterForm(["dates"], form, today, SalaryGrowthInput).errors).toEqual({
      to: "Must be on or after the start date",
    });
  });

  it("checks the period with the contract it is given", () => {
    const form = { from: "2011-01", to: "2026-01-31" };
    expect(readFilterForm(["months"], form, today, HistoricalSalaryBenchmarkInput).errors).toEqual({
      to: "Choose at most 180 months",
    });
  });
});

describe("trailingMonths", () => {
  it("covers the given months ending this month, through today", () => {
    expect(trailingMonths("2026-10-21", 12)).toEqual({ from: "2025-11-01", to: "2026-10-21" });
  });

  it("starts in the same month a year earlier when today is a month end", () => {
    expect(trailingMonths("2024-03-31", 12)).toEqual({ from: "2023-04-01", to: "2024-03-31" });
  });

  it("crosses year boundaries from January", () => {
    expect(trailingMonths("2026-01-01", 24)).toEqual({ from: "2024-02-01", to: "2026-01-01" });
  });
});
