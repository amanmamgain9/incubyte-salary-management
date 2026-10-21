import { sql } from "drizzle-orm";
import type { KeysetFrom } from "@/contracts/paging";
import type { ReportFilters } from "@/contracts/reports/filters";
import type { SalaryCommitmentRow, SalaryCommitmentSummary } from "@/contracts/reports/salary-commitment";
import type { Executor } from "@/server/db/connect";
import { employees } from "@/server/db/schema";
import { activeAndMatching } from "@/server/reports/filters";
import { keyOrder, pastKey } from "@/server/reports/keyset";

// Employees active today with their current pay, grouped by work country and salary currency.

export type CommitmentKey = readonly [work_country_code: string, salary_currency_code: string];

const commitmentKey = [employees.work_country_code, employees.salary_currency_code] as const;

/** One page of country/currency rows after (or before) `from`, in key order (reversed when `from.before`). */
export async function selectCommitmentRows(
  db: Executor,
  filters: ReportFilters,
  today: string,
  from: KeysetFrom<CommitmentKey>,
  take: number,
): Promise<SalaryCommitmentRow[]> {
  const { rows } = await db.execute<SalaryCommitmentRow>(sql`
    select ${employees.work_country_code} as work_country_code,
           ${employees.salary_currency_code} as salary_currency_code,
           count(*)::int as employee_count,
           sum(${employees.annual_base_pay})::text as total_annual_base_pay
    from ${employees}
    where ${activeAndMatching(filters, today)} and ${pastKey(commitmentKey, from)}
    group by ${employees.work_country_code}, ${employees.salary_currency_code}
    order by ${keyOrder(commitmentKey, from)}
    limit ${take}`);
  return rows;
}

export async function countCommitmentRows(db: Executor, filters: ReportFilters, today: string): Promise<number> {
  const { rows } = await db.execute<{ total: number }>(sql`
    select count(distinct (${employees.work_country_code}, ${employees.salary_currency_code}))::int as total
    from ${employees}
    where ${activeAndMatching(filters, today)}`);
  return rows[0]?.total ?? 0;
}

/** Headcount and currency count over every matching active employee, and headcount by country (ascending). */
export async function selectCommitmentSummary(
  db: Executor,
  filters: ReportFilters,
  today: string,
): Promise<SalaryCommitmentSummary> {
  const [totals, byCountry] = await Promise.all([
    db.execute<{ employee_count: number; currency_count: number }>(sql`
      select count(*)::int as employee_count, count(distinct ${employees.salary_currency_code})::int as currency_count
      from ${employees}
      where ${activeAndMatching(filters, today)}`),
    db.execute<SalaryCommitmentSummary["by_country"][number]>(sql`
      select ${employees.work_country_code} as work_country_code, count(*)::int as employee_count
      from ${employees}
      where ${activeAndMatching(filters, today)}
      group by ${employees.work_country_code}
      order by ${employees.work_country_code}`),
  ]);
  const { employee_count = 0, currency_count = 0 } = totals.rows[0] ?? {};
  return { employee_count, currency_count, by_country: byCountry.rows };
}
