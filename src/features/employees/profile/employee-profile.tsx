"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { EmploymentStatusBadge } from "@/features/employees/employment-status-badge";
import { ChangeSalaryDialog } from "@/features/employees/profile/change-salary-dialog";
import { CurrentPay } from "@/features/employees/profile/current-pay";
import { EditEmployeeDialog } from "@/features/employees/profile/edit-employee-dialog";
import { EmployeeDetails } from "@/features/employees/profile/employee-details";
import { historyInput, profileSearch } from "@/features/employees/profile/search-params";
import { SavedAlert } from "@/features/employees/saved-alert";
import { SalaryHistoryTable } from "@/features/salaries/salary-history-table";
import { useEmployeeDialog } from "@/features/employees/use-employee-dialog";
import { useLookups } from "@/hooks/use-lookups";
import { useUrlState } from "@/hooks/use-url-state";
import { useTRPC } from "@/trpc/client";

/** Employee profile: name/status/actions → details and current pay → salary history. */
export function EmployeeProfile({ id }: { id: string }) {
  const trpc = useTRPC();
  const { data: employee } = useSuspenseQuery(trpc.employees.get.queryOptions({ id }));
  const lookups = useLookups();
  const dialog = useEmployeeDialog();
  const [{ cursor }, patch] = useUrlState(profileSearch);
  // Stable while only `?dialog=`/`?saved=` change, so the history does not re-defer (dim) on those.
  const history = useMemo(() => historyInput(id, { cursor }), [id, cursor]);

  return (
    <>
      <PageHeader
        back={{ href: "/employees", label: "All employees" }}
        leading={<Avatar name={employee.name} size="lg" />}
        title={employee.name}
        meta={
          <>
            <span>{employee.id}</span>
            <EmploymentStatusBadge status={employee.employment_status} />
          </>
        }
        action={
          <>
            <Button variant="secondary" onClick={() => dialog.open("edit")}>
              Edit details
            </Button>
            {employee.employment_status === "departed" ? null : (
              <Button onClick={() => dialog.open("salary")}>Change salary</Button>
            )}
          </>
        }
      />
      <SavedAlert />
      <Card label="Employee details and current pay">
        <div className="flex flex-wrap items-center justify-between gap-5 p-4.5 sm:p-6">
          <EmployeeDetails employee={employee} names={lookups} />
          <CurrentPay employee={employee} />
        </div>
      </Card>
      <Card label="Salary history">
        <CardHeader title="Salary history" aside={<Badge tone="neutral">Read only</Badge>} />
        <SalaryHistoryTable input={history} names={lookups} onPage={(cursor) => patch({ cursor })} />
      </Card>
      <EditEmployeeDialog employee={employee} options={lookups} />
      <ChangeSalaryDialog employee={employee} options={lookups} />
    </>
  );
}
