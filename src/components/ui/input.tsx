"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { useFieldControl } from "@/components/ui/form-field";
import { cn } from "@/lib/cn";

/** The 38px control look shared by inputs, selects and textareas. */
export const controlClass =
  "min-h-control w-full min-w-0 rounded-control border border-line-control bg-surface px-2.5 py-2 text-body text-ink shadow-control transition-colors placeholder:text-muted-soft focus:border-accent-ring focus:shadow-focus [&[readonly]]:bg-surface-muted [&[readonly]]:text-muted aria-invalid:border-negative";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id"> & {
  /** Decoration inside the start of the field, e.g. a search icon. */
  leading?: ReactNode;
  /** A control inside the end of the field, e.g. a show-password toggle. */
  trailing?: ReactNode;
};

export function Input({ leading, trailing, ...props }: InputProps) {
  const field = useFieldControl();
  const input = (
    <input
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cn(controlClass, leading ? "pl-8.5" : null, trailing ? "pr-14.5" : null)}
      {...props}
    />
  );
  if (!leading && !trailing) return input;
  return (
    <div className="relative">
      {leading ? (
        <span className="pointer-events-none absolute top-1/2 left-2.75 flex -translate-y-1/2 text-muted">
          {leading}
        </span>
      ) : null}
      {input}
      {trailing ? <span className="absolute top-1/2 right-2.5 flex -translate-y-1/2">{trailing}</span> : null}
    </div>
  );
}
