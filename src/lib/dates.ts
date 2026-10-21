// UTC calendar-date helpers on `YYYY-MM-DD` strings. Pure: callers pass the clock in (`todayUtc(now)`).

const DAY_MS = 86_400_000;

function toUtcMs(date: string): number {
  return Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)));
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The UTC calendar date of `now`. */
export function todayUtc(now: Date): string {
  return now.toISOString().slice(0, 10);
}

/** `date` moved by `days` (negative moves back). */
export function addDays(date: string, days: number): string {
  return fromUtcMs(toUtcMs(date) + days * DAY_MS);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

/** `date` moved by `months`, clamped to the target month's last day (2024-01-31 + 1 month = 2024-02-29). */
export function addMonths(date: string, months: number): string {
  const index = Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1 + months;
  const year = Math.floor(index / 12);
  const month = index - year * 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return fromUtcMs(Date.UTC(year, month, Math.min(Number(date.slice(8, 10)), lastDay)));
}

/** The first day of `date`'s month. */
export function monthStart(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

/** The last day of `date`'s month. */
export function monthEnd(date: string): string {
  return addDays(addMonths(monthStart(date), 1), -1);
}

/** Calendar months from `from`'s month to `to`'s month (0 within one month; negative when `to` is earlier). */
export function monthsBetween(from: string, to: string): number {
  const index = (date: string) => Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7));
  return index(to) - index(from);
}
