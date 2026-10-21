import type { MiniBar } from "@/components/charts/mini-bars";
import type { Page } from "@/contracts/paging";
import type { CountryCount, SalaryCommitmentRow } from "@/contracts/reports/salary-commitment";
import { formatCount } from "@/lib/format";

/** Bars the overview shows at most. */
const MAX_COUNTRY_BARS = 7;

/** "Employees by country": the largest countries first (ties by code), labelled by code. */
export function countryBars(byCountry: readonly CountryCount[], countryName: (code: string) => string): MiniBar[] {
  return [...byCountry]
    .sort((a, b) => b.employee_count - a.employee_count || a.work_country_code.localeCompare(b.work_country_code))
    .slice(0, MAX_COUNTRY_BARS)
    .map((country) => ({
      label: country.work_country_code,
      value: country.employee_count,
      description: `${countryName(country.work_country_code)}: ${formatCount(country.employee_count)}`,
    }));
}

/** The one commitment row when exactly one country/currency matches (its total is then the whole commitment). */
export function singleCommitment(rows: Page<SalaryCommitmentRow>): SalaryCommitmentRow | null {
  return rows.total_count === 1 ? (rows.items[0] ?? null) : null;
}
