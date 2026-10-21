"use client";

import { useMemo } from "react";
import { SalaryGrowthInput } from "@/contracts/reports/salary-growth";
import { ReportPage } from "@/features/reports/report-page";
import { SalaryGrowthSummary } from "@/features/reports/salary-growth/salary-growth-summary";
import { SalaryGrowthTable } from "@/features/reports/salary-growth/salary-growth-table";
import { salaryGrowthSearch } from "@/features/reports/salary-growth/search-params";
import { useTRPC } from "@/trpc/client";

/** Salary growth: revisions' increases, decreases and net change by month, country and currency. */
export function SalaryGrowthReport({ today }: { today: string }) {
  const trpc = useTRPC();
  const search = useMemo(() => salaryGrowthSearch(today), [today]);
  return (
    <ReportPage
      title="Salary growth"
      today={today}
      search={search}
      filters={["dates", "country", "department"]}
      period={SalaryGrowthInput}
      queryOptions={(input) => trpc.reports.salaryGrowth.queryOptions(input)}
      summary={(output, input, names) => <SalaryGrowthSummary summary={output.summary} input={input} names={names} />}
      table={(rows, input, names) => <SalaryGrowthTable rows={rows} input={input} names={names} />}
    />
  );
}
