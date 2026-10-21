import { describe, expect, it } from "vitest";
import type { SalaryCommitmentRow } from "@/contracts/reports/salary-commitment";
import { countryBars, singleCommitment } from "@/features/reports/salary-commitment/salary-commitment-data";

const countryName = (code: string) => ({ IN: "India", US: "United States" })[code] ?? code;

describe("countryBars", () => {
  it("puts the largest countries first, ties by code, labelled by code", () => {
    const bars = countryBars(
      [
        { work_country_code: "DE", employee_count: 900 },
        { work_country_code: "IN", employee_count: 3000 },
        { work_country_code: "CA", employee_count: 900 },
      ],
      countryName,
    );
    expect(bars.map((bar) => bar.label)).toEqual(["IN", "CA", "DE"]);
    expect(bars[0]).toEqual({ label: "IN", value: 3000, description: "India: 3,000" });
  });

  it("keeps at most seven countries", () => {
    const byCountry = ["AA", "BB", "CC", "DD", "EE", "FF", "GG", "HH"].map((code, index) => ({
      work_country_code: code,
      employee_count: index + 1,
    }));
    expect(countryBars(byCountry, countryName).map((bar) => bar.label)).toEqual(["HH", "GG", "FF", "EE", "DD", "CC", "BB"]);
  });
});

describe("singleCommitment", () => {
  const row: SalaryCommitmentRow = {
    work_country_code: "US",
    salary_currency_code: "USD",
    employee_count: 2,
    total_annual_base_pay: "250000.00",
  };
  const page = (items: SalaryCommitmentRow[], total_count: number) => ({
    items,
    next_cursor: null,
    prev_cursor: null,
    total_count,
    range_start: items.length ? 1 : 0,
  });

  it("returns the only country/currency row", () => {
    expect(singleCommitment(page([row], 1))).toEqual(row);
  });

  it("returns null for several groups or none", () => {
    expect(singleCommitment(page([row, { ...row, salary_currency_code: "EUR" }], 2))).toBeNull();
    expect(singleCommitment(page([], 0))).toBeNull();
  });
});
