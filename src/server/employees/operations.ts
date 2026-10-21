import "server-only";
import type {
  EmployeeInput,
  EmployeeView,
  GetEmployeeInput,
  ListEmployeesInput,
  ListEmployeesOutput,
  UpdateEmployeeInput,
} from "@/contracts/employees";
import { ConflictError, isUniqueViolation, NotFoundError, ValidationError } from "@/server/core/errors";
import type { OperationContext } from "@/server/core/operation-context";
import { paginateKeyset } from "@/server/core/pagination";
import type { Executor } from "@/server/db/connect";
import {
  countDirectory,
  insertEmployee,
  lockEmploymentDates,
  selectDirectoryPage,
  selectDirectorySummary,
  selectEmployee,
  updateDetails,
} from "@/server/employees/queries";
import { employmentDateErrors } from "@/server/employees/status";
import { assertKnownCodes } from "@/server/lookups/operations";
import { appendSalaryRevision } from "@/server/salaries/operations";

export async function listEmployees(op: OperationContext, input: ListEmployeesInput): Promise<ListEmployeesOutput> {
  await assertKnownCodes(op, input);
  const rows = await paginateKeyset({
    scope: "employees.list",
    input,
    keyOf: (row: EmployeeView) => [row.id] as const,
    fetch: (from, take) => selectDirectoryPage(op.db, input, op.today, from, take),
    count: () => countDirectory(op.db, input, op.today),
  });
  return { rows, summary: await selectDirectorySummary(op.db, input, op.today) };
}

export function getEmployee(op: OperationContext, input: GetEmployeeInput): Promise<EmployeeView> {
  return requireEmployee(op.db, input.id, op.today);
}

/** Inserts the employee with its initial pay at revision 1 and the `Initial salary` history entry, atomically. */
export async function createEmployee(op: OperationContext, input: EmployeeInput): Promise<EmployeeView> {
  await assertKnownCodes(op, input);
  try {
    return await op.db.transaction(async (tx) => {
      await insertEmployee(tx, { ...input, salary_revision: 1 });
      await appendSalaryRevision(tx, op, {
        employee_id: input.id,
        revision: 1,
        annual_base_pay: input.annual_base_pay,
        currency_code: input.salary_currency_code,
        reason: "Initial salary",
      });
      return requireEmployee(tx, input.id, op.today);
    });
  } catch (error) {
    // IDs are never reused, departed employees included; no pre-check SELECT, the primary key decides.
    if (isUniqueViolation(error)) {
      throw new ConflictError("Employee ID already exists", { id: "Employee ID already exists" });
    }
    throw error;
  }
}

/** Applies a details patch after checking its dates against the stored dates and salary history. */
export async function updateEmployeeDetails(op: OperationContext, input: UpdateEmployeeInput): Promise<EmployeeView> {
  await assertKnownCodes(op, input);
  const { id, ...patch } = input;
  return op.db.transaction(async (tx) => {
    const stored = await lockEmploymentDates(tx, id);
    if (!stored) throw new NotFoundError("Employee not found");
    const dateErrors = employmentDateErrors(stored, patch);
    if (dateErrors) throw new ValidationError(dateErrors);
    await updateDetails(tx, id, patch);
    return requireEmployee(tx, id, op.today);
  });
}

async function requireEmployee(db: Executor, id: string, today: string): Promise<EmployeeView> {
  const employee = await selectEmployee(db, id, today);
  if (!employee) throw new NotFoundError("Employee not found");
  return employee;
}
