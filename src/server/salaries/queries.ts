import { and, asc, count, desc, eq, gt, lt } from "drizzle-orm";
import type { KeysetFrom } from "@/contracts/paging";
import type { HistoryView } from "@/contracts/salaries";
import type { Executor, Tx } from "@/server/db/connect";
import { employees, salaryHistory, user } from "@/server/db/schema";

/** The employee's current work country and department, snapshotted onto each history entry. */
export async function selectAssignment(
  db: Executor,
  employee_id: string,
): Promise<{ work_country_code: string; department_id: string } | undefined> {
  const [row] = await db
    .select({ work_country_code: employees.work_country_code, department_id: employees.department_id })
    .from(employees)
    .where(eq(employees.id, employee_id));
  return row;
}

/** Appends one history entry; the database assigns its ID. */
export async function insertHistoryEntry(db: Executor, entry: Omit<typeof salaryHistory.$inferInsert, "id">): Promise<void> {
  await db.insert(salaryHistory).values(entry);
}

/**
 * Locks the employee row until the transaction ends (serializing salary changes and details edits) and reads what a
 * salary change is checked against. Undefined when the employee does not exist.
 */
export async function lockCurrentPay(
  tx: Tx,
  employee_id: string,
): Promise<
  | {
      salary_revision: number;
      last_working_day: string | null;
      annual_base_pay: string;
      salary_currency_code: string;
    }
  | undefined
> {
  const [row] = await tx
    .select({
      salary_revision: employees.salary_revision,
      last_working_day: employees.last_working_day,
      annual_base_pay: employees.annual_base_pay,
      salary_currency_code: employees.salary_currency_code,
    })
    .from(employees)
    .where(eq(employees.id, employee_id))
    .for("update");
  return row;
}

/** Moves the employee's current pay to a new revision. */
export async function updateCurrentPay(
  db: Executor,
  employee_id: string,
  pay: { annual_base_pay: string; salary_currency_code: string; salary_revision: number },
): Promise<void> {
  await db.update(employees).set(pay).where(eq(employees.id, employee_id));
}

/**
 * One page of the employee's history, newest revision first: after `from.key` (lower revisions), or before it
 * (higher revisions, in ascending order) when `from.before`.
 */
export async function selectHistoryPage(
  db: Executor,
  employee_id: string,
  from: KeysetFrom<readonly [number]>,
  take: number,
): Promise<HistoryView[]> {
  const after =
    from === null
      ? undefined
      : from.before
        ? gt(salaryHistory.revision, from.key[0])
        : lt(salaryHistory.revision, from.key[0]);
  const rows = await db
    .select({
      id: salaryHistory.id,
      employee_id: salaryHistory.employee_id,
      revision: salaryHistory.revision,
      annual_base_pay: salaryHistory.annual_base_pay,
      currency_code: salaryHistory.currency_code,
      work_country_code_at_change: salaryHistory.work_country_code_at_change,
      department_id_at_change: salaryHistory.department_id_at_change,
      changed_by: salaryHistory.changed_by,
      changed_by_name: user.name,
      changed_at: salaryHistory.changed_at,
      reason: salaryHistory.reason,
    })
    .from(salaryHistory)
    .innerJoin(user, eq(user.id, salaryHistory.changed_by))
    .where(and(eq(salaryHistory.employee_id, employee_id), after))
    .orderBy(from?.before ? asc(salaryHistory.revision) : desc(salaryHistory.revision))
    .limit(take);
  return rows.map((row) => ({ ...row, changed_at: row.changed_at.toISOString() }));
}

export async function countHistory(db: Executor, employee_id: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(salaryHistory)
    .where(eq(salaryHistory.employee_id, employee_id));
  return row?.total ?? 0;
}
