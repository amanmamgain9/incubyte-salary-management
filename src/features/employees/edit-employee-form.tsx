"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormActions, FormField, FormGrid, FormSection } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { EmployeeView } from "@/contracts/employees";
import { detailsValues, toDetailsPatch } from "@/features/employees/details-patch";
import { EmployeeFields } from "@/features/employees/employee-fields";
import { useEmployeeMutations } from "@/features/employees/use-employee-mutations";
import { useForm } from "@/hooks/use-form";

/**
 * employees.update: edits details and employment dates, sending only changed fields (Save stays disabled until
 * something changes). The ID is locked; clearing the last working day removes a recorded departure. The form edits
 * the version it opened: if the employee is updated meanwhile, a notice offers to load the latest details, and a
 * save still sends only the fields edited here. Knows nothing about dialogs.
 */
export function EditEmployeeForm({
  employee,
  onSaved,
  onCancel,
}: {
  employee: EmployeeView;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { update } = useEmployeeMutations();
  const form = useForm({
    initial: detailsValues(employee),
    onSubmit: async (_values, changes) => {
      await update.mutateAsync({ id: employee.id, ...toDetailsPatch(changes) });
      onSaved();
    },
  });
  const unchanged = Object.keys(form.changes).length === 0;

  return (
    <form onSubmit={form.submit}>
      <FormSection>
        {form.message ? <Alert tone="error">{form.message}</Alert> : null}
        {form.outdated ? (
          <Alert
            tone="info"
            action={
              <Button variant="secondary" size="sm" onClick={form.reset}>
                Load latest details
              </Button>
            }
          >
            This employee was updated since the form opened. Saving changes only the fields you edited; loading the
            latest details discards your edits.
          </Alert>
        ) : null}
        <FormGrid>
          <FormField label="Employee ID" hint="Fixed ID; cannot be reused.">
            <Input value={employee.id} readOnly />
          </FormField>
          <EmployeeFields form={form} countryHint="Salary currency stays unchanged." />
          <FormField label="Last working day · optional" hint="Blank while employed." error={form.errors.last_working_day}>
            <Input {...form.inputProps("last_working_day")} type="date" />
          </FormField>
        </FormGrid>
      </FormSection>
      <FormActions>
        <Button variant="ghost" disabled={update.isPending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" pending={update.isPending} disabled={unchanged}>
          Save changes
        </Button>
      </FormActions>
    </form>
  );
}
