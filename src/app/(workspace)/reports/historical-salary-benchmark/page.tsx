import type { Metadata } from "next";
import { HistoricalSalaryBenchmarkReport } from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-report";
import { historicalSalaryBenchmarkSearch } from "@/features/reports/search-params";
import { todayUtc } from "@/lib/dates";
import { parseSearchParams } from "@/lib/search-params";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Historical benchmarking" };

export default async function HistoricalSalaryBenchmarkPage(props: PageProps<"/reports/historical-salary-benchmark">) {
  const today = todayUtc(new Date());
  const input = parseSearchParams(historicalSalaryBenchmarkSearch(today), await props.searchParams);
  await Promise.all([
    prefetch(trpc.reports.historicalSalaryBenchmark.queryOptions(input)),
    prefetch(trpc.lookups.get.queryOptions()),
  ]);
  return (
    <HydrateClient>
      <HistoricalSalaryBenchmarkReport today={today} />
    </HydrateClient>
  );
}
