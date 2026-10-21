import "server-only";
import type { HistoryView, SalaryHistoryInput, SalaryHistoryOutput, UpdateSalaryInput } from "@/contracts/salaries";
import { toMinorUnits } from "@/lib/money";
import { ConflictError, NotFoundError, ValidationError } from "@/server/core/errors";
import type { OperationContext } from "@/server/core/operation-context";
import { paginateKeyset } from "@/server/core/pagination";
import type { Executor } from "@/server/db/connect";
import { assertKnownCodes } from "@/server/lookups/operations";
import {
  countHistory,
  insertHistoryEntry,
  lockCurrentPay,
  selectAssignment,
  selectHistoryPage,
  updateCurrentPay,
} from "@/server/salaries/queries";

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

/**
 * The only way current pay changes: locks the employee, rejects a departed employee, a stale `expected_revision` or a
 * change to the same amount and currency, then updates current pay to the next revision and appends its history entry,
 * in one transaction.
 */
export async function changeSalary(op: OperationContext, input: UpdateSalaryInput): Promise<void> {
  await assertKnownCodes(op, input);
  const { employee_id, expected_revision, annual_base_pay, salary_currency_code, reason } = input;
  await op.db.transaction(async (tx) => {
    const stored = await lockCurrentPay(tx, employee_id);
    if (!stored) throw new NotFoundError("Employee not found");
    // Departed = last working day before today (UTC); upcoming and active employees may change pay.
    if (stored.last_working_day !== null && stored.last_working_day < op.today) {
      throw new ValidationError({ employee_id: "Salary cannot change after the last working day" });
    }
    if (stored.salary_revision !== expected_revision) {
      throw new ConflictError("Salary changed since it was loaded; reload and try again");
    }
    const samePay = toMinorUnits(stored.annual_base_pay) === toMinorUnits(annual_base_pay);
    if (samePay && stored.salary_currency_code === salary_currency_code) {
      throw new ValidationError({ annual_base_pay: "No change from the current salary" });
    }
    const revision = expected_revision + 1;
    await updateCurrentPay(tx, employee_id, { annual_base_pay, salary_currency_code, salary_revision: revision });
    await appendSalaryRevision(tx, op, {
      employee_id,
      revision,
      annual_base_pay,
      currency_code: salary_currency_code,
      reason,
    });
  });
}

/** One employee's salary history, newest revision first; kept and readable after departure. */
export async function listSalaryHistory(op: OperationContext, input: SalaryHistoryInput): Promise<SalaryHistoryOutput> {
  if (!(await selectAssignment(op.db, input.employee_id))) throw new NotFoundError("Employee not found");
  return paginateKeyset({
    scope: "salaries.history",
    input,
    keyOf: (row: HistoryView) => [row.revision] as const,
    fetch: (from, take) => selectHistoryPage(op.db, input.employee_id, from, take),
    count: () => countHistory(op.db, input.employee_id),
  });
}
