"use client";

import type { SelectHTMLAttributes } from "react";
import { useFieldControl } from "@/components/ui/form-field";
import { controlClass } from "@/components/ui/input";

export type SelectOption = { value: string; label: string };

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id" | "children"> & {
  options: readonly SelectOption[];
  /** A first option with an empty value, e.g. "All countries". */
  emptyLabel?: string;
};

export function Select({ options, emptyLabel, ...props }: SelectProps) {
  const field = useFieldControl();
  return (
    <select
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={controlClass}
      {...props}
    >
      {emptyLabel === undefined ? null : <option value="">{emptyLabel}</option>}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
