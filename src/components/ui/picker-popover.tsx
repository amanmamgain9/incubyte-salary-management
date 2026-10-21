"use client";

// The only popover-library import site: the field shell every date and month picker shares.
import * as Popover from "@radix-ui/react-popover";
import { useId, useRef, type ReactNode } from "react";
import { useFieldControl } from "@/components/ui/form-field";
import { Icon } from "@/components/ui/icon";
import { controlClass } from "@/components/ui/input";
import { cn } from "@/lib/cn";

type PickerPopoverProps = {
  /** The picked ISO value ("" when none); submitted under `name` through a hidden input, so FormData sees it. */
  value: string;
  name?: string;
  /** The value as people read it, shown in the trigger. */
  display: string;
  placeholder: string;
  /** What the popover holds, e.g. "Choose date": its accessible name. */
  title: string;
  /** Shows a clear button while a value is set; `onClear` empties it. */
  clearable?: boolean;
  onClear: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

/**
 * A 38px control-styled button that opens a calendar popover below it. Inside a `<FormField>` it takes the field's id,
 * description and error state, and its accessible name is the label followed by the picked value. The popover is not
 * portalled, so it also works inside a modal `<dialog>`; Esc and outside clicks close it and focus returns to the
 * trigger.
 */
export function PickerPopover({
  value,
  name,
  display,
  placeholder,
  title,
  clearable = false,
  onClear,
  open,
  onOpenChange,
  children,
}: PickerPopoverProps) {
  const field = useFieldControl();
  const valueId = useId();
  const clearId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const showClear = clearable && value !== "";

  const clear = () => {
    onClear();
    trigger.current?.focus();
  };

  return (
    <Popover.Root open={open} onOpenChange={onOpenChange}>
      <div className="relative">
        <Popover.Trigger asChild>
          <button
            ref={trigger}
            type="button"
            id={field?.id}
            name={name}
            aria-labelledby={field ? `${field.labelId} ${valueId}` : undefined}
            aria-describedby={field?.describedBy}
            // A button has no aria-invalid; the error is announced through aria-describedby and shown by the border.
            data-invalid={field?.invalid || undefined}
            className={cn(
              controlClass,
              "flex cursor-pointer items-center gap-2 text-left data-invalid:border-negative",
              showClear && "pr-10",
            )}
          >
            <Icon name="calendar" size={16} className="text-muted" />
            <span id={valueId} className={cn("truncate", value === "" && "text-muted-soft")}>
              {value === "" ? placeholder : display}
            </span>
          </button>
        </Popover.Trigger>
        {showClear ? (
          <button
            type="button"
            aria-labelledby={field ? `${clearId} ${field.labelId}` : undefined}
            onClick={clear}
            className="absolute top-1/2 right-1.5 grid size-7 -translate-y-1/2 cursor-pointer place-items-center rounded-control text-muted hover:bg-rail-hover hover:text-ink"
          >
            <span id={clearId} className="sr-only">
              Clear
            </span>
            <Icon name="close" size={15} />
          </button>
        ) : null}
      </div>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <Popover.Content
        aria-label={title}
        align="start"
        sideOffset={6}
        collisionPadding={16}
        // The calendar moves focus to the picked (or today's) day itself.
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="z-20 rounded-surface border border-line bg-surface p-3 text-ink shadow-panel"
      >
        {children}
      </Popover.Content>
    </Popover.Root>
  );
}
