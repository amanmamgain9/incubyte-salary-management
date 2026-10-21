// Pure calendar settings for <DatePicker>: the span of its month/year dropdowns and the day it opens on.
import { clampDate, isIsoDate } from "@/lib/dates";

/** How far the year dropdown reaches before and after the picked date and today when no bound is set. */
const YEARS_BEFORE = 60;
const YEARS_AFTER = 10;

type CalendarInput = { value: string; min?: string; max?: string; today: string };

/** First and last day the calendar can navigate to: the bounds when set, else whole years around the value and today. */
export function calendarRange({ value, min, max, today }: CalendarInput): { start: string; end: string } {
  const years = [today, value].filter(isIsoDate).map((date) => Number(date.slice(0, 4)));
  return {
    start: min ?? `${Math.min(...years) - YEARS_BEFORE}-01-01`,
    end: max ?? `${Math.max(...years) + YEARS_AFTER}-12-31`,
  };
}

/** The day the calendar opens on (and focuses): the picked date, else today moved into the bounds. */
export function openingDate({ value, min, max, today }: CalendarInput): string {
  return isIsoDate(value) ? value : clampDate(today, { min, max });
}
