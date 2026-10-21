import type { LinePoint } from "@/components/charts/line-chart";
import type { BenchmarkPoint } from "@/contracts/reports/historical-salary-benchmark";
import { formatMonth } from "@/lib/format";
import { toChartNumber } from "@/lib/money";

const chartValue = (amount: string | null) => (amount === null ? null : toChartNumber(amount));

/**
 * The pay-range trend (median, country median, P10–P90 band per month), or null unless the API set the single-group
 * amounts, i.e. every matching row shares one country, department and currency. Months without them stay gaps.
 */
export function payRangeTrend(trend: readonly BenchmarkPoint[]): LinePoint[] | null {
  if (!trend.some((point) => point.median_annual_base_pay !== null)) return null;
  return trend.map((point) => ({
    label: formatMonth(point.month, "short"),
    values: {
      median: chartValue(point.median_annual_base_pay),
      country_median: chartValue(point.country_median_annual_base_pay),
    },
    band:
      point.p10_annual_base_pay === null || point.p90_annual_base_pay === null
        ? null
        : [toChartNumber(point.p10_annual_base_pay), toChartNumber(point.p90_annual_base_pay)],
  }));
}

/** Matching employees at each month end, for the overview when several groups match. */
export function headcountTrend(trend: readonly BenchmarkPoint[]): LinePoint[] {
  return trend.map((point) => ({ label: formatMonth(point.month, "short"), values: { employees: point.employee_count } }));
}

/** The single group's median at the final snapshot, or null (several groups, or none in the final month). */
export function finalMedian(trend: readonly BenchmarkPoint[]): string | null {
  return trend.at(-1)?.median_annual_base_pay ?? null;
}
