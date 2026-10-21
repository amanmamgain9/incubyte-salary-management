import { z } from "zod";
import { page, Paging } from "@/contracts/paging";
import { CountryCode, CurrencyCode, Decimal, MAX_COUNTRIES } from "@/contracts/primitives";
import { ReportFilters } from "@/contracts/reports/filters";

/** `reports.salaryCommitment` input: employees active today (UTC), filtered by country, department and currency. */
export const SalaryCommitmentInput = z.object({ ...ReportFilters.shape, ...Paging.shape });
export type SalaryCommitmentInput = z.infer<typeof SalaryCommitmentInput>;

/** One work country and salary currency: active headcount and a full year at current pay, without prorating. */
export const SalaryCommitmentRow = z.object({
  work_country_code: CountryCode,
  salary_currency_code: CurrencyCode,
  employee_count: z.int().min(1),
  total_annual_base_pay: Decimal,
});
export type SalaryCommitmentRow = z.infer<typeof SalaryCommitmentRow>;

export const CountryCount = z.object({ work_country_code: CountryCode, employee_count: z.int().min(1) });
export type CountryCount = z.infer<typeof CountryCount>;

/** Over every matching active employee, independent of pagination; `by_country` is country ascending. */
export const SalaryCommitmentSummary = z.object({
  employee_count: z.int().min(0),
  currency_count: z.int().min(0),
  by_country: z.array(CountryCount).max(MAX_COUNTRIES),
});
export type SalaryCommitmentSummary = z.infer<typeof SalaryCommitmentSummary>;

/** Rows ordered by country, then currency. */
export const SalaryCommitmentOutput = z.object({ rows: page(SalaryCommitmentRow), summary: SalaryCommitmentSummary });
export type SalaryCommitmentOutput = z.infer<typeof SalaryCommitmentOutput>;
