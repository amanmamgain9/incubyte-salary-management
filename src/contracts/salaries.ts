import { z } from "zod";
import { page, Paging } from "@/contracts/paging";
import {
  CountryCode,
  CurrencyCode,
  Decimal,
  DepartmentId,
  EmployeeId,
  Money,
  Timestamp,
} from "@/contracts/primitives";

/** Why the pay changed, recorded on the history entry. */
export const SalaryReason = z.string().trim().min(1, "Enter a reason").max(500);

/**
 * `salaries.update` input: the new pay (any known currency; no conversion) and the `salary_revision` the form was
 * loaded at. A stale `expected_revision` is CONFLICT.
 */
export const UpdateSalaryInput = z.object({
  employee_id: EmployeeId,
  expected_revision: z.int().min(1),
  annual_base_pay: Money,
  salary_currency_code: CurrencyCode,
  reason: SalaryReason,
});
export type UpdateSalaryInput = z.infer<typeof UpdateSalaryInput>;

/** One salary history entry with the acting HR user's name; country and department are as at the change. */
export const HistoryView = z.object({
  id: z.string(),
  employee_id: EmployeeId,
  revision: z.int().min(1),
  annual_base_pay: Decimal,
  currency_code: CurrencyCode,
  work_country_code_at_change: CountryCode,
  department_id_at_change: DepartmentId,
  changed_by: z.string(),
  changed_by_name: z.string(),
  changed_at: Timestamp,
  reason: z.string(),
});
export type HistoryView = z.infer<typeof HistoryView>;

/** `salaries.history` input: one employee's history, newest revision first. */
export const SalaryHistoryInput = z.object({ employee_id: EmployeeId, ...Paging.shape });
export type SalaryHistoryInput = z.infer<typeof SalaryHistoryInput>;

export const SalaryHistoryOutput = page(HistoryView);
export type SalaryHistoryOutput = z.infer<typeof SalaryHistoryOutput>;
