import "server-only";
import type {
  SalaryCommitmentInput,
  SalaryCommitmentOutput,
  SalaryCommitmentRow,
} from "@/contracts/reports/salary-commitment";
import type { OperationContext } from "@/server/core/operation-context";
import { paginateKeyset } from "@/server/core/pagination";
import { assertKnownCodes } from "@/server/lookups/operations";
import {
  countCommitmentRows,
  selectCommitmentRows,
  selectCommitmentSummary,
} from "@/server/reports/salary-commitment/queries";

/** Annual commitment of employees active today, by work country and salary currency. */
export async function salaryCommitment(op: OperationContext, input: SalaryCommitmentInput): Promise<SalaryCommitmentOutput> {
  await assertKnownCodes(op, input);
  const rows = await paginateKeyset({
    scope: "reports.salaryCommitment",
    input,
    keyOf: (row: SalaryCommitmentRow) => [row.work_country_code, row.salary_currency_code] as const,
    fetch: (from, take) => selectCommitmentRows(op.db, input, op.today, from, take),
    count: () => countCommitmentRows(op.db, input, op.today),
  });
  return { rows, summary: await selectCommitmentSummary(op.db, input, op.today) };
}
