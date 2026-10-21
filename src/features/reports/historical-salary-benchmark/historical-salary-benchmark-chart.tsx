"use client";

import { ChartLegend } from "@/components/charts/chart-legend";
import { LineChart } from "@/components/charts/line-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { BenchmarkPoint } from "@/contracts/reports/historical-salary-benchmark";
import { payRangeTrend } from "@/features/reports/historical-salary-benchmark/historical-salary-benchmark-data";
import { useLookups } from "@/hooks/use-lookups";

type Group = { work_country_code: string; department_id: string; salary_currency_code: string };

/** Department median, country median and the P10–P90 band per month, for the one matching group only. */
export function HistoricalSalaryBenchmarkChart({ trend, group }: { trend: readonly BenchmarkPoint[]; group: Group }) {
  const { countryName, departmentName } = useLookups();
  const points = payRangeTrend(trend);
  if (!points) return null;
  const currency = group.salary_currency_code;
  const scope = `${countryName(group.work_country_code)} · ${departmentName(group.department_id)} · ${currency}`;
  return (
    <Card label="Salary trend">
      <CardHeader title="Salary trend" aside={<span className="text-label text-muted">{scope}</span>} />
      <CardBody>
        <LineChart
          points={points}
          series={[
            { key: "median", name: "Department median", tone: "accent" },
            { key: "country_median", name: "Country median", tone: "secondary", dashed: true },
          ]}
          band={{ name: "P10–P90", tone: "band" }}
          unit={currency}
          label={`Median annual base pay with the P10–P90 range and the country median in ${currency}, ${scope}`}
        />
        <ChartLegend
          items={[
            { label: "Department median", tone: "accent" },
            { label: "Country median", tone: "secondary" },
            { label: "P10–P90", tone: "band" },
          ]}
        />
      </CardBody>
    </Card>
  );
}
