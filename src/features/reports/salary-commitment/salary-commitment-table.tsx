"use client";

import { Amount } from "@/components/ui/amount";
import { CountryLabel } from "@/components/ui/country-label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SalaryCommitmentRow } from "@/contracts/reports/salary-commitment";
import { useLookups } from "@/hooks/use-lookups";
import { formatCount } from "@/lib/format";

/** One row per work country and salary currency: active headcount and a full year at current pay. */
export function SalaryCommitmentTable({ rows }: { rows: readonly SalaryCommitmentRow[] }) {
  const { countryName } = useLookups();
  return (
    <Table label="Salary commitment by country and currency">
      <TableHead>
        <TableHeader>Country</TableHeader>
        <TableHeader>Currency</TableHeader>
        <TableHeader numeric>Employees</TableHeader>
        <TableHeader numeric>Annual base pay</TableHeader>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.work_country_code}-${row.salary_currency_code}`}>
            <TableCell>
              <CountryLabel code={row.work_country_code} name={countryName(row.work_country_code)} />
            </TableCell>
            <TableCell>{row.salary_currency_code}</TableCell>
            <TableCell numeric>{formatCount(row.employee_count)}</TableCell>
            <TableCell numeric>
              <Amount value={row.total_annual_base_pay} currency={row.salary_currency_code} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
