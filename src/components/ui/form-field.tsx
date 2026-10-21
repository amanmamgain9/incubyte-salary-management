"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

type FieldControl = { id: string; describedBy: string | undefined; invalid: boolean };

const FieldContext = createContext<FieldControl | null>(null);

/** The id and aria wiring of the enclosing `<FormField>`, read by its control (`<Input>`, `<Select>`, …). */
export function useFieldControl(): FieldControl | null {
  return useContext(FieldContext);
}

/**
 * Label + one control + optional hint + error; the control gets its id and `aria-describedby` from here.
 * `wide` spans both columns of a `<FormGrid>`.
 */
export function FormField({
  label,
  hint,
  error,
  wide = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <label htmlFor={id} className="mb-1.5 block text-label font-medium text-muted">
        {label}
      </label>
      <FieldContext value={{ id, describedBy, invalid: Boolean(error) }}>{children}</FieldContext>
      {hint ? (
        <span id={hintId} className="mt-1.25 block text-label text-muted">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} className="mt-1.25 block text-label text-negative">
          {error}
        </span>
      ) : null}
    </div>
  );
}

/** A form block (optionally titled) separated from the next by a rule; holds a form notice and a `<FormGrid>`. */
export function FormSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="border-b border-line p-4.5 sm:p-5">
      {title ? <h3 className="mb-4 text-heading">{title}</h3> : null}
      {children}
    </div>
  );
}

/** The two-column field grid of every form (one column on small screens). */
export function FormGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}

/** The form's footer: Cancel and the submit button, right-aligned. */
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2 px-4.5 py-3 sm:px-5 sm:py-3.5">{children}</div>;
}
