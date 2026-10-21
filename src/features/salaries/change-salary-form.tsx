"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Amount } from "@/components/ui/amount";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormActions, FormField, FormGrid, FormSection } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { salaryDeltaNote } from "@/features/salaries/salary-delta";
import { useSalaryMutations } from "@/features/salaries/use-salary-mutations";
import { useForm } from "@/hooks/use-form";
import { useLookups } from "@/hooks/use-lookups";
import { cn } from "@/lib/cn";
import { isConflict } from "@/lib/mutation-errors";
import { useTRPC } from "@/trpc/client";

const noteTone = { positive: "text-positive", negative: "text-negative", neutral: "text-muted" } as const;

/**
 * salaries.update against the revision the form was loaded at. On CONFLICT the entries stay and "Reload current
 * salary" refetches the employee and adopts its revision for the next save. Knows nothing about dialogs.
 */
export function ChangeSalaryForm({
  employeeId,
  onSaved,
  onCancel,
}: {
  employeeId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const trpc = useTRPC();
  const employeeQuery = useSuspenseQuery(trpc.employees.get.queryOptions({ id: employeeId }));
  const employee = employeeQuery.data;
  const [expectedRevision, setExpectedRevision] = useState(employee.salary_revision);
  const { update } = useSalaryMutations();
  const lookups = useLookups();
  const form = useForm({
    initial: { annual_base_pay: "", salary_currency_code: employee.salary_currency_code, reason: "" },
    onSubmit: async (values) => {
      await update.mutateAsync({ employee_id: employeeId, expected_revision: expectedRevision, ...values });
      onSaved();
    },
  });
  const note = salaryDeltaNote(employee, form.values);

  async function reload() {
    const { data } = await employeeQuery.refetch();
    if (!data) return;
    setExpectedRevision(data.salary_revision);
    update.reset();
  }

  return (
    <form onSubmit={form.submit}>
      <FormSection>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <small className="mb-1.25 block text-label text-muted">Current annual base pay</small>
            <strong className="text-[20px] font-semibold">
              <Amount value={employee.annual_base_pay} currency={employee.salary_currency_code} />
            </strong>
          </div>
          <Badge tone="neutral">Revision {employee.salary_revision}</Badge>
        </div>
        {isConflict(update.error) ? (
          <Alert
            tone="error"
            action={
              <Button variant="secondary" size="sm" pending={employeeQuery.isFetching} onClick={() => void reload()}>
                Reload current salary
              </Button>
            }
          >
            The salary changed since this form opened. Your entries are kept; reload the current salary, review and save.
          </Alert>
        ) : update.isError && form.message ? (
          <Alert tone="error">{form.message}</Alert>
        ) : null}
        <FormGrid>
          <FormField label="New annual base pay" hint="Effective immediately." error={form.errors.annual_base_pay}>
            <Input {...form.inputProps("annual_base_pay")} required inputMode="decimal" placeholder="0.00" />
          </FormField>
          <FormField label="Salary currency" hint="No automatic conversion." error={form.errors.salary_currency_code}>
            <Select {...form.inputProps("salary_currency_code")} required options={lookups.currencyOptions} />
          </FormField>
          <FormField label="Reason for change" error={form.errors.reason} wide>
            <Textarea {...form.inputProps("reason")} required maxLength={500} placeholder="e.g. Annual salary review or promotion" />
          </FormField>
        </FormGrid>
        <p aria-live="polite" className={cn("mt-2 min-h-4.5 text-label", note && noteTone[note.tone])}>
          {note?.text}
        </p>
      </FormSection>
      <FormActions>
        <Button variant="ghost" disabled={update.isPending} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" pending={update.isPending}>
          Save salary
        </Button>
      </FormActions>
    </form>
  );
}
