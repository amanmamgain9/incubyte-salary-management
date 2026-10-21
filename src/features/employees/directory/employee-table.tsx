"use client";

import Link from "next/link";
import { Amount } from "@/components/ui/amount";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ListEmployeesOutput } from "@/contracts/employees";
import { EmploymentStatusBadge } from "@/features/employees/employment-status-badge";
import { useLookups } from "@/hooks/use-lookups";

/** One page of matching employees with Previous/Next, or the empty state. */
export function EmployeeTable({
  rows,
  filtered,
  onPage,
  onClearFilters,
}: {
  rows: ListEmployeesOutput["rows"];
  filtered: boolean;
  onPage: (cursor: string) => void;
  onClearFilters: () => void;
}) {
  const { countryName, departmentName } = useLookups();
  if (rows.items.length === 0) {
    return filtered ? (
      <EmptyState
        title="No matching records"
        hint="Adjust your search or filters."
        action={
          <Button variant="secondary" onClick={onClearFilters}>
            Clear filters
          </Button>
        }
      />
    ) : (
      <EmptyState title="No employees yet" hint="Employees you add appear here." />
    );
  }
  return (
    <>
      <Table label="Employees">
        <TableHead>
          <TableHeader>Employee</TableHeader>
          <TableHeader>Department</TableHeader>
          <TableHeader>Work country</TableHeader>
          <TableHeader>Status</TableHeader>
          <TableHeader numeric>Annual base pay</TableHeader>
          <TableHeader>
            <span className="sr-only">Open</span>
          </TableHeader>
        </TableHead>
        <TableBody>
          {rows.items.map((employee) => (
            <TableRow key={employee.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Avatar name={employee.name} />
                  <div>
                    <Link href={`/employees/${employee.id}`} className="block font-[550] text-ink hover:text-accent-ink">
                      {employee.name}
                    </Link>
                    <small className="mt-0.75 block text-label text-muted">{employee.id}</small>
                  </div>
                </div>
              </TableCell>
              <TableCell>{departmentName(employee.department_id)}</TableCell>
              <TableCell>
                <span className="mr-1.75 inline-grid h-5.75 w-6.25 place-items-center rounded-[4px] border border-line bg-surface-muted text-[10px] text-muted">
                  {employee.work_country_code}
                </span>
                {countryName(employee.work_country_code)}
              </TableCell>
              <TableCell>
                <EmploymentStatusBadge status={employee.employment_status} />
              </TableCell>
              <TableCell numeric>
                <Amount value={employee.annual_base_pay} currency={employee.salary_currency_code} />
              </TableCell>
              <TableCell>
                <Link
                  href={`/employees/${employee.id}`}
                  aria-label={`View ${employee.name}`}
                  tabIndex={-1}
                  className="inline-grid size-7.5 place-items-center rounded-control text-muted hover:bg-rail-hover hover:text-accent-ink"
                >
                  <Icon name="open" size={16} />
                </Link>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        rangeStart={rows.range_start}
        itemCount={rows.items.length}
        total={rows.total_count}
        prevCursor={rows.prev_cursor}
        nextCursor={rows.next_cursor}
        onPage={onPage}
      />
    </>
  );
}
