import { sql } from "drizzle-orm";
import type { KeysetFrom } from "@/contracts/paging";
import type {
  CountrySummary,
  DepartmentBreakdownRow,
  DepartmentBreakdownSummary,
  DepartmentPoint,
} from "@/contracts/reports/department-breakdown";
import type { ReportFilters } from "@/contracts/reports/filters";
import type { Executor } from "@/server/db/connect";
import { employees } from "@/server/db/schema";
import { activeAndMatching } from "@/server/reports/filters";
import { keyOrder, pastKey } from "@/server/reports/keyset";

// Employees active today with their current pay, grouped by work country, department and salary currency.

export type DepartmentKey = readonly [work_country_code: string, department_id: string, salary_currency_code: string];

const departmentKey = [employees.work_country_code, employees.department_id, employees.salary_currency_code] as const;

const payTotals = sql`count(*)::int as employee_count,
  sum(${employees.annual_base_pay})::text as total_annual_base_pay,
  round(avg(${employees.annual_base_pay}), 2)::text as average_annual_base_pay`;

/** One page of country/department/currency rows after (or before) `from`, in key order (reversed when `from.before`). */
export async function selectDepartmentRows(
  db: Executor,
  filters: ReportFilters,
  today: string,
  from: KeysetFrom<DepartmentKey>,
  take: number,
): Promise<DepartmentBreakdownRow[]> {
  const { rows } = await db.execute<DepartmentBreakdownRow>(sql`
    select ${employees.work_country_code} as work_country_code, ${employees.department_id} as department_id,
           ${employees.salary_currency_code} as salary_currency_code, ${payTotals}
    from ${employees}
    where ${activeAndMatching(filters, today)} and ${pastKey(departmentKey, from)}
    group by ${sql.join([...departmentKey], sql`, `)}
    order by ${keyOrder(departmentKey, from)}
    limit ${take}`);
  return rows;
}

export async function countDepartmentRows(db: Executor, filters: ReportFilters, today: string): Promise<number> {
  const { rows } = await db.execute<{ total: number }>(sql`
    select count(distinct (${sql.join([...departmentKey], sql`, `)}))::int as total
    from ${employees}
    where ${activeAndMatching(filters, today)}`);
  return rows[0]?.total ?? 0;
}

/**
 * Headcount, country/currency totals and averages, and the department chart over every matching active employee.
 * A department's total is null unless all matching employees share one country and currency.
 */
export async function selectDepartmentSummary(
  db: Executor,
  filters: ReportFilters,
  today: string,
): Promise<DepartmentBreakdownSummary> {
  const matching = activeAndMatching(filters, today);
  const [headcount, byCountry, byDepartment] = await Promise.all([
    db.execute<{ employee_count: number }>(sql`
      select count(*)::int as employee_count from ${employees} where ${matching}`),
    db.execute<CountrySummary>(sql`
      select ${employees.work_country_code} as work_country_code,
             ${employees.salary_currency_code} as salary_currency_code, ${payTotals}
      from ${employees}
      where ${matching}
      group by ${employees.work_country_code}, ${employees.salary_currency_code}
      order by ${employees.work_country_code}, ${employees.salary_currency_code}`),
    db.execute<DepartmentPoint>(sql`
      select ${employees.department_id} as department_id, count(*)::int as employee_count,
             case when (select count(distinct (${employees.work_country_code}, ${employees.salary_currency_code}))
                        from ${employees} where ${matching}) = 1
                  then sum(${employees.annual_base_pay})::text end as total_annual_base_pay
      from ${employees}
      where ${matching}
      group by ${employees.department_id}
      order by ${employees.department_id}`),
  ]);
  return {
    employee_count: headcount.rows[0]?.employee_count ?? 0,
    by_country: byCountry.rows,
    by_department: byDepartment.rows,
  };
}
