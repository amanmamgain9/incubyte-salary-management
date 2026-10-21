import { z } from "zod";
import { page, Paging } from "@/contracts/paging";
import {
  CountryCode,
  CurrencyCode,
  Decimal,
  DepartmentId,
  MAX_COUNTRY_CURRENCY_PAIRS,
  MAX_DEPARTMENTS,
} from "@/contracts/primitives";
import { ReportFilters } from "@/contracts/reports/filters";

/** `reports.departmentBreakdown` input: employees active today (UTC), filtered by country, department and currency. */
export const DepartmentBreakdownInput = z.object({ ...ReportFilters.shape, ...Paging.shape });
export type DepartmentBreakdownInput = z.infer<typeof DepartmentBreakdownInput>;

/** Headcount, total and average (two places, from matching employees) of one country/currency group. */
export const CountrySummary = z.object({
  work_country_code: CountryCode,
  salary_currency_code: CurrencyCode,
  employee_count: z.int().min(1),
  total_annual_base_pay: Decimal,
  average_annual_base_pay: Decimal,
});
export type CountrySummary = z.infer<typeof CountrySummary>;

/** One work country, department and salary currency. */
export const DepartmentBreakdownRow = CountrySummary.extend({ department_id: DepartmentId });
export type DepartmentBreakdownRow = z.infer<typeof DepartmentBreakdownRow>;

/**
 * Department comparison chart point. `total_annual_base_pay` is null unless every matching employee shares one
 * country and currency, so the chart never combines currencies.
 */
export const DepartmentPoint = z.object({
  department_id: DepartmentId,
  employee_count: z.int().min(1),
  total_annual_base_pay: Decimal.nullable(),
});
export type DepartmentPoint = z.infer<typeof DepartmentPoint>;

/** Over every matching active employee; `by_country` is country, currency ascending; `by_department` department ascending. */
export const DepartmentBreakdownSummary = z.object({
  employee_count: z.int().min(0),
  by_country: z.array(CountrySummary).max(MAX_COUNTRY_CURRENCY_PAIRS),
  by_department: z.array(DepartmentPoint).max(MAX_DEPARTMENTS),
});
export type DepartmentBreakdownSummary = z.infer<typeof DepartmentBreakdownSummary>;

/** Rows ordered by country, department, currency. */
export const DepartmentBreakdownOutput = z.object({
  rows: page(DepartmentBreakdownRow),
  summary: DepartmentBreakdownSummary,
});
export type DepartmentBreakdownOutput = z.infer<typeof DepartmentBreakdownOutput>;
