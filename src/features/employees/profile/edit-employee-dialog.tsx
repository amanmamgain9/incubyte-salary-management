"use client";

import { useIsMutating } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import type { EmployeeView } from "@/contracts/employees";
import { EditEmployeeForm } from "@/features/employees/edit-employee-form";
import { useEmployeeDialog } from "@/features/employees/use-employee-dialog";
import type { LookupOptions } from "@/hooks/use-lookups";
import { useTRPC } from "@/trpc/client";

/** Edit details over the profile (`?dialog=edit`); a save closes it with the "details" notice. */
export function EditEmployeeDialog({ employee, options }: { employee: EmployeeView; options: LookupOptions }) {
  const trpc = useTRPC();
  const dialog = useEmployeeDialog();
  const pending = useIsMutating({ mutationKey: trpc.employees.update.mutationKey() }) > 0;
  return (
    <Dialog open={dialog.current === "edit"} title="Edit details" pending={pending} onClose={() => dialog.close()}>
      <EditEmployeeForm employee={employee} options={options} onSaved={() => dialog.close("details")} onCancel={() => dialog.close()} />
    </Dialog>
  );
}
