import "server-only";
import type { DepartmentBreakdownInput, DepartmentBreakdownOutput } from "@/contracts/reports/department-breakdown";
import type { OperationContext } from "@/server/core/operation-context";

export function departmentBreakdown(
  _op: OperationContext,
  _input: DepartmentBreakdownInput,
): Promise<DepartmentBreakdownOutput> {
  throw new Error("not implemented");
}
