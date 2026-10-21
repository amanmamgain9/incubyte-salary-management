import { z } from "zod";
import { page, Paging } from "@/contracts/paging";
import {
  CountryCode,
  CurrencyCode,
  Decimal,
  DepartmentId,
  IsoDate,
  MAX_BENCHMARK_MONTHS,
  MAX_COUNTRY_CURRENCY_PAIRS,
  Month,
} from "@/contracts/primitives";
import { ReportFilters } from "@/contracts/reports/filters";
import { monthsBetween } from "@/lib/dates";

/**
 * `reports.historicalSalaryBenchmark` input: month-end snapshots from `from` (a month's first day) through `to` (the
 * final, possibly partial, month's snapshot date), at most 180 months; `to` no later than today (UTC) is checked by the
 * operation. Filters apply to the country, department and currency saved with each snapshot's salary entry.
 */
export const HistoricalSalaryBenchmarkInput = z
  .object({ from: IsoDate, to: IsoDate, ...ReportFilters.shape, ...Paging.shape })
  .refine(({ from }) => from.endsWith("-01"), { path: ["from"], message: "Use the first day of a month" })
  .refine(({ from, to }) => from <= to, { path: ["to"], message: "Must be on or after the start date" })
  .refine(({ from, to }) => monthsBetween(from, to) < MAX_BENCHMARK_MONTHS, {
    path: ["to"],
    message: `Choose at most ${MAX_BENCHMARK_MONTHS} months`,
  });
export type HistoricalSalaryBenchmarkInput = z.infer<typeof HistoricalSalaryBenchmarkInput>;

/**
 * One month's snapshot of a country, department and currency. Amounts use exact interpolated percentiles rounded to
 * two places. The country median spans every department of the country/currency; `median_gap_percent` is the
 * department median's difference from it and `median_yoy_percent` the change from the same group 12 months earlier
 * (null without that group). Percentages are signed, two places.
 */
export const HistoricalSalaryBenchmarkRow = z.object({
  month: Month,
  work_country_code: CountryCode,
  department_id: DepartmentId,
  salary_currency_code: CurrencyCode,
  employee_count: z.int().min(1),
  total_annual_base_pay: Decimal,
  p10_annual_base_pay: Decimal,
  median_annual_base_pay: Decimal,
  p90_annual_base_pay: Decimal,
  country_median_annual_base_pay: Decimal,
  median_gap_percent: Decimal,
  median_yoy_percent: Decimal.nullable(),
});
export type HistoricalSalaryBenchmarkRow = z.infer<typeof HistoricalSalaryBenchmarkRow>;

/** Final-snapshot headcount and total of one country and currency. */
export const SnapshotTotal = z.object({
  work_country_code: CountryCode,
  salary_currency_code: CurrencyCode,
  employee_count: z.int().min(1),
  total_annual_base_pay: Decimal,
});
export type SnapshotTotal = z.infer<typeof SnapshotTotal>;

/** One benchmark group: a country, department and salary currency. */
export const BenchmarkGroup = z.object({
  work_country_code: CountryCode,
  department_id: DepartmentId,
  salary_currency_code: CurrencyCode,
});
export type BenchmarkGroup = z.infer<typeof BenchmarkGroup>;

/**
 * Pay-range trend point for one visible month. `employee_count` covers every matching group; the amounts are null
 * unless all matching rows share one country, department and currency.
 */
export const BenchmarkPoint = z.object({
  month: Month,
  employee_count: z.int().min(0),
  p10_annual_base_pay: Decimal.nullable(),
  median_annual_base_pay: Decimal.nullable(),
  p90_annual_base_pay: Decimal.nullable(),
  country_median_annual_base_pay: Decimal.nullable(),
});
export type BenchmarkPoint = z.infer<typeof BenchmarkPoint>;

/**
 * The final snapshot (`to`) by country and currency (ascending), the trend (month ascending; empty without rows) and
 * the only matching group when every matching row in the range shares one (the trend's amounts are then its), else null.
 */
export const HistoricalSalaryBenchmarkSummary = z.object({
  snapshot_date: IsoDate,
  employee_count: z.int().min(0),
  by_country: z.array(SnapshotTotal).max(MAX_COUNTRY_CURRENCY_PAIRS),
  group: BenchmarkGroup.nullable(),
  trend: z.array(BenchmarkPoint).max(MAX_BENCHMARK_MONTHS),
});
export type HistoricalSalaryBenchmarkSummary = z.infer<typeof HistoricalSalaryBenchmarkSummary>;

/** Rows ordered by month, country, department, currency. */
export const HistoricalSalaryBenchmarkOutput = z.object({
  rows: page(HistoricalSalaryBenchmarkRow),
  summary: HistoricalSalaryBenchmarkSummary,
});
export type HistoricalSalaryBenchmarkOutput = z.infer<typeof HistoricalSalaryBenchmarkOutput>;
