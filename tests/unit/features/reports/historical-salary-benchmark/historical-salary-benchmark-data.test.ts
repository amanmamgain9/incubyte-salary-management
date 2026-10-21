import { describe, expect, it } from "vitest";
import type { BenchmarkGroup, BenchmarkPoint } from "@/contracts/reports/historical-salary-benchmark";
import {
  headcountTrend,
  payRangeTrend,
  singleGroup,
} from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-data";

const point = (month: string, median: string | null, employees = 3): BenchmarkPoint => ({
  month,
  employee_count: employees,
  p10_annual_base_pay: median === null ? null : "90000.00",
  median_annual_base_pay: median,
  p90_annual_base_pay: median === null ? null : "130000.50",
  country_median_annual_base_pay: median === null ? null : "105000.00",
});

describe("payRangeTrend", () => {
  it("charts median, country median and the P10–P90 band per month, leaving months without a group as gaps", () => {
    expect(payRangeTrend([point("2026-08", null, 0), point("2026-09", "110000.25")])).toEqual([
      { label: "Aug ’26", values: { median: null, country_median: null }, band: null },
      { label: "Sep ’26", values: { median: 110000.25, country_median: 105000 }, band: [90000, 130000.5] },
    ]);
  });

  it("returns null when the API gave no single-group amounts", () => {
    expect(payRangeTrend([point("2026-09", null, 12)])).toBeNull();
    expect(payRangeTrend([])).toBeNull();
  });
});

describe("headcountTrend", () => {
  it("plots matching employees at each month end", () => {
    expect(headcountTrend([point("2026-09", null, 12), point("2026-10", null, 14)])).toEqual([
      { label: "Sep ’26", values: { employees: 12 } },
      { label: "Oct ’26", values: { employees: 14 } },
    ]);
  });
});

const engineeringIndia: BenchmarkGroup = { work_country_code: "IN", department_id: "engineering", salary_currency_code: "INR" };
const summaryOf = (group: BenchmarkGroup | null, trend: BenchmarkPoint[]) => ({
  snapshot_date: "2026-10-15",
  employee_count: trend.at(-1)?.employee_count ?? 0,
  by_country: [],
  group,
  trend,
});

describe("singleGroup", () => {
  it("is the summary's group with its median at the final snapshot", () => {
    const summary = summaryOf(engineeringIndia, [point("2026-09", "100000.00"), point("2026-10", "101000.00")]);

    expect(singleGroup(summary)).toEqual({ group: engineeringIndia, finalMedian: "101000.00" });
  });

  it("keeps the group without a median when nobody in it is active at the final snapshot", () => {
    const summary = summaryOf(engineeringIndia, [point("2026-09", "100000.00"), point("2026-10", null, 0)]);

    expect(singleGroup(summary)).toEqual({ group: engineeringIndia, finalMedian: null });
  });

  it("is null when several groups match, whatever the trend holds", () => {
    expect(singleGroup(summaryOf(null, [point("2026-10", null, 12)]))).toBeNull();
    expect(singleGroup(summaryOf(null, []))).toBeNull();
  });
});
