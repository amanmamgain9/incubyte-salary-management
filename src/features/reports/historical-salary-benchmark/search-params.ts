import { IsoDate } from "@/contracts/primitives";
import { HistoricalSalaryBenchmarkInput } from "@/contracts/reports/historical-salary-benchmark";
import { cursorParam, filterParams, trailingMonths, validPeriod } from "@/features/reports/search-params";
import { monthStart } from "@/lib/dates";

/** Months the report shows by default, ending this month with today's final snapshot. */
const DEFAULT_MONTHS = 24;

/**
 * Historical benchmark URL → input: months (default: the 24 months ending today; `from` moved to its month's start),
 * filters, cursor.
 */
export function historicalSalaryBenchmarkSearch(today: string) {
  const fallback = trailingMonths(today, DEFAULT_MONTHS);
  return filterParams
    .extend({
      from: IsoDate.transform(monthStart).catch(fallback.from),
      to: IsoDate.catch(fallback.to),
      cursor: cursorParam,
    })
    .transform((search) => validPeriod(HistoricalSalaryBenchmarkInput, search, fallback, today));
}
