import { z } from "zod";
import { page, Paging } from "@/contracts/paging";
import {
  CountryCode,
  CurrencyCode,
  Decimal,
  IsoDate,
  MAX_COUNTRY_CURRENCY_PAIRS,
  MAX_GROWTH_TREND_POINTS,
  Month,
} from "@/contracts/primitives";
import { ReportFilters } from "@/contracts/reports/filters";

/**
 * `reports.salaryGrowth` input: revisions whose UTC date falls in `from`–`to` (inclusive), filtered by the country and
 * department saved with each revision. `to` no later than today (UTC) is checked by the operation.
 */
export const SalaryGrowthInput = z
  .object({
    from: IsoDate,
    to: IsoDate,
    ...ReportFilters.pick({ work_country_code: true, department_id: true }).shape,
    ...Paging.shape,
  })
  .refine(({ from, to }) => from <= to, { path: ["to"], message: "Must be on or after the start date" });
export type SalaryGrowthInput = z.infer<typeof SalaryGrowthInput>;

/**
 * Pay changes of one country and (new) currency's revisions: positive increase and decrease magnitudes against each
 * revision's preceding entry, `net_change = increases - decreases`. Currency switches are counted, not amounted.
 */
export const GrowthTotal = z.object({
  work_country_code: CountryCode,
  salary_currency_code: CurrencyCode,
  increases: Decimal,
  decreases: Decimal,
  net_change: Decimal,
  currency_switch_count: z.int().min(0),
});
export type GrowthTotal = z.infer<typeof GrowthTotal>;

/** One UTC month of one country and currency. */
export const SalaryGrowthRow = GrowthTotal.extend({ month: Month });
export type SalaryGrowthRow = z.infer<typeof SalaryGrowthRow>;

/** Net change trend point: every month of the period's last 12 for each `by_country` group, zero without revisions. */
export const GrowthPoint = z.object({
  month: Month,
  work_country_code: CountryCode,
  salary_currency_code: CurrencyCode,
  net_change: Decimal,
});
export type GrowthPoint = z.infer<typeof GrowthPoint>;

/** Period totals by country and currency (ascending), all switches, and the trend (country, currency, month ascending). */
export const SalaryGrowthSummary = z.object({
  by_country: z.array(GrowthTotal).max(MAX_COUNTRY_CURRENCY_PAIRS),
  currency_switch_count: z.int().min(0),
  trend: z.array(GrowthPoint).max(MAX_GROWTH_TREND_POINTS),
});
export type SalaryGrowthSummary = z.infer<typeof SalaryGrowthSummary>;

/** Rows ordered by month, country, currency. */
export const SalaryGrowthOutput = z.object({ rows: page(SalaryGrowthRow), summary: SalaryGrowthSummary });
export type SalaryGrowthOutput = z.infer<typeof SalaryGrowthOutput>;
