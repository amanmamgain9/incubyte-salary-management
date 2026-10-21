import { IsoDate } from "@/contracts/primitives";
import { SalaryGrowthInput } from "@/contracts/reports/salary-growth";
import { cursorParam, filterParams, trailingMonths, validPeriod } from "@/features/reports/search-params";

/** Months the report shows by default: one year (the span of its net change trend), ending this month. */
const DEFAULT_MONTHS = 12;

/** Salary growth URL → input: revision dates (default: the 12 months ending today), country, department, cursor. */
export function salaryGrowthSearch(today: string) {
  const fallback = trailingMonths(today, DEFAULT_MONTHS);
  // Revisions carry their country and department, not a currency: the contract has no currency filter.
  return filterParams
    .pick({ work_country_code: true, department_id: true })
    .extend({
      from: IsoDate.catch(fallback.from),
      to: IsoDate.catch(fallback.to),
      cursor: cursorParam,
    })
    .transform((search) => validPeriod(SalaryGrowthInput, search, fallback, today));
}
