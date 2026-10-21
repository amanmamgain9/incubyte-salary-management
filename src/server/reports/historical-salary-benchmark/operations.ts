import "server-only";
import type {
  HistoricalSalaryBenchmarkInput,
  HistoricalSalaryBenchmarkOutput,
  HistoricalSalaryBenchmarkRow,
} from "@/contracts/reports/historical-salary-benchmark";
import { ValidationError } from "@/server/core/errors";
import type { OperationContext } from "@/server/core/operation-context";
import { paginateKeyset } from "@/server/core/pagination";
import { assertKnownCodes } from "@/server/lookups/operations";
import {
  countBenchmarkRows,
  createBenchmarkGroups,
  selectBenchmarkRows,
  selectBenchmarkSummary,
} from "@/server/reports/historical-salary-benchmark/queries";

/**
 * Month-end pay percentiles by country, department and currency, with country medians and year-over-year change.
 * The snapshots are built once per request into a transaction-scoped temporary table that page, count and summary read.
 */
export async function historicalSalaryBenchmark(
  op: OperationContext,
  input: HistoricalSalaryBenchmarkInput,
): Promise<HistoricalSalaryBenchmarkOutput> {
  await assertKnownCodes(op, input);
  if (input.to > op.today) throw new ValidationError({ to: "Must be today or earlier" });
  return op.db.transaction(async (tx) => {
    await createBenchmarkGroups(tx, input);
    const rows = await paginateKeyset({
      scope: "reports.historicalSalaryBenchmark",
      input,
      keyOf: (row: HistoricalSalaryBenchmarkRow) =>
        [row.month, row.work_country_code, row.department_id, row.salary_currency_code] as const,
      fetch: (from, take) => selectBenchmarkRows(tx, input, from, take),
      count: () => countBenchmarkRows(tx, input),
    });
    return { rows, summary: await selectBenchmarkSummary(tx, input) };
  });
}
