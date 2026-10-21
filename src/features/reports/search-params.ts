// The report URL mechanism shared by every report: filter params, period validation and the filter form → URL patch.
// Each report with a period owns its defaults and URL schema in its own folder's search-params.ts.
import { z } from "zod";
import { Paging } from "@/contracts/paging";
import { periodEndError, ReportFilters } from "@/contracts/reports/filters";
import { addMonths, monthStart } from "@/lib/dates";

/**
 * The filter controls a report shows: `dates` is a revision date range (salary growth), `months` a month range ending
 * at a final snapshot date (historical benchmark).
 */
export type ReportFilterField = "dates" | "months" | "country" | "department" | "currency";

/**
 * The country, department and currency filter params, each falling back to none when malformed. The one list of code
 * filters: commitment and the benchmark use all of them, growth picks its contract's (country, department).
 */
export const filterParams = z.object({
  work_country_code: ReportFilters.shape.work_country_code.catch(undefined),
  department_id: ReportFilters.shape.department_id.catch(undefined),
  salary_currency_code: ReportFilters.shape.salary_currency_code.catch(undefined),
});

/** The page cursor param, dropped when malformed. */
export const cursorParam = Paging.shape.cursor.catch(undefined);

/** Search params a report filter writes: the period and the code filters. Patching any of them drops the cursor. */
const filterKeys = ["from", "to", ...filterParams.keyof().options] as const;
export type FilterParam = (typeof filterKeys)[number];
export type FilterValues = Partial<Record<FilterParam, string>>;
export type Period = { from: string; to: string };
export type PeriodErrors = Partial<Record<keyof Period, string>>;
/** A report's input contract, whose `from`/`to` rules check its period (each period report passes its own). */
export type PeriodContract = z.ZodType<unknown, Period>;

/** Every filter param unset: the report's defaults. */
export const clearedFilters: Partial<Record<FilterParam, undefined>> = {};
for (const key of filterKeys) clearedFilters[key] = undefined;

/** The filter params among a report's URL state (what its filter form shows). */
export function appliedFilters(params: FilterValues): FilterValues {
  const applied: FilterValues = {};
  for (const key of filterKeys) applied[key] = params[key];
  return applied;
}

/** Salary commitment and department breakdown URL → input: country, department, currency and page cursor. */
export const reportFilterSearch = filterParams.extend({ cursor: cursorParam });

/** `months` calendar months ending with today's: from the first day of the earliest month through today. */
export function trailingMonths(today: string, months: number): Period {
  return { from: monthStart(addMonths(monthStart(today), 1 - months)), to: today };
}

/** A period's errors keyed by field: the report contract's range rules, plus `to` no later than today. */
export function periodErrors(contract: PeriodContract, period: Period, today: string): PeriodErrors {
  const errors: PeriodErrors = {};
  const result = contract.safeParse(period);
  for (const issue of result.error?.issues ?? []) {
    const key = issue.path[0];
    if ((key === "from" || key === "to") && !errors[key]) errors[key] = issue.message;
  }
  const toError = errors.to ? undefined : periodEndError(period.to, today);
  if (toError) errors.to = toError;
  return errors;
}

/** The period when it is valid, else the default one (a hand-edited URL never reaches the API invalid). */
export function validPeriod<S extends Period>(
  contract: PeriodContract,
  search: S,
  fallback: Period,
  today: string,
): S {
  return Object.keys(periodErrors(contract, search, today)).length === 0 ? search : { ...search, ...fallback };
}

/**
 * The filter form's submitted fields → a URL patch, or the period's errors (checked against `period`, the report's
 * contract, when it shows a period). A blank select means "all"; the pickers submit ISO dates (a month as its first day).
 */
export function readFilterForm(
  fields: readonly ReportFilterField[],
  form: Readonly<Record<string, string>>,
  today: string,
  period?: PeriodContract,
): { patch: FilterValues; errors: PeriodErrors } {
  const patch: FilterValues = {};
  if (fields.includes("country")) patch.work_country_code = form.work_country_code ?? "";
  if (fields.includes("department")) patch.department_id = form.department_id ?? "";
  if (fields.includes("currency")) patch.salary_currency_code = form.salary_currency_code ?? "";
  const field = fields.includes("dates") ? "dates" : fields.includes("months") ? "months" : null;
  if (!field) return { patch, errors: {} };
  if (!period) throw new Error(`A report with a ${field} filter passes its period contract`);
  const values = { from: form.from ?? "", to: form.to ?? "" };
  return { patch: { ...patch, ...values }, errors: periodErrors(period, values, today) };
}
