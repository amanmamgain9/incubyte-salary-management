import type { Metadata } from "next";
import { SalaryCommitmentReport } from "@/features/reports/salary-commitment/salary-commitment-report";
import { reportFilterSearch } from "@/features/reports/search-params";
import { todayUtc } from "@/lib/dates";
import { parseSearchParams } from "@/lib/search-params";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Salary commitment" };

export default async function SalaryCommitmentPage(props: PageProps<"/reports/salary-commitment">) {
  const input = parseSearchParams(reportFilterSearch, await props.searchParams);
  await Promise.all([
    prefetch(trpc.reports.salaryCommitment.queryOptions(input)),
    prefetch(trpc.lookups.get.queryOptions()),
  ]);
  return (
    <HydrateClient>
      <SalaryCommitmentReport today={todayUtc(new Date())} />
    </HydrateClient>
  );
}
