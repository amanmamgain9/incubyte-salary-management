import { eq } from "drizzle-orm";
import type { Executor } from "@/server/db/connect";
import { employees, salaryHistory } from "@/server/db/schema";

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
  db: Executor,
  employee_id: string,
): Promise<{ salary_revision: number; last_working_day: string | null } | undefined> {
  const [row] = await db
    .select({ salary_revision: employees.salary_revision, last_working_day: employees.last_working_day })
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
