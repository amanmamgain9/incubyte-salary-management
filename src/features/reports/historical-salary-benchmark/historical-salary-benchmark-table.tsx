"use client";

import { Amount } from "@/components/ui/amount";
import { CountryLabel } from "@/components/ui/country-label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  HistoricalSalaryBenchmarkInput,
  HistoricalSalaryBenchmarkRow,
} from "@/contracts/reports/historical-salary-benchmark";
import { useLookups } from "@/hooks/use-lookups";
import { formatCount, formatMonth, formatPercent } from "@/lib/format";

/** A signed percentage in its meaning's color; "—" when there is no comparison group. */
function Change({ percent }: { percent: string | null }) {
  if (percent === null) {
    return (
      <span className="text-muted" title="No prior-year comparison group">
        —
      </span>
    );
  }
  return <span className={percent.startsWith("-") ? "text-negative" : "text-positive"}>{formatPercent(percent)}</span>;
}

/** One row per month, country, department and currency; the month stays visible while the wide table scrolls. */
export function HistoricalSalaryBenchmarkTable({
  rows,
  input,
}: {
  rows: readonly HistoricalSalaryBenchmarkRow[];
  input: HistoricalSalaryBenchmarkInput;
}) {
  const { countryName, departmentName } = useLookups();
  return (
    <Table label="Monthly salary benchmarks" wide>
      <TableHead>
        <TableHeader>Month</TableHeader>
        {input.work_country_code ? null : <TableHeader>Country</TableHeader>}
        {input.department_id ? null : <TableHeader>Department</TableHeader>}
        {input.salary_currency_code ? null : <TableHeader>Currency</TableHeader>}
        <TableHeader numeric>Median</TableHeader>
        <TableHeader numeric>vs country</TableHeader>
        <TableHeader numeric>YoY</TableHeader>
        <TableHeader numeric>Employees</TableHeader>
        <TableHeader numeric>Annual base pay</TableHeader>
        <TableHeader numeric>P10</TableHeader>
        <TableHeader numeric>P90</TableHeader>
        <TableHeader numeric>Country median</TableHeader>
      </TableHead>
      <TableBody>
        {rows.map((row) => {
          const currency = row.salary_currency_code;
          return (
            <TableRow key={`${row.month}-${row.work_country_code}-${row.department_id}-${currency}`}>
              <TableCell>{formatMonth(row.month)}</TableCell>
              {input.work_country_code ? null : (
                <TableCell>
                  <CountryLabel code={row.work_country_code} name={countryName(row.work_country_code)} />
                </TableCell>
              )}
              {input.department_id ? null : <TableCell>{departmentName(row.department_id)}</TableCell>}
              {input.salary_currency_code ? null : <TableCell>{currency}</TableCell>}
              <TableCell numeric>
                <Amount value={row.median_annual_base_pay} currency={currency} />
              </TableCell>
              <TableCell numeric>
                <Change percent={row.median_gap_percent} />
              </TableCell>
              <TableCell numeric>
                <Change percent={row.median_yoy_percent} />
              </TableCell>
              <TableCell numeric>{formatCount(row.employee_count)}</TableCell>
              <TableCell numeric>
                <Amount value={row.total_annual_base_pay} currency={currency} />
              </TableCell>
              <TableCell numeric>
                <Amount value={row.p10_annual_base_pay} currency={currency} />
              </TableCell>
              <TableCell numeric>
                <Amount value={row.p90_annual_base_pay} currency={currency} />
              </TableCell>
              <TableCell numeric>
                <Amount value={row.country_median_annual_base_pay} currency={currency} />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
