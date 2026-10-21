import { divideRounded, fromMinorUnits, toMinorUnits } from "@/lib/money";

/** A pay change in one currency: the signed difference and the signed percentage of current pay, both to 2 places. */
export type SalaryDelta = { change: string; percent: string };

type Pay = { annual_base_pay: string; salary_currency_code: string };

/**
 * The change from current to new pay, for the salary form. Null across currencies (no conversion) and while the new
 * amount is not a positive amount with at most two decimals.
 */
export function salaryDelta(current: Pay, next: Pay): SalaryDelta | null {
  if (next.salary_currency_code !== current.salary_currency_code) return null;
  const from = toMinorUnits(current.annual_base_pay);
  const to = toMinorUnits(next.annual_base_pay);
  if (from === null || to === null || from <= 0n || to <= 0n) return null;
  const change = to - from;
  // Percent in hundredths: change / from × 100 × 100, rounded half away from zero.
  const hundredths = divideRounded(change * 10_000n, from);
  return { change: fromMinorUnits(change), percent: fromMinorUnits(hundredths) };
}
