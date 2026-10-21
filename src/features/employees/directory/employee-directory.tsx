"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { directoryScope, hasDirectoryFilters } from "@/features/employees/directory/directory-data";
import { DirectoryFilters } from "@/features/employees/directory/directory-filters";
import { DirectoryOverview } from "@/features/employees/directory/directory-overview";
import { EmployeeTable } from "@/features/employees/directory/employee-table";
import { directorySearch } from "@/features/employees/directory/search-params";
import { useDialog } from "@/hooks/use-dialog";
import { useLookups } from "@/hooks/use-lookups";
import { useUrlState } from "@/hooks/use-url-state";
import { useTRPC } from "@/trpc/client";

const clearedFilters = {
  search: undefined,
  department_id: undefined,
  work_country_code: undefined,
  employment_status: undefined,
};

/** Employees: title/action → filters → overview → table, all driven by the URL. */
export function EmployeeDirectory() {
  const trpc = useTRPC();
  const lookups = useLookups();
  const dialog = useDialog();
  const [search, patch] = useUrlState(directorySearch);
  // While the next page or filter result loads, keep showing (dimmed) results instead of the loading state.
  const input = useDeferredValue(search);
  const { data } = useSuspenseQuery(trpc.employees.list.queryOptions(input));
  const loading = input !== search;

  return (
    <>
      <PageHeader
        title="Employees"
        action={
          <Button icon="add" onClick={() => dialog.open("create")}>
            Add employee
          </Button>
        }
      />
      <DirectoryFilters search={search} onChange={patch} />
      <div aria-busy={loading} className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <DirectoryOverview summary={data.summary} scope={directoryScope(input, lookups)} />
        <Card label="Employees">
          <EmployeeTable
            rows={data.rows}
            filtered={hasDirectoryFilters(input)}
            onPage={(cursor) => patch({ cursor })}
            onClearFilters={() => patch(clearedFilters)}
          />
        </Card>
      </div>
    </>
  );
}
