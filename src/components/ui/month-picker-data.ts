// Pure month-grid logic for <MonthPicker>: months are first days (`YYYY-MM-01`); bounds are any days in their month.
import { addMonths, clampDate, monthStart } from "@/lib/dates";

type MonthBounds = { min?: string; max?: string };

export type MonthCell = {
  /** `YYYY-MM-01`. */
  month: string;
  /** Outside the bounds: shown, not pickable. */
  disabled: boolean;
  selected: boolean;
  /** Today's month. */
  current: boolean;
};

function monthBounds({ min, max }: MonthBounds): { min?: string; max?: string } {
  return { min: min === undefined ? undefined : monthStart(min), max: max === undefined ? undefined : monthStart(max) };
}

/** The twelve months of `year` as grid cells. */
export function monthCells(year: number, options: MonthBounds & { value: string; today: string }): MonthCell[] {
  const bounds = monthBounds(options);
  const selected = options.value === "" ? "" : monthStart(options.value);
  return Array.from({ length: 12 }, (_, index) => {
    const month = `${String(year).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}-01`;
    return {
      month,
      disabled: (bounds.min !== undefined && month < bounds.min) || (bounds.max !== undefined && month > bounds.max),
      selected: month === selected,
      current: month === monthStart(options.today),
    };
  });
}

/** The month the grid opens on (and focuses): the picked month, else today's moved into the bounds. */
export function openingMonth(options: MonthBounds & { value: string; today: string }): string {
  if (options.value !== "") return monthStart(options.value);
  return clampDate(monthStart(options.today), monthBounds(options));
}

const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -3,
  ArrowDown: 3,
  PageUp: -12,
  PageDown: 12,
};

/**
 * Where a key moves focus from `month` in the 3-column grid, kept within the bounds: arrows by one month or one row,
 * PageUp/PageDown by a year, Home/End to the year's first/last month. Null for any other key.
 */
export function monthAfterKey(month: string, key: string, bounds: MonthBounds): string | null {
  const year = month.slice(0, 4);
  const step = KEY_STEPS[key];
  const target =
    key === "Home" ? `${year}-01-01` : key === "End" ? `${year}-12-01` : step === undefined ? null : addMonths(month, step);
  return target === null ? null : clampDate(target, monthBounds(bounds));
}
