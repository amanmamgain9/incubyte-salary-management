"use client";

// The only calendar-library import site: every date field in the app is a <DatePicker>.
import { useState } from "react";
import { DayPicker, type Matcher, type Modifiers } from "react-day-picker";
import { calendarRange, openingDate } from "@/components/ui/date-picker-data";
import { Icon, type IconName } from "@/components/ui/icon";
import { PickerPopover } from "@/components/ui/picker-popover";
import { fromCalendarDate, isIsoDate, toCalendarDate, todayUtc } from "@/lib/dates";
import { formatDate } from "@/lib/format";

type DatePickerProps = {
  /** The picked date (`YYYY-MM-DD`), or "" for none. */
  value: string;
  /** Called with the picked date, or "" when cleared. */
  onChange: (value: string) => void;
  /** Earliest and latest pickable dates (`YYYY-MM-DD`); days outside are shown disabled. */
  min?: string;
  max?: string;
  /** A date must be picked: no clear button, and picking the selected day again keeps it. */
  required?: boolean;
  /** Shows a clear button while a date is set (optional fields, e.g. the last working day). */
  clearable?: boolean;
  /** Submits the value under this name (a hidden input), for forms read with FormData. */
  name?: string;
  placeholder?: string;
};

/**
 * The one date field: a button showing the picked date that opens a month calendar with month and year dropdowns,
 * today marked, days outside `min`–`max` disabled, and DayPicker's keyboard grid (arrows, PageUp/PageDown, Home/End).
 * Controlled with ISO strings; place it in a `<FormField>` like any control.
 */
export function DatePicker({ value, onChange, min, max, required = false, clearable = false, name, placeholder }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  // Set when the calendar opens (UTC, like every date in the app), so rendering never reads the clock.
  const [today, setToday] = useState("");

  const openChange = (next: boolean) => {
    if (next) setToday(todayUtc(new Date()));
    setOpen(next);
  };

  // Picking the selected day again unselects it, which clears an optional date and keeps a required one.
  const pick = (date: Date | undefined) => {
    if (date || !required) onChange(date ? fromCalendarDate(date) : "");
    setOpen(false);
  };

  return (
    <PickerPopover
      value={value}
      name={name}
      display={isIsoDate(value) ? formatDate(value) : value}
      placeholder={placeholder ?? "Select a date"}
      title="Choose date"
      clearable={clearable && !required}
      onClear={() => onChange("")}
      open={open}
      onOpenChange={openChange}
    >
      {today === "" ? null : <Calendar value={value} min={min} max={max} today={today} onPick={pick} />}
    </PickerPopover>
  );
}

function Calendar({
  value,
  min,
  max,
  today,
  onPick,
}: {
  value: string;
  min?: string;
  max?: string;
  today: string;
  onPick: (date: Date | undefined) => void;
}) {
  const range = calendarRange({ value, min, max, today });
  const disabled: Matcher[] = [];
  if (min) disabled.push({ before: toCalendarDate(min) });
  if (max) disabled.push({ after: toCalendarDate(max) });
  return (
    <DayPicker
      mode="single"
      selected={isIsoDate(value) ? toCalendarDate(value) : undefined}
      onSelect={onPick}
      defaultMonth={toCalendarDate(openingDate({ value, min, max, today }))}
      startMonth={toCalendarDate(range.start)}
      endMonth={toCalendarDate(range.end)}
      today={toCalendarDate(today)}
      disabled={disabled}
      captionLayout="dropdown"
      weekStartsOn={1}
      autoFocus
      labels={{ labelDayButton }}
      components={{ Chevron }}
      classNames={classNames}
    />
  );
}

/** Day buttons are named like the app shows dates ("2 May 2024"), then today and selected. */
function labelDayButton(date: Date, modifiers: Modifiers): string {
  const name = formatDate(fromCalendarDate(date));
  return `${name}${modifiers.today ? ", today" : ""}${modifiers.selected ? ", selected" : ""}`;
}

const chevrons: Record<string, IconName> = { left: "previous", right: "next", up: "expand", down: "expand" };

function Chevron({ orientation = "left" }: { orientation?: "up" | "down" | "left" | "right" }) {
  return <Icon name={chevrons[orientation] ?? "expand"} size={orientation === "down" ? 14 : 17} />;
}

const navButton =
  "grid size-8 cursor-pointer place-items-center rounded-control text-muted hover:bg-rail-hover hover:text-ink aria-disabled:cursor-default aria-disabled:opacity-40";

/** Token classes for every calendar part (no library stylesheet). */
const classNames = {
  root: "relative text-body",
  months: "relative",
  month: "flex flex-col gap-2",
  month_caption: "flex h-8 items-center pr-18",
  dropdowns: "flex items-center gap-1",
  dropdown_root:
    "relative inline-flex items-center rounded-control px-1.5 py-1 hover:bg-rail-hover has-focus-visible:outline-2 has-focus-visible:outline-accent",
  dropdown: "absolute inset-0 z-1 w-full cursor-pointer opacity-0",
  caption_label: "inline-flex items-center gap-1 text-heading whitespace-nowrap",
  nav: "absolute top-0 right-0 flex h-8 items-center gap-1",
  button_previous: navButton,
  button_next: navButton,
  month_grid: "border-collapse",
  weekday: "h-8 w-9 text-caption font-medium text-muted",
  day: "p-0.5 text-center",
  day_button:
    "grid size-8 cursor-pointer place-items-center rounded-control text-body text-ink hover:bg-accent-soft disabled:cursor-default disabled:text-muted-soft disabled:hover:bg-transparent",
  // Day modifiers land on the cell; they style its button (selected wins over today).
  today:
    "[&>button]:font-semibold [&>button]:ring-1 [&>button]:ring-accent-ring [&:not([data-selected])>button]:text-accent-ink",
  selected: "[&>button]:bg-accent [&>button]:font-semibold [&>button]:text-surface [&>button:hover]:bg-accent-hover",
};
