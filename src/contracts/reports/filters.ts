import { z } from "zod";
import { CountryCode, CurrencyCode, DepartmentId } from "@/contracts/primitives";

/**
 * The country, department and salary currency filters reports share; each optional (absent = all) and applied
 * together. Unknown codes are BAD_REQUEST (checked by the operation); known codes without matches give empty results.
 */
export const ReportFilters = z.object({
  work_country_code: CountryCode.optional(),
  department_id: DepartmentId.optional(),
  salary_currency_code: CurrencyCode.optional(),
});
export type ReportFilters = z.infer<typeof ReportFilters>;

/**
 * A period that must end today (UTC) or earlier (salary growth, historical benchmark): the error for `to`, or undefined.
 * The operations enforce it and the report filter form checks it before applying.
 */
export function periodEndError(to: string, today: string): string | undefined {
  return to > today ? "Must be today or earlier" : undefined;
}
