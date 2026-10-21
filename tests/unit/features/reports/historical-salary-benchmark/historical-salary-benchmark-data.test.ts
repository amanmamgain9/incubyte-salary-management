import { describe, expect, it } from "vitest";
import type { BenchmarkPoint } from "@/contracts/reports/historical-salary-benchmark";
import {
  finalMedian,
  headcountTrend,
  payRangeTrend,
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

describe("finalMedian", () => {
  it("is the final month's single-group median", () => {
    expect(finalMedian([point("2026-09", "100000.00"), point("2026-10", "101000.00")])).toBe("101000.00");
  });

  it("is null without a single group in the final month", () => {
    expect(finalMedian([point("2026-10", null)])).toBeNull();
    expect(finalMedian([])).toBeNull();
  });
});
