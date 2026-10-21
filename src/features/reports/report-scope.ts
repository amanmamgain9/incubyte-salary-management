import type { FilterValues } from "@/features/reports/search-params";
import type { LookupNames } from "@/hooks/use-lookups";


/** A report overview's scope line from its filters, e.g. "India · All departments · USD" ("All …" when unset). */
export function reportScope(filters: FilterValues, names: LookupNames): string {
  return [
    filters.work_country_code ? names.countryName(filters.work_country_code) : "All countries",
    filters.department_id ? names.departmentName(filters.department_id) : "All departments",
    filters.salary_currency_code,
  ]
    .filter(Boolean)
    .join(" · ");
}
