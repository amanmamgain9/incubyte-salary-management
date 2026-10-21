import { and, asc, count, countDistinct, desc, eq, gt, ilike, lt, or, type SQL, sql } from "drizzle-orm";
import type { DetailsPatch, DirectorySummary, EmployeeFilters, EmployeeView } from "@/contracts/employees";
import type { KeysetFrom } from "@/contracts/paging";
import type { Executor } from "@/server/db/connect";
import { employees, salaryHistory } from "@/server/db/schema";
import { employmentStatusOn, isActiveOn, type StoredEmploymentDates } from "@/server/employees/status";

/** The EmployeeView columns, with `employment_status` as of `today`. */
function employeeViewColumns(today: string) {
  return {
    id: employees.id,
    name: employees.name,
    department_id: employees.department_id,
    work_country_code: employees.work_country_code,
    joining_date: employees.joining_date,
    last_working_day: employees.last_working_day,
    annual_base_pay: employees.annual_base_pay,
    salary_currency_code: employees.salary_currency_code,
    salary_revision: employees.salary_revision,
    employment_status: employmentStatusOn(today),
  };
}

export async function selectEmployee(db: Executor, id: string, today: string): Promise<EmployeeView | undefined> {
  const [row] = await db.select(employeeViewColumns(today)).from(employees).where(eq(employees.id, id));
  return row;
}

// LIKE treats `%`, `_` and `\` specially; escape them so a search matches them literally.
function containing(search: string): string {
  return `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

function directoryWhere(filters: EmployeeFilters, today: string): SQL | undefined {
  const search = filters.search ? containing(filters.search) : undefined;
  return and(
    search === undefined ? undefined : or(ilike(employees.name, search), ilike(employees.id, search)),
    filters.department_id === undefined ? undefined : eq(employees.department_id, filters.department_id),
    filters.work_country_code === undefined ? undefined : eq(employees.work_country_code, filters.work_country_code),
    filters.employment_status === undefined
      ? undefined
      : sql`${employmentStatusOn(today)} = ${filters.employment_status}`,
  );
}

/** One directory page in ID order: after `from.key`, or before it in reverse order when `from.before`. */
export function selectDirectoryPage(
  db: Executor,
  filters: EmployeeFilters,
  today: string,
  from: KeysetFrom<readonly [string]>,
  take: number,
): Promise<EmployeeView[]> {
  const after = from === null ? undefined : from.before ? lt(employees.id, from.key[0]) : gt(employees.id, from.key[0]);
  return db
    .select(employeeViewColumns(today))
    .from(employees)
    .where(and(directoryWhere(filters, today), after))
    .orderBy(from?.before ? desc(employees.id) : asc(employees.id))
    .limit(take);
}

export async function countDirectory(db: Executor, filters: EmployeeFilters, today: string): Promise<number> {
  const [row] = await db.select({ total: count() }).from(employees).where(directoryWhere(filters, today));
  return row?.total ?? 0;
}

export async function selectDirectorySummary(
  db: Executor,
  filters: EmployeeFilters,
  today: string,
): Promise<DirectorySummary> {
  const status = employmentStatusOn(today);
  const [row] = await db
    .select({
      employee_count: count(),
      active_count: sql<number>`count(*) filter (where ${isActiveOn(today)})`.mapWith(Number),
      upcoming_count: sql<number>`count(*) filter (where ${status} = 'upcoming')`.mapWith(Number),
      departed_count: sql<number>`count(*) filter (where ${status} = 'departed')`.mapWith(Number),
      country_count: countDistinct(employees.work_country_code),
    })
    .from(employees)
    .where(directoryWhere(filters, today));
  return row ?? { employee_count: 0, active_count: 0, upcoming_count: 0, departed_count: 0, country_count: 0 };
}

export async function insertEmployee(db: Executor, row: typeof employees.$inferInsert): Promise<void> {
  await db.insert(employees).values(row);
}

/**
 * Locks the employee row (as salary changes do) and reads the dates a details edit is checked against, including
 * the UTC date of the latest revision after the initial salary. Undefined when the employee does not exist.
 */
export async function lockEmploymentDates(db: Executor, id: string): Promise<StoredEmploymentDates | undefined> {
  const [employee] = await db
    .select({ joining_date: employees.joining_date, last_working_day: employees.last_working_day })
    .from(employees)
    .where(eq(employees.id, id))
    .for("update");
  if (!employee) return undefined;
  const [latest] = await db
    .select({ date: sql<string>`to_char(${salaryHistory.changed_at} at time zone 'UTC', 'YYYY-MM-DD')` })
    .from(salaryHistory)
    .where(and(eq(salaryHistory.employee_id, id), gt(salaryHistory.revision, 1)))
    .orderBy(desc(salaryHistory.revision))
    .limit(1);
  return { ...employee, latest_revision_date: latest?.date ?? null };
}

/** Writes the submitted details; absent fields stay as stored, `last_working_day: null` clears it. */
export async function updateDetails(db: Executor, id: string, patch: DetailsPatch): Promise<void> {
  const { name, department_id, work_country_code, joining_date, last_working_day } = patch;
  await db
    .update(employees)
    .set({ name, department_id, work_country_code, joining_date, last_working_day })
    .where(eq(employees.id, id));
}
