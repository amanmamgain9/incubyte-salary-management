import "server-only";
import type { SalaryCommitmentInput, SalaryCommitmentOutput } from "@/contracts/reports/salary-commitment";
import type { OperationContext } from "@/server/core/operation-context";

export function salaryCommitment(_op: OperationContext, _input: SalaryCommitmentInput): Promise<SalaryCommitmentOutput> {
  throw new Error("not implemented");
}
