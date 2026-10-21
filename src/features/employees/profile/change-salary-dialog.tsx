"use client";

import { useIsMutating } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import type { EmployeeView } from "@/contracts/employees";
import { ChangeSalaryForm } from "@/features/salaries/change-salary-form";
import { useEmployeeDialog } from "@/features/employees/use-employee-dialog";
import { useTRPC } from "@/trpc/client";

/** Change salary over the profile (`?dialog=salary`), never for a departed employee; a save leaves the "salary" notice. */
export function ChangeSalaryDialog({ employee }: { employee: EmployeeView }) {
  const trpc = useTRPC();
  const dialog = useEmployeeDialog();
  const pending = useIsMutating({ mutationKey: trpc.salaries.update.mutationKey() }) > 0;
  const open = dialog.current === "salary" && employee.employment_status !== "departed";
  return (
    <Dialog open={open} title="Change salary" pending={pending} onClose={() => dialog.close()}>
      <ChangeSalaryForm employeeId={employee.id} onSaved={() => dialog.close("salary")} onCancel={() => dialog.close()} />
    </Dialog>
  );
}
