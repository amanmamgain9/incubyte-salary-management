"use client";

import { useMemo } from "react";
import { HistoricalSalaryBenchmarkInput } from "@/contracts/reports/historical-salary-benchmark";
import { HistoricalSalaryBenchmarkSummary } from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-summary";
import { HistoricalSalaryBenchmarkTable } from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-table";
import { ReportPage } from "@/features/reports/report-page";
import { historicalSalaryBenchmarkSearch } from "@/features/reports/historical-salary-benchmark/search-params";
import { useTRPC } from "@/trpc/client";

/** Historical benchmark: month-end P10/median/P90 by country, department and currency against the country median. */
export function HistoricalSalaryBenchmarkReport({ today }: { today: string }) {
  const trpc = useTRPC();
  const search = useMemo(() => historicalSalaryBenchmarkSearch(today), [today]);
  return (
    <ReportPage
      title="Historical benchmarking"
      today={today}
      search={search}
      filters={["months", "country", "department", "currency"]}
      period={HistoricalSalaryBenchmarkInput}
      queryOptions={(input) => trpc.reports.historicalSalaryBenchmark.queryOptions(input)}
      summary={(output, input, names) => (
        <HistoricalSalaryBenchmarkSummary output={output} input={input} names={names} />
      )}
      table={(rows, input, names) => <HistoricalSalaryBenchmarkTable rows={rows} input={input} names={names} />}
    />
  );
}
