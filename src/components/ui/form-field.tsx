"use client";

import { createContext, useContext, useId, type ReactNode } from "react";

type FieldControl = { id: string; describedBy: string | undefined; invalid: boolean };

const FieldContext = createContext<FieldControl | null>(null);

/** The id and aria wiring of the enclosing `<FormField>`, read by its control (`<Input>`, `<Select>`, …). */
export function useFieldControl(): FieldControl | null {
  return useContext(FieldContext);
}

/** Label + one control + optional hint + error; the control gets its id and `aria-describedby` from here. */
export function FormField({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;
  return (
    <div>
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
