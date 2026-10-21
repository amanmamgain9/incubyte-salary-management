import { describe, expect, it } from "vitest";
import type { CountrySummary } from "@/contracts/reports/department-breakdown";
import {
  countryCount,
  departmentBars,
  departmentComparison,
  singleGroup,
} from "@/features/reports/department-breakdown/department-breakdown-data";

const departmentName = (id: string) => ({ engineering: "Engineering", sales: "Sales", finance: "Finance" })[id] ?? id;
const group = (country: string, currency: string): CountrySummary => ({
  work_country_code: country,
  salary_currency_code: currency,
  employee_count: 2,
  total_annual_base_pay: "200000.00",
  average_annual_base_pay: "100000.00",
});

describe("singleGroup", () => {
  it("returns the group when exactly one country/currency matches", () => {
    expect(singleGroup([group("US", "USD")])).toEqual(group("US", "USD"));
  });

  it("returns null for none or several", () => {
    expect(singleGroup([])).toBeNull();
    expect(singleGroup([group("IN", "INR"), group("IN", "USD")])).toBeNull();
  });
});

describe("countryCount", () => {
  it("counts a country with two currencies once", () => {
    expect(countryCount([group("IN", "INR"), group("IN", "USD"), group("US", "USD")])).toBe(2);
  });
});

describe("departmentBars", () => {
  it("puts the largest departments first with their names", () => {
    const bars = departmentBars(
      [
        { department_id: "engineering", employee_count: 10, total_annual_base_pay: null },
        { department_id: "sales", employee_count: 25, total_annual_base_pay: null },
      ],
      departmentName,
    );
    expect(bars).toEqual([
      { label: "Sales", value: 25, description: "Sales: 25" },
      { label: "Engineering", value: 10, description: "Engineering: 10" },
    ]);
  });
});

describe("departmentComparison", () => {
  it("charts each department's single-group total in API order", () => {
    expect(
      departmentComparison(
        [
          { department_id: "engineering", employee_count: 3, total_annual_base_pay: "1250000.00" },
          { department_id: "finance", employee_count: 1, total_annual_base_pay: "98000.50" },
        ],
        departmentName,
        "USD",
      ),
    ).toEqual([
      { label: "Engineering", value: 1250000, display: "1.25M USD", tone: "accent" },
      { label: "Finance", value: 98000.5, display: "98K USD", tone: "accent" },
    ]);
  });

  it("returns null when the totals span currencies (null) or nothing matches", () => {
    expect(
      departmentComparison([{ department_id: "sales", employee_count: 3, total_annual_base_pay: null }], departmentName, "USD"),
    ).toBeNull();
    expect(departmentComparison([], departmentName, "USD")).toBeNull();
  });
});
