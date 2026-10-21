import { formatMoney, formatPercent } from "@/lib/format";
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

/** The live note under the salary form's amount; `tone` colours an increase or decrease. */
export type SalaryDeltaNote = { text: string; tone: "positive" | "negative" | "neutral" };

/**
 * What the new pay means against current pay: the signed percentage and exact change in one currency, a currency
 * switch (never converted), or null while the new amount is not a valid amount.
 */
export function salaryDeltaNote(current: Pay, next: Pay): SalaryDeltaNote | null {
  if (next.salary_currency_code !== current.salary_currency_code) {
    return { text: "Currency change · no automatic conversion", tone: "neutral" };
  }
  const delta = salaryDelta(current, next);
  if (!delta) return null;
  const change = toMinorUnits(delta.change) ?? 0n;
  if (change === 0n) return { text: "Same as current pay", tone: "neutral" };
  const amount = formatMoney(delta.change.replace(/^-/, ""), current.salary_currency_code);
  return change > 0n
    ? { text: `${formatPercent(delta.percent)} · ${amount} increase`, tone: "positive" }
    : { text: `${formatPercent(delta.percent)} · ${amount} decrease`, tone: "negative" };
}
