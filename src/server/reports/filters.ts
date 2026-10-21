// SQL shared by 2+ report queries: the country/department/currency filter predicate and keyset paging over a report's
// sort key. Script-safe: no `server-only`.
import { type AnyColumn, and, asc, desc, eq, type SQL, sql } from "drizzle-orm";
import type { KeysetFrom } from "@/contracts/paging";
import type { ReportFilters } from "@/contracts/reports/filters";
import { employees, salaryHistory } from "@/server/db/schema";
import { isActiveOn } from "@/server/employees/status";

/** The columns a report filters on, under the filter field names. */
export type FilterColumns = { [Field in keyof ReportFilters]-?: AnyColumn };

/** The employee's current assignment and pay currency (commitment and department reports). */
const currentAssignment: FilterColumns = {
  work_country_code: employees.work_country_code,
  department_id: employees.department_id,
  salary_currency_code: employees.salary_currency_code,
};

/** The assignment and currency saved with a salary history entry (growth and benchmark reports). */
export const assignmentAtChange: FilterColumns = {
  work_country_code: salaryHistory.work_country_code_at_change,
  department_id: salaryHistory.department_id_at_change,
  salary_currency_code: salaryHistory.currency_code,
};

/** SQL: the row matches every submitted filter (absent filters match all); `true` when none is submitted. */
export function matchesFilters(filters: ReportFilters, columns: FilterColumns): SQL {
  const conditions = (Object.keys(columns) as (keyof ReportFilters)[]).map((field) => {
    const value = filters[field];
    return value === undefined ? undefined : eq(columns[field], value);
  });
  return and(...conditions) ?? sql`true`;
}

/** SQL: the employee is active on `today` and matches the filters by current assignment (commitment, departments). */
export function activeAndMatching(filters: ReportFilters, today: string): SQL {
  return sql`${isActiveOn(today)} and ${matchesFilters(filters, currentAssignment)}`;
}

type KeyPart = AnyColumn | SQL;

/** SQL: the row's sort key comes after `from.key` (before it when `from.before`); `true` on the first page. */
export function pastKey(key: readonly KeyPart[], from: KeysetFrom<readonly (string | number)[]>): SQL {
  if (from === null) return sql`true`;
  const columns = sql.join([...key], sql`, `);
  const values = sql.join(
    from.key.map((value) => sql`${value}`),
    sql`, `,
  );
  return from.before ? sql`(${columns}) < (${values})` : sql`(${columns}) > (${values})`;
}

/** ORDER BY for a keyset page: the sort key ascending, or descending when reading backwards from a cursor. */
export function keyOrder(key: readonly KeyPart[], from: KeysetFrom<unknown>): SQL {
  return sql.join(
    key.map((part) => (from?.before ? desc(part) : asc(part))),
    sql`, `,
  );
}
