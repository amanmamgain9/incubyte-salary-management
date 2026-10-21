import "server-only";
import { NotFoundError } from "@/server/core/errors";
import type { OperationContext } from "@/server/core/operation-context";
import type { Executor } from "@/server/db/connect";
import { insertHistoryEntry, selectAssignment } from "@/server/salaries/queries";

export type NewRevision = {
  employee_id: string;
  revision: number;
  annual_base_pay: string;
  currency_code: string;
  reason: string;
};

/**
 * The only app code that writes salary history. Runs inside the caller's transaction (`tx`), snapshots the employee's
 * current country and department, and stamps the acting HR user and the request time from `op`.
 */
export async function appendSalaryRevision(tx: Executor, op: OperationContext, revision: NewRevision): Promise<void> {
  const assignment = await selectAssignment(tx, revision.employee_id);
  if (!assignment) throw new NotFoundError("Employee not found");
  await insertHistoryEntry(tx, {
    ...revision,
    work_country_code_at_change: assignment.work_country_code,
    department_id_at_change: assignment.department_id,
    changed_by: op.actor.id,
    changed_at: op.now,
  });
}
