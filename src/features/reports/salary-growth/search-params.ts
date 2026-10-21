import { z } from "zod";
import { IsoDate } from "@/contracts/primitives";
import { SalaryGrowthInput } from "@/contracts/reports/salary-growth";
import { filterParams, trailingMonths, validPeriod } from "@/features/reports/search-params";

/** Months the report shows by default: one year (the span of its net change trend), ending this month. */
const DEFAULT_MONTHS = 12;

/** Salary growth URL → input: revision dates (default: the 12 months ending today), country, department, cursor. */
export function salaryGrowthSearch(today: string) {
  const fallback = trailingMonths(today, DEFAULT_MONTHS);
  return z
    .object({
      from: IsoDate.catch(fallback.from),
      to: IsoDate.catch(fallback.to),
      work_country_code: filterParams.work_country_code,
      department_id: filterParams.department_id,
      cursor: filterParams.cursor,
    })
    .transform((search) => validPeriod(SalaryGrowthInput, search, fallback, today));
}
