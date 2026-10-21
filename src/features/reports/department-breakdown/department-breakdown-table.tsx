import { Amount } from "@/components/ui/amount";
import { CountryLabel } from "@/components/ui/country-label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DepartmentBreakdownInput, DepartmentBreakdownRow } from "@/contracts/reports/department-breakdown";
import type { LookupNames } from "@/hooks/use-lookups";
import { formatCount } from "@/lib/format";

/** One row per country, department and currency; a filtered country or currency moves to the scope line. */
export function DepartmentBreakdownTable({
  rows,
  input,
  names,
}: {
  rows: readonly DepartmentBreakdownRow[];
  input: DepartmentBreakdownInput;
  names: LookupNames;
}) {
  const { countryName, departmentName } = names;
  const showCountry = !input.work_country_code;
  const showCurrency = !input.salary_currency_code;
  return (
    <Table label="Department breakdown">
      <TableHead>
        {showCountry ? <TableHeader>Country</TableHeader> : null}
        <TableHeader>Department</TableHeader>
        {showCurrency ? <TableHeader>Currency</TableHeader> : null}
        <TableHeader numeric>Employees</TableHeader>
        <TableHeader numeric>Annual base pay</TableHeader>
        <TableHeader numeric>Average base pay</TableHeader>
      </TableHead>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={`${row.work_country_code}-${row.department_id}-${row.salary_currency_code}`}>
            {showCountry ? (
              <TableCell>
                <CountryLabel code={row.work_country_code} name={countryName(row.work_country_code)} />
              </TableCell>
            ) : null}
            <TableCell>{departmentName(row.department_id)}</TableCell>
            {showCurrency ? <TableCell>{row.salary_currency_code}</TableCell> : null}
            <TableCell numeric>{formatCount(row.employee_count)}</TableCell>
            <TableCell numeric>
              <Amount value={row.total_annual_base_pay} currency={row.salary_currency_code} />
            </TableCell>
            <TableCell numeric>
              <Amount value={row.average_annual_base_pay} currency={row.salary_currency_code} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
