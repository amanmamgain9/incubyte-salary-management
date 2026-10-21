import { z } from "zod";
import { Paging } from "@/contracts/paging";
import { IsoDate } from "@/contracts/primitives";
import { ReportFilters } from "@/contracts/reports/filters";
import { HistoricalSalaryBenchmarkInput } from "@/contracts/reports/historical-salary-benchmark";
import { SalaryGrowthInput } from "@/contracts/reports/salary-growth";
import { monthStart } from "@/lib/dates";
import { defaultBenchmarkPeriod, defaultGrowthPeriod, type Period } from "@/lib/product-defaults";

/**
 * The filter controls a report shows: `dates` is a revision date range (salary growth), `months` a month range ending
 * at a final snapshot date (historical benchmark).
 */
export type ReportFilterField = "dates" | "months" | "country" | "department" | "currency";

/** Search params a report filter writes; patching any of them drops the page cursor. */
export type FilterParam = "from" | "to" | "work_country_code" | "department_id" | "salary_currency_code";
export type FilterValues = Partial<Record<FilterParam, string>>;
export type PeriodErrors = Partial<Record<keyof Period, string>>;

/** Every filter param unset: the report's defaults. */
export const clearedFilters: Record<FilterParam, undefined> = {
  from: undefined,
  to: undefined,
  work_country_code: undefined,
  department_id: undefined,
  salary_currency_code: undefined,
};

const params = {
  work_country_code: ReportFilters.shape.work_country_code.catch(undefined),
  department_id: ReportFilters.shape.department_id.catch(undefined),
  salary_currency_code: ReportFilters.shape.salary_currency_code.catch(undefined),
  cursor: Paging.shape.cursor.catch(undefined),
};

/** Salary commitment and department breakdown URL → input: country, department, currency and page cursor. */
export const reportFilterSearch = z.object(params);

const periodContracts = { dates: SalaryGrowthInput, months: HistoricalSalaryBenchmarkInput } as const;
type PeriodField = keyof typeof periodContracts;

/** A period's errors keyed by field: the report contract's range rules, plus `to` no later than today. */
export function periodErrors(field: PeriodField, period: Period, today: string): PeriodErrors {
  const errors: PeriodErrors = {};
  const result = periodContracts[field].safeParse(period);
  for (const issue of result.error?.issues ?? []) {
    const key = issue.path[0];
    if ((key === "from" || key === "to") && !errors[key]) errors[key] = issue.message;
  }
  if (!errors.to && period.to > today) errors.to = "Must be today or earlier";
  return errors;
}

/** The period when it is valid, else the default one (a hand-edited URL never reaches the API invalid). */
function validPeriod<S extends Period>(field: PeriodField, search: S, fallback: Period, today: string): S {
  return Object.keys(periodErrors(field, search, today)).length === 0 ? search : { ...search, ...fallback };
}

/** Salary growth URL → input: revision dates (default: `defaultGrowthPeriod`), country, department, cursor. */
export function salaryGrowthSearch(today: string) {
  const fallback = defaultGrowthPeriod(today);
  return z
    .object({
      from: IsoDate.catch(fallback.from),
      to: IsoDate.catch(fallback.to),
      work_country_code: params.work_country_code,
      department_id: params.department_id,
      cursor: params.cursor,
    })
    .transform((search) => validPeriod("dates", search, fallback, today));
}

/** Historical benchmark URL → input: months (default: `defaultBenchmarkPeriod`; `from` moved to its month's start), filters, cursor. */
export function historicalSalaryBenchmarkSearch(today: string) {
  const fallback = defaultBenchmarkPeriod(today);
  return z
    .object({
      from: IsoDate.transform(monthStart).catch(fallback.from),
      to: IsoDate.catch(fallback.to),
      ...params,
    })
    .transform((search) => validPeriod("months", search, fallback, today));
}

/**
 * The filter form's submitted fields → a URL patch, or the period's errors. A blank select means "all"; a month
 * control's `YYYY-MM` becomes its first day.
 */
export function readFilterForm(
  fields: readonly ReportFilterField[],
  form: Readonly<Record<string, string>>,
  today: string,
): { patch: FilterValues; errors: PeriodErrors } {
  const patch: FilterValues = {};
  if (fields.includes("country")) patch.work_country_code = form.work_country_code ?? "";
  if (fields.includes("department")) patch.department_id = form.department_id ?? "";
  if (fields.includes("currency")) patch.salary_currency_code = form.salary_currency_code ?? "";
  const field = fields.includes("dates") ? "dates" : fields.includes("months") ? "months" : null;
  if (!field) return { patch, errors: {} };
  const from = form.from ?? "";
  const period = { from: field === "months" ? `${from}-01` : from, to: form.to ?? "" };
  return { patch: { ...patch, ...period }, errors: periodErrors(field, period, today) };
}
