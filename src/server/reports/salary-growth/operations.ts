import "server-only";
import type { SalaryGrowthInput, SalaryGrowthOutput } from "@/contracts/reports/salary-growth";
import type { OperationContext } from "@/server/core/operation-context";

export function salaryGrowth(_op: OperationContext, _input: SalaryGrowthInput): Promise<SalaryGrowthOutput> {
  throw new Error("not implemented");
}
