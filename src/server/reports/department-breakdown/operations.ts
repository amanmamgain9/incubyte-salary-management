import "server-only";
import type {
  DepartmentBreakdownInput,
  DepartmentBreakdownOutput,
  DepartmentBreakdownRow,
} from "@/contracts/reports/department-breakdown";
import type { OperationContext } from "@/server/core/operation-context";
import { paginateKeyset } from "@/server/core/pagination";
import { assertKnownCodes } from "@/server/lookups/operations";
import {
  countDepartmentRows,
  selectDepartmentRows,
  selectDepartmentSummary,
} from "@/server/reports/department-breakdown/queries";

/** How each country's commitment of employees active today splits across departments, per salary currency. */
export async function departmentBreakdown(
  op: OperationContext,
  input: DepartmentBreakdownInput,
): Promise<DepartmentBreakdownOutput> {
  await assertKnownCodes(op, input);
  const rows = await paginateKeyset({
    scope: "reports.departmentBreakdown",
    input,
    keyOf: (row: DepartmentBreakdownRow) => [row.work_country_code, row.department_id, row.salary_currency_code] as const,
    fetch: (from, take) => selectDepartmentRows(op.db, input, op.today, from, take),
    count: () => countDepartmentRows(op.db, input, op.today),
  });
  return { rows, summary: await selectDepartmentSummary(op.db, input, op.today) };
}
