import type { Metadata } from "next";
import { SalaryGrowthReport } from "@/features/reports/salary-growth/salary-growth-report";
import { salaryGrowthSearch } from "@/features/reports/search-params";
import { todayUtc } from "@/lib/dates";
import { parseSearchParams } from "@/lib/search-params";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Salary growth" };

export default async function SalaryGrowthPage(props: PageProps<"/reports/salary-growth">) {
  const today = todayUtc(new Date());
  const input = parseSearchParams(salaryGrowthSearch(today), await props.searchParams);
  await Promise.all([prefetch(trpc.reports.salaryGrowth.queryOptions(input)), prefetch(trpc.lookups.get.queryOptions())]);
  return (
    <HydrateClient>
      <SalaryGrowthReport today={today} />
    </HydrateClient>
  );
}
