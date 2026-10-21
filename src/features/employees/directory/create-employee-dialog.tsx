"use client";

import { useIsMutating } from "@tanstack/react-query";
import { Dialog } from "@/components/ui/dialog";
import { CreateEmployeeForm } from "@/features/employees/create-employee-form";
import { useEmployeeDialog } from "@/features/employees/use-employee-dialog";
import { useTRPC } from "@/trpc/client";

/** Add employee over the directory (`?dialog=create`); a save closes it with the "created" notice. */
export function CreateEmployeeDialog({ today }: { today: string }) {
  const trpc = useTRPC();
  const dialog = useEmployeeDialog();
  const pending = useIsMutating({ mutationKey: trpc.employees.create.mutationKey() }) > 0;
  return (
    <Dialog open={dialog.current === "create"} title="Add employee" pending={pending} onClose={() => dialog.close()}>
      <CreateEmployeeForm today={today} onSaved={() => dialog.close("created")} onCancel={() => dialog.close()} />
    </Dialog>
  );
}
