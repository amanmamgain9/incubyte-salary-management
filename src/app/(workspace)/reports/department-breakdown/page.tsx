import type { Metadata } from "next";
import { DepartmentBreakdownReport } from "@/features/reports/department-breakdown/department-breakdown-report";
import { reportFilterSearch } from "@/features/reports/search-params";
import { todayUtc } from "@/lib/dates";
import { parseSearchParams } from "@/lib/search-params";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Department breakdown" };

export default async function DepartmentBreakdownPage(props: PageProps<"/reports/department-breakdown">) {
  const input = parseSearchParams(reportFilterSearch, await props.searchParams);
  await Promise.all([
    prefetch(trpc.reports.departmentBreakdown.queryOptions(input)),
    prefetch(trpc.lookups.get.queryOptions()),
  ]);
  return (
    <HydrateClient>
      <DepartmentBreakdownReport today={todayUtc(new Date())} />
    </HydrateClient>
  );
}
