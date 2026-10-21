import { z } from "zod";
import { CurrencyCode, EmployeeId, Money } from "@/contracts/primitives";

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
