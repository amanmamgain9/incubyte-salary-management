import { DatePicker } from "@/components/ui/date-picker";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { InputProps, ValueProps } from "@/hooks/use-form";
import type { LookupOptions } from "@/hooks/use-lookups";

type DetailsField = "name" | "department_id" | "work_country_code" | "joining_date";

/** The `useForm` parts the shared fields need; any form whose values include these fields fits. */
type DetailsForm = {
  inputProps: (name: DetailsField) => InputProps;
  valueProps: (name: DetailsField) => ValueProps;
  errors: Partial<Record<DetailsField, string>>;
};

/** Name, department, work country and joining date: the fields the create and edit forms share. */
export function EmployeeFields({
  form,
  options,
  countryHint,
}: {
  form: DetailsForm;
  options: LookupOptions;
  countryHint?: string;
}) {
  return (
    <>
      <FormField label="Full name" error={form.errors.name}>
        <Input {...form.inputProps("name")} required autoComplete="off" placeholder="Full name" />
      </FormField>
      <FormField label="Department" error={form.errors.department_id}>
        <Select {...form.inputProps("department_id")} required emptyLabel="Select a department" options={options.departmentOptions} />
      </FormField>
      <FormField label="Work country" hint={countryHint} error={form.errors.work_country_code}>
        <Select {...form.inputProps("work_country_code")} required emptyLabel="Select a country" options={options.countryOptions} />
      </FormField>
      <FormField label="Joining date" error={form.errors.joining_date}>
        <DatePicker {...form.valueProps("joining_date")} required />
      </FormField>
    </>
  );
}
