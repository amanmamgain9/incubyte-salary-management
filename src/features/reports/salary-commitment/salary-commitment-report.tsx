"use client";

import { ReportPage } from "@/features/reports/report-page";
import { SalaryCommitmentSummary } from "@/features/reports/salary-commitment/salary-commitment-summary";
import { SalaryCommitmentTable } from "@/features/reports/salary-commitment/salary-commitment-table";
import { reportFilterSearch } from "@/features/reports/search-params";
import { useTRPC } from "@/trpc/client";

/** Salary commitment: annual base pay of employees active today, by work country and salary currency. */
export function SalaryCommitmentReport({ today }: { today: string }) {
  const trpc = useTRPC();
  return (
    <ReportPage
      title="Salary commitment"
      today={today}
      search={reportFilterSearch}
      filters={["country", "department", "currency"]}
      queryOptions={(input) => trpc.reports.salaryCommitment.queryOptions(input)}
      summary={(output, input, names) => (
        <SalaryCommitmentSummary output={output} input={input} today={today} names={names} />
      )}
      table={(rows, _input, names) => <SalaryCommitmentTable rows={rows} names={names} />}
    />
  );
}
