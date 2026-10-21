"use client";

import { LineChart } from "@/components/charts/line-chart";
import { Amount } from "@/components/ui/amount";
import { Overview } from "@/components/ui/overview";
import { Stat } from "@/components/ui/stat";
import type {
  HistoricalSalaryBenchmarkInput,
  HistoricalSalaryBenchmarkOutput,
} from "@/contracts/reports/historical-salary-benchmark";
import { CountryTotals, GroupDetail, GroupTotal } from "@/features/reports/country-totals";
import { HistoricalSalaryBenchmarkChart } from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-chart";
import { finalMedian, headcountTrend } from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-data";
import { reportScope } from "@/features/reports/report-scope";
import { useLookups } from "@/hooks/use-lookups";
import { formatCompact, formatCount, formatDate } from "@/lib/format";

/**
 * Final-snapshot headcount and totals (per country/currency when several), the single group's median and pay-range
 * trend, or headcount at each month end when several groups match.
 */
export function HistoricalSalaryBenchmarkSummary({
  output,
  input,
}: {
  output: HistoricalSalaryBenchmarkOutput;
  input: HistoricalSalaryBenchmarkInput;
}) {
  const lookups = useLookups();
  const { summary } = output;
  // Single-group amounts mean every matching row shares one group, so any row names it.
  const median = finalMedian(summary.trend);
  const group = summary.trend.some((point) => point.median_annual_base_pay !== null) ? output.rows.items[0] : undefined;
  const snapshot = summary.by_country.length === 1 ? summary.by_country[0] : undefined;
  return (
    <>
      <Overview
        scope={`${reportScope(input, lookups)} · Final snapshot ${formatDate(summary.snapshot_date)}`}
        visualCaption="Employees at month end"
        visual={
          !group && summary.trend.length > 1 ? (
            <LineChart
              compact
              height={54}
              points={headcountTrend(summary.trend)}
              series={[{ key: "employees", name: "Employees", tone: "accent" }]}
              label="Matching employees at each month end"
            />
          ) : undefined
        }
      >
        <Stat label="Employees" value={formatCount(summary.employee_count)} />
        {group && median ? (
          <Stat
            label={`Median · ${group.salary_currency_code}`}
            value={formatCompact(median)}
            detail={<Amount value={median} currency={group.salary_currency_code} />}
          />
        ) : null}
        {snapshot ? (
          <Stat
            label={`Annual base pay · ${snapshot.salary_currency_code}`}
            value={formatCompact(snapshot.total_annual_base_pay)}
            detail={<Amount value={snapshot.total_annual_base_pay} currency={snapshot.salary_currency_code} />}
          />
        ) : (
          <Stat label="Country/currency groups" value={formatCount(summary.by_country.length)} />
        )}
      </Overview>
      {summary.by_country.length > 1 ? (
        <CountryTotals label="Final snapshot by country and currency" groups={summary.by_country}>
          {(total) => (
            <>
              <GroupTotal>
                <Amount value={total.total_annual_base_pay} currency={total.salary_currency_code} />
              </GroupTotal>
              <GroupDetail>{formatCount(total.employee_count)} employees</GroupDetail>
            </>
          )}
        </CountryTotals>
      ) : null}
      {group ? <HistoricalSalaryBenchmarkChart trend={summary.trend} group={group} /> : null}
    </>
  );
}
