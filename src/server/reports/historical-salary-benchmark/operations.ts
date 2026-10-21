import "server-only";
import type {
  HistoricalSalaryBenchmarkInput,
  HistoricalSalaryBenchmarkOutput,
} from "@/contracts/reports/historical-salary-benchmark";
import type { OperationContext } from "@/server/core/operation-context";

export function historicalSalaryBenchmark(
  _op: OperationContext,
  _input: HistoricalSalaryBenchmarkInput,
): Promise<HistoricalSalaryBenchmarkOutput> {
  throw new Error("not implemented");
}
