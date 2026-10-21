"use client";

import type { TextareaHTMLAttributes } from "react";
import { useFieldControl } from "@/components/ui/form-field";
import { controlClass } from "@/components/ui/input";
import { cn } from "@/lib/cn";

/** A multi-line control with the shared control look; grows vertically only. */
export function Textarea(props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">) {
  const field = useFieldControl();
  return (
    <textarea
      id={field?.id}
      aria-describedby={field?.describedBy}
      aria-invalid={field?.invalid || undefined}
      className={cn(controlClass, "min-h-19 resize-y")}
      {...props}
    />
  );
}
