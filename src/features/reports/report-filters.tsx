"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { FormField } from "@/components/ui/form-field";
import { MonthPicker } from "@/components/ui/month-picker";
import { Select } from "@/components/ui/select";
import {
  readFilterForm,
  type FilterValues,
  type PeriodContract,
  type PeriodErrors,
  type ReportFilterField,
} from "@/features/reports/search-params";
import type { LookupOptions } from "@/hooks/use-lookups";
import { cn } from "@/lib/cn";

// One column per control, then Apply and Reset; two columns on small screens.
const columns: Record<number, string> = {
  3: "lg:grid-cols-[repeat(3,minmax(0,1fr))_auto_auto]",
  4: "lg:grid-cols-[repeat(4,minmax(0,1fr))_auto_auto]",
  5: "lg:grid-cols-[repeat(5,minmax(0,1fr))_auto_auto]",
};

/**
 * A report's filter controls, applied together on Apply (a date range is checked first, errors beside the field);
 * Reset returns to the report's defaults. Shows `values` (the URL state) when mounted: key it by them.
 */
export function ReportFilters({
  fields,
  period,
  values,
  today,
  options,
  onApply,
  onReset,
}: {
  fields: readonly ReportFilterField[];
  /** The report's contract checking a `dates` or `months` period. */
  period?: PeriodContract;
  values: FilterValues;
  today: string;
  options: LookupOptions;
  onApply: (patch: FilterValues) => void;
  onReset: () => void;
}) {
  const [errors, setErrors] = useState<PeriodErrors>({});
  // The pickers are controlled; their hidden inputs put the period into the FormData read on Apply.
  const [picked, setPicked] = useState({ from: values.from ?? "", to: values.to ?? "" });
  const setFrom = (from: string) => setPicked((current) => ({ ...current, from }));
  const setTo = (to: string) => setPicked((current) => ({ ...current, to }));
  const controls = fields.reduce((count, field) => count + (field === "dates" || field === "months" ? 2 : 1), 0);

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form: Record<string, string> = {};
    new FormData(event.currentTarget).forEach((value, key) => {
      if (typeof value === "string") form[key] = value;
    });
    const result = readFilterForm(fields, form, today, period);
    setErrors(result.errors);
    if (Object.keys(result.errors).length === 0) onApply(result.patch);
  };

  return (
    <form
      aria-label="Report filters"
      onSubmit={apply}
      noValidate
      className={cn("mb-4.5 grid grid-cols-2 items-start gap-2", columns[controls])}
    >
      {fields.includes("dates") ? (
        <FormField label="From date" error={errors.from}>
          <DatePicker name="from" value={picked.from} onChange={setFrom} max={today} required />
        </FormField>
      ) : null}
      {fields.includes("months") ? (
        <FormField label="From month" error={errors.from}>
          <MonthPicker name="from" value={picked.from} onChange={setFrom} max={today} />
        </FormField>
      ) : null}
      {fields.includes("dates") || fields.includes("months") ? (
        <FormField label="Through" error={errors.to}>
          <DatePicker name="to" value={picked.to} onChange={setTo} max={today} required />
        </FormField>
      ) : null}
      {fields.includes("country") ? (
        <FormField label="Country">
          <Select
            name="work_country_code"
            emptyLabel="All countries"
            options={options.countryOptions}
            defaultValue={values.work_country_code ?? ""}
          />
        </FormField>
      ) : null}
      {fields.includes("department") ? (
        <FormField label="Department">
          <Select
            name="department_id"
            emptyLabel="All departments"
            options={options.departmentOptions}
            defaultValue={values.department_id ?? ""}
          />
        </FormField>
      ) : null}
      {fields.includes("currency") ? (
        <FormField label="Currency">
          <Select
            name="salary_currency_code"
            emptyLabel="All currencies"
            options={options.currencyOptions}
            defaultValue={values.salary_currency_code ?? ""}
          />
        </FormField>
      ) : null}
      <div className="col-span-2 flex gap-2 lg:col-span-2 lg:mt-6">
        <Button type="submit">Apply</Button>
        <Button variant="ghost" onClick={onReset}>
          Reset
        </Button>
      </div>
    </form>
  );
}
