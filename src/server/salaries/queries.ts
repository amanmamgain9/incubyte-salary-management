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
