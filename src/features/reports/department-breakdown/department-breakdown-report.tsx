"use client";

import { DepartmentBreakdownSummary } from "@/features/reports/department-breakdown/department-breakdown-summary";
import { DepartmentBreakdownTable } from "@/features/reports/department-breakdown/department-breakdown-table";
import { ReportPage } from "@/features/reports/report-page";
import { reportFilterSearch } from "@/features/reports/search-params";
import { useTRPC } from "@/trpc/client";

/** Department breakdown: headcount, total and average pay of employees active today by country and department. */
export function DepartmentBreakdownReport({ today }: { today: string }) {
  const trpc = useTRPC();
  return (
    <ReportPage
      title="Department breakdown"
      today={today}
      search={reportFilterSearch}
      filters={["country", "department", "currency"]}
      queryOptions={(input) => trpc.reports.departmentBreakdown.queryOptions(input)}
      summary={(output, input) => <DepartmentBreakdownSummary summary={output.summary} input={input} />}
      table={(rows, input) => <DepartmentBreakdownTable rows={rows} input={input} />}
    />
  );
}
