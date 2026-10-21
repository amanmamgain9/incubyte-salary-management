// Product defaults that depend on the date: always functions of `today` (a UTC `YYYY-MM-DD`), never hardcoded dates.
import { addMonths, monthStart } from "@/lib/dates";

export type Period = { from: string; to: string };

/** Months the salary growth report shows by default: one year, the span of its net change trend. */
export const GROWTH_DEFAULT_MONTHS = 12;
/** Months the historical salary benchmark shows by default. */
export const BENCHMARK_DEFAULT_MONTHS = 24;

/** `months` calendar months ending with today's: from the first day of the earliest month through today. */
function monthsEndingToday(today: string, months: number): Period {
  return { from: monthStart(addMonths(monthStart(today), 1 - months)), to: today };
}

/** Salary growth's default revision period: the 12 months ending this month, through today. */
export function defaultGrowthPeriod(today: string): Period {
  return monthsEndingToday(today, GROWTH_DEFAULT_MONTHS);
}

/** Historical benchmark's default snapshot range: the 24 months ending this month, with today's final snapshot. */
export function defaultBenchmarkPeriod(today: string): Period {
  return monthsEndingToday(today, BENCHMARK_DEFAULT_MONTHS);
}
