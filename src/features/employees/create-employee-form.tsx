"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FormActions, FormField, FormGrid, FormSection } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { EmployeeFields } from "@/features/employees/employee-fields";
import { useEmployeeMutations } from "@/features/employees/use-employee-mutations";
import { useForm } from "@/hooks/use-form";
import type { LookupOptions } from "@/hooks/use-lookups";

/** employees.create: permanent ID, details and the initial salary (saved as revision 1). Knows nothing about dialogs. */
export function CreateEmployeeForm({
  today,
  options,
  onSaved,
  onCancel,
}: {
  today: string;
  options: LookupOptions;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { create } = useEmployeeMutations();
  const form = useForm({
    initial: {
      id: "",
      name: "",
      department_id: "",
      work_country_code: "",
      joining_date: today,
      annual_base_pay: "",
      salary_currency_code: "",
    },
    onSubmit: async (values) => {
      await create.mutateAsync(values);
      onSaved();
    },
  });

  return (
    <form onSubmit={form.submit}>
      <FormSection title="Employee details">
        {form.message ? <Alert tone="error">{form.message}</Alert> : null}
        <FormGrid>
          <FormField label="Employee ID" hint="Fixed ID; cannot be reused." error={form.errors.id}>
            <Input {...form.inputProps("id")} required maxLength={32} autoComplete="off" placeholder="e.g. E-10001" />
          </FormField>
          <EmployeeFields form={form} options={options} />
        </FormGrid>
      </FormSection>
      <FormSection title="Initial salary">
        <FormGrid>
          <FormField label="Annual base pay" error={form.errors.annual_base_pay}>
            <Input {...form.inputProps("annual_base_pay")} required inputMode="decimal" placeholder="0.00" />
          </FormField>
          <FormField label="Salary currency" hint="Separate from work country." error={form.errors.salary_currency_code}>
            <Select
              {...form.inputProps("salary_currency_code")}
              required
              emptyLabel="Select a currency"
              options={options.currencyOptions}
            />
          </FormField>
        </FormGrid>
      </FormSection>
      <FormActions>
        <Button variant="ghost" disabled={create.isPending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" pending={create.isPending}>
          Create employee
        </Button>
      </FormActions>
    </form>
  );
}
