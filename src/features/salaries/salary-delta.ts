/** A pay change in one currency: the signed difference and the signed percentage of current pay, both to 2 places. */
export type SalaryDelta = { change: string; percent: string };

type Pay = { annual_base_pay: string; salary_currency_code: string };

/**
 * The change from current to new pay, for the salary form. Null across currencies (no conversion) and while the new
 * amount is not a positive amount with at most two decimals.
 */
export function salaryDelta(_current: Pay, _next: Pay): SalaryDelta | null {
  throw new Error("not implemented");
}
