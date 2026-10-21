import type { DirectorySummary, EmploymentStatus } from "@/contracts/employees";
import type { DirectorySearch } from "@/features/employees/directory/search-params";
import { employmentStatusLabel, employmentStatuses } from "@/features/employees/employment-status-badge";

export type MixSegment = { status: EmploymentStatus; label: string; count: number; percent: number };

/** Active/departed/upcoming shares of all matching employees (0 for every segment when nobody matches). */
export function employmentMix(summary: DirectorySummary): MixSegment[] {
  const counts: Record<EmploymentStatus, number> = {
    active: summary.active_count,
    departed: summary.departed_count,
    upcoming: summary.upcoming_count,
  };
  return employmentStatuses.map(({ status, label }) => ({
    status,
    label,
    count: counts[status],
    percent: summary.employee_count === 0 ? 0 : (counts[status] / summary.employee_count) * 100,
  }));
}

export function hasDirectoryFilters(search: DirectorySearch): boolean {
  return Boolean(search.search || search.department_id || search.work_country_code || search.employment_status);
}

/** The overview's scope line: "All employees", or the active filters, e.g. `India · Engineering · Active · “sha”`. */
export function directoryScope(
  search: DirectorySearch,
  names: { countryName: (code: string) => string; departmentName: (id: string) => string },
): string {
  if (!hasDirectoryFilters(search)) return "All employees";
  return [
    search.work_country_code && names.countryName(search.work_country_code),
    search.department_id && names.departmentName(search.department_id),
    search.employment_status && employmentStatusLabel(search.employment_status),
    search.search && `“${search.search}”`,
  ]
    .filter(Boolean)
    .join(" · ");
}
