import { z } from "zod";
import { IsoDate } from "@/contracts/primitives";
import { filterParams, trailingMonths, validPeriod } from "@/features/reports/search-params";
import { monthStart } from "@/lib/dates";

/** Months the report shows by default, ending this month with today's final snapshot. */
const DEFAULT_MONTHS = 24;

/**
 * Historical benchmark URL → input: months (default: the 24 months ending today; `from` moved to its month's start),
 * filters, cursor.
 */
export function historicalSalaryBenchmarkSearch(today: string) {
  const fallback = trailingMonths(today, DEFAULT_MONTHS);
  return z
    .object({
      from: IsoDate.transform(monthStart).catch(fallback.from),
      to: IsoDate.catch(fallback.to),
      ...filterParams,
    })
    .transform((search) => validPeriod("months", search, fallback, today));
}
