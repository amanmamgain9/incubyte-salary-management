import "server-only";
import type { SalaryGrowthInput, SalaryGrowthOutput, SalaryGrowthRow } from "@/contracts/reports/salary-growth";
import { ValidationError } from "@/server/core/errors";
import type { OperationContext } from "@/server/core/operation-context";
import { paginateKeyset } from "@/server/core/pagination";
import { assertKnownCodes } from "@/server/lookups/operations";
import { countGrowthRows, selectGrowthRows, selectGrowthSummary } from "@/server/reports/salary-growth/queries";

/** Increases, decreases and currency switches from salary revisions in a period, by month, country and currency. */
export async function salaryGrowth(op: OperationContext, input: SalaryGrowthInput): Promise<SalaryGrowthOutput> {
  await assertKnownCodes(op, input);
  if (input.to > op.today) throw new ValidationError({ to: "Must be today or earlier" });
  const rows = await paginateKeyset({
    scope: "reports.salaryGrowth",
    input,
    keyOf: (row: SalaryGrowthRow) => [row.month, row.work_country_code, row.salary_currency_code] as const,
    fetch: (from, take) => selectGrowthRows(op.db, input, from, take),
    count: () => countGrowthRows(op.db, input),
  });
  return { rows, summary: await selectGrowthSummary(op.db, input) };
}
