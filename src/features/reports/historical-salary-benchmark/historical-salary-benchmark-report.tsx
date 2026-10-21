"use client";

import { useMemo } from "react";
import { HistoricalSalaryBenchmarkSummary } from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-summary";
import { HistoricalSalaryBenchmarkTable } from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-table";
import { ReportPage } from "@/features/reports/report-page";
import { historicalSalaryBenchmarkSearch } from "@/features/reports/search-params";
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
      queryOptions={(input) => trpc.reports.historicalSalaryBenchmark.queryOptions(input)}
      summary={(output, input) => <HistoricalSalaryBenchmarkSummary output={output} input={input} />}
      table={(rows, input) => <HistoricalSalaryBenchmarkTable rows={rows} input={input} />}
    />
  );
}
