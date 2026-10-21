"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { monthAfterKey, monthCells, openingMonth } from "@/components/ui/month-picker-data";
import { PickerPopover } from "@/components/ui/picker-popover";
import { cn } from "@/lib/cn";
import { isIsoDate, todayUtc } from "@/lib/dates";
import { formatMonth } from "@/lib/format";

type MonthPickerProps = {
  /** The picked month as its first day (`YYYY-MM-01`), or "" for none. */
  value: string;
  /** Called with the picked month's first day. */
  onChange: (value: string) => void;
  /** Earliest and latest pickable months, as any day in them (`YYYY-MM-DD`). */
  min?: string;
  max?: string;
  /** Submits the value under this name (a hidden input), for forms read with FormData. */
  name?: string;
  placeholder?: string;
};

/**
 * The one month field: a button showing the picked month that opens a year of months with previous/next year
 * buttons, today's month marked and months outside `min`–`max` disabled. Arrow keys move by month or row,
 * PageUp/PageDown by year, Home/End to the year's ends, Enter picks. Controlled; values are first days of months.
 */
export function MonthPicker({ value, onChange, min, max, name, placeholder }: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  // Set when the grid opens (UTC, like every date in the app), so rendering never reads the clock.
  const [today, setToday] = useState("");

  const openChange = (next: boolean) => {
    if (next) setToday(todayUtc(new Date()));
    setOpen(next);
  };

  const pick = (month: string) => {
    onChange(month);
    setOpen(false);
  };

  return (
    <PickerPopover
      value={value}
      name={name}
      display={isIsoDate(value) ? formatMonth(value.slice(0, 7)) : value}
      placeholder={placeholder ?? "Select a month"}
      title="Choose month"
      onClear={() => onChange("")}
      open={open}
      onOpenChange={openChange}
    >
      {today === "" ? null : <MonthGrid value={value} min={min} max={max} today={today} onPick={pick} />}
    </PickerPopover>
  );
}

/** A year of month buttons; mounts with the popover and focuses the picked (or today's) month. */
function MonthGrid({
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
  onPick: (month: string) => void;
}) {
  // The focusable month (roving tab stop); its year is the one shown.
  const [active, setActive] = useState(() => openingMonth({ value, min, max, today }));
  const grid = useRef<HTMLDivElement>(null);
  // Focus follows the active month on opening and keyboard moves, not after clicks on the year buttons.
  const focusActive = useRef(true);

  useEffect(() => {
    if (!focusActive.current) return;
    focusActive.current = false;
    grid.current?.querySelector<HTMLElement>('[tabindex="0"]')?.focus();
  }, [active]);

  const year = Number(active.slice(0, 4));
  const cells = monthCells(year, { value, min, max, today });
  const moveYear = (key: "PageUp" | "PageDown") => setActive(monthAfterKey(active, key, { min, max }) ?? active);
  const firstYear = min ? Number(min.slice(0, 4)) : -Infinity;
  const lastYear = max ? Number(max.slice(0, 4)) : Infinity;

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = monthAfterKey(active, event.key, { min, max });
    if (next === null) return;
    event.preventDefault();
    focusActive.current = true;
    setActive(next);
  };

  return (
    <div className="w-63">
      <div className="mb-2 flex h-8 items-center justify-between">
        <button
          type="button"
          aria-label={`Previous year, ${year - 1}`}
          aria-disabled={year <= firstYear || undefined}
          onClick={() => year > firstYear && moveYear("PageUp")}
          className={navButton}
        >
          <Icon name="previous" size={17} />
        </button>
        <span className="text-heading" aria-live="polite">
          {year}
        </span>
        <button
          type="button"
          aria-label={`Next year, ${year + 1}`}
          aria-disabled={year >= lastYear || undefined}
          onClick={() => year < lastYear && moveYear("PageDown")}
          className={navButton}
        >
          <Icon name="next" size={17} />
        </button>
      </div>
      <div
        ref={grid}
        role="group"
        aria-label={`Months of ${year}`}
        onKeyDown={onKeyDown}
        className="grid grid-cols-3 gap-1"
      >
        {cells.map((cell) => (
          <button
            key={cell.month}
            type="button"
            // Roving focus: only the active month is in the tab order.
            tabIndex={cell.month === active ? 0 : -1}
            disabled={cell.disabled}
            aria-pressed={cell.selected}
            aria-label={`${formatMonth(cell.month.slice(0, 7))}${cell.current ? ", this month" : ""}`}
            onClick={() => onPick(cell.month)}
            onFocus={() => setActive(cell.month)}
            className={cn(
              "h-9 cursor-pointer rounded-control text-body disabled:cursor-default disabled:text-muted-soft",
              cell.current && "font-semibold ring-1 ring-accent-ring",
              cell.selected
                ? "bg-accent font-semibold text-surface hover:bg-accent-hover"
                : cn("hover:bg-accent-soft disabled:hover:bg-transparent", cell.current ? "text-accent-ink" : "text-ink"),
            )}
          >
            {formatMonth(cell.month.slice(0, 7), "name")}
          </button>
        ))}
      </div>
    </div>
  );
}

const navButton =
  "grid size-8 cursor-pointer place-items-center rounded-control text-muted hover:bg-rail-hover hover:text-ink aria-disabled:cursor-default aria-disabled:opacity-40";
