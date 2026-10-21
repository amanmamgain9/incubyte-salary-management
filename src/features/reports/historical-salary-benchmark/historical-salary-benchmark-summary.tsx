import { LineChart } from "@/components/charts/line-chart";
import { Amount } from "@/components/ui/amount";
import { Caption } from "@/components/ui/caption";
import { Overview } from "@/components/ui/overview";
import { Stat } from "@/components/ui/stat";
import type {
  HistoricalSalaryBenchmarkInput,
  HistoricalSalaryBenchmarkOutput,
} from "@/contracts/reports/historical-salary-benchmark";
import { CountryTotals, GroupTotal } from "@/features/reports/country-totals";
import { HistoricalSalaryBenchmarkChart } from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-chart";
import { headcountTrend, singleGroup } from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-data";
import { reportScope } from "@/features/reports/report-scope";
import type { LookupNames } from "@/hooks/use-lookups";
import { formatCompact, formatCount, formatDate } from "@/lib/format";

/**
 * Final-snapshot headcount and totals (per country/currency when several), the single group's median and pay-range
 * trend, or headcount at each month end when several groups match.
 */
export function HistoricalSalaryBenchmarkSummary({
  output,
  input,
  names,
}: {
  output: HistoricalSalaryBenchmarkOutput;
  input: HistoricalSalaryBenchmarkInput;
  names: LookupNames;
}) {
  const { summary } = output;
  const single = singleGroup(summary);
  const snapshot = summary.by_country.length === 1 ? summary.by_country[0] : undefined;
  return (
    <>
      <Overview
        scope={`${reportScope(input, names)} · Final snapshot ${formatDate(summary.snapshot_date)}`}
        visualCaption="Employees at month end"
        visual={
          !single && summary.trend.length > 1 ? (
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
        {single?.finalMedian ? (
          <Stat
            label={`Median · ${single.group.salary_currency_code}`}
            value={formatCompact(single.finalMedian)}
            detail={<Amount value={single.finalMedian} currency={single.group.salary_currency_code} />}
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
        <CountryTotals label="Final snapshot by country and currency" groups={summary.by_country} names={names}>
          {(total) => (
            <>
              <GroupTotal>
                <Amount value={total.total_annual_base_pay} currency={total.salary_currency_code} />
              </GroupTotal>
              <Caption>{formatCount(total.employee_count)} employees</Caption>
            </>
          )}
        </CountryTotals>
      ) : null}
      {single ? <HistoricalSalaryBenchmarkChart trend={summary.trend} group={single.group} names={names} /> : null}
    </>
  );
}
