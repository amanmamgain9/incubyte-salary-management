"use client";

import { Amount } from "@/components/ui/amount";
import { CountryLabel } from "@/components/ui/country-label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SalaryGrowthInput, SalaryGrowthRow } from "@/contracts/reports/salary-growth";
import { useLookups } from "@/hooks/use-lookups";
import { formatCount, formatMonth } from "@/lib/format";

/** One row per month, country and (new) currency: increases, decreases, net change and currency switches. */
export function SalaryGrowthTable({ rows, input }: { rows: readonly SalaryGrowthRow[]; input: SalaryGrowthInput }) {
  const { countryName } = useLookups();
  const showCountry = !input.work_country_code;
  return (
    <Table label="Monthly salary changes">
      <TableHead>
        <TableHeader>Month</TableHeader>
        {showCountry ? <TableHeader>Country</TableHeader> : null}
        <TableHeader>Currency</TableHeader>
        <TableHeader numeric>Increases</TableHeader>
        <TableHeader numeric>Decreases</TableHeader>
        <TableHeader numeric>Net change</TableHeader>
        <TableHeader numeric>Currency switches</TableHeader>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.month}-${row.work_country_code}-${row.salary_currency_code}`}>
            <TableCell>{formatMonth(row.month)}</TableCell>
            {showCountry ? (
              <TableCell>
                <CountryLabel code={row.work_country_code} name={countryName(row.work_country_code)} />
              </TableCell>
            ) : null}
            <TableCell>{row.salary_currency_code}</TableCell>
            <TableCell numeric>
              <Amount value={row.increases} currency={row.salary_currency_code} />
            </TableCell>
            <TableCell numeric>
              <Amount value={row.decreases} currency={row.salary_currency_code} />
            </TableCell>
            <TableCell numeric>
              <Amount value={row.net_change} currency={row.salary_currency_code} />
            </TableCell>
            <TableCell numeric>{formatCount(row.currency_switch_count)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
