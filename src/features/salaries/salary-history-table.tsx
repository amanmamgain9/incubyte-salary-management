"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { Amount } from "@/components/ui/amount";
import { DeferredContent } from "@/components/ui/deferred-content";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SalaryHistoryInput } from "@/contracts/salaries";
import { useLookups } from "@/hooks/use-lookups";
import { formatTimestamp } from "@/lib/format";
import { useTRPC } from "@/trpc/client";

/** One page of an employee's read-only salary history, newest revision first, with Previous/Next. */
export function SalaryHistoryTable({ input, onPage }: { input: SalaryHistoryInput; onPage: (cursor: string) => void }) {
  const trpc = useTRPC();
  const { countryName, departmentName } = useLookups();
  // While another page loads, keep showing (dimmed) the current one instead of the route's loading state.
  const deferred = useDeferredValue(input);
  const { data } = useSuspenseQuery(trpc.salaries.history.queryOptions(deferred));
  const loading = deferred !== input;

  if (data.items.length === 0) return <EmptyState title="No salary history" />;
  return (
    <DeferredContent stale={loading}>
      <Table label="Salary history">
        <TableHead>
          <TableHeader>Revision / date</TableHeader>
          <TableHeader numeric>Annual base pay</TableHeader>
          <TableHeader>Work country</TableHeader>
          <TableHeader>Department</TableHeader>
          <TableHeader>Recorded by</TableHeader>
          <TableHeader>Reason</TableHeader>
        </TableHead>
        <TableBody>
          {data.items.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>
                <strong className="font-semibold">{entry.revision}</strong>
                <small className="mt-0.75 block text-label text-muted">{formatTimestamp(entry.changed_at)}</small>
              </TableCell>
              <TableCell numeric>
                <Amount value={entry.annual_base_pay} currency={entry.currency_code} />
              </TableCell>
              <TableCell>{countryName(entry.work_country_code_at_change)}</TableCell>
              <TableCell>{departmentName(entry.department_id_at_change)}</TableCell>
              <TableCell>{entry.changed_by_name}</TableCell>
              <TableCell>{entry.reason}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination
        rangeStart={data.range_start}
        itemCount={data.items.length}
        total={data.total_count}
        prevCursor={data.prev_cursor}
        nextCursor={data.next_cursor}
        onPage={onPage}
      />
    </DeferredContent>
  );
}
