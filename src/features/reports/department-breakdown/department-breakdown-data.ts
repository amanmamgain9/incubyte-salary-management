import type { BarDatum } from "@/components/charts/bar-chart";
import type { MiniBar } from "@/components/charts/mini-bars";
import type { CountrySummary, DepartmentPoint } from "@/contracts/reports/department-breakdown";
import { formatCompact, formatCount } from "@/lib/format";
import { toChartNumber } from "@/lib/money";

const MAX_DEPARTMENT_BARS = 7;

/** The only country/currency group when every matching employee shares one; its totals are then the report's. */
export function singleGroup(byCountry: readonly CountrySummary[]): CountrySummary | null {
  return byCountry.length === 1 ? (byCountry[0] ?? null) : null;
}

/** Distinct countries among the country/currency groups. */
export function countryCount(byCountry: readonly CountrySummary[]): number {
  return new Set(byCountry.map((group) => group.work_country_code)).size;
}

/** "Employees by department" for the overview: largest first (ties by ID). */
export function departmentBars(
  byDepartment: readonly DepartmentPoint[],
  departmentName: (id: string) => string,
): MiniBar[] {
  return [...byDepartment]
    .sort((a, b) => b.employee_count - a.employee_count || a.department_id.localeCompare(b.department_id))
    .slice(0, MAX_DEPARTMENT_BARS)
    .map((point) => ({
      label: departmentName(point.department_id),
      value: point.employee_count,
      description: `${departmentName(point.department_id)}: ${formatCount(point.employee_count)}`,
    }));
}

/**
 * The department comparison (annual base pay per department, in API order), or null unless the API gave every
 * department a total, i.e. all matching employees share one country and currency.
 */
export function departmentComparison(
  byDepartment: readonly DepartmentPoint[],
  departmentName: (id: string) => string,
  currency: string,
): BarDatum[] | null {
  if (byDepartment.length === 0) return null;
  const bars: BarDatum[] = [];
  for (const point of byDepartment) {
    if (point.total_annual_base_pay === null) return null;
    bars.push({
      label: departmentName(point.department_id),
      value: toChartNumber(point.total_annual_base_pay),
      display: `${formatCompact(point.total_annual_base_pay)} ${currency}`,
      tone: "accent",
    });
  }
  return bars;
}
