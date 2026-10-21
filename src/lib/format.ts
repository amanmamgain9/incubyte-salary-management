// Display formatting shared by every screen. The only place that uses `Intl`.
import { divideRounded, toMinorUnits } from "@/lib/money";

const counts = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** A whole count with grouping, e.g. 10000 → "10,000". */
export function formatCount(count: number): string {
  return counts.format(count);
}

/**
 * An exact decimal amount with its currency code, e.g. ("1234567.5", "INR") → "INR 1,234,567.50".
 * Works on minor units (never `Number`), so large amounts keep every digit.
 */
export function formatMoney(amount: string, currency: string): string {
  const units = toMinorUnits(amount);
  if (units === null) return `${currency} ${amount}`;
  const magnitude = units < 0n ? -units : units;
  const whole = counts.format(magnitude / 100n);
  const fraction = (magnitude % 100n).toString().padStart(2, "0");
  return `${currency} ${units < 0n ? "−" : ""}${whole}.${fraction}`;
}

const COMPACT_STEPS: ReadonlyArray<readonly [bigint, string]> = [
  [1n, ""],
  [1_000n, "K"],
  [1_000_000n, "M"],
  [1_000_000_000n, "B"],
  [1_000_000_000_000n, "T"],
];

/**
 * A short overview figure for an exact amount, without currency, e.g. "1234567.89" → "1.23M", "-950.5" → "−950.5";
 * at most two decimals, rounded half away from zero on minor units (never `Number`). Show the exact amount beside it.
 */
export function formatCompact(amount: string): string {
  const units = toMinorUnits(amount);
  if (units === null) return amount;
  const magnitude = units < 0n ? -units : units;
  // The largest step whose rounded value is at least 1 (999,999.99 → "1M", not "1,000K").
  let hundredths = magnitude;
  let suffix = "";
  for (const [step, name] of COMPACT_STEPS) {
    const scaled = divideRounded(magnitude, step);
    if (step > 1n && scaled < 100n) break;
    hundredths = scaled;
    suffix = name;
  }
  const fraction = (hundredths % 100n).toString().padStart(2, "0").replace(/0+$/, "");
  const sign = units < 0n && hundredths > 0n ? "−" : "";
  return `${sign}${counts.format(hundredths / 100n)}${fraction ? `.${fraction}` : ""}${suffix}`;
}

/** The pagination summary, e.g. (51, 50, 10000) → "51–100 of 10,000 results". */
export function formatRange(rangeStart: number, itemCount: number, total: number): string {
  if (total === 0 || itemCount === 0) return "No results";
  const end = rangeStart + itemCount - 1;
  const label = total === 1 ? "result" : "results";
  return `${formatCount(rangeStart)}–${formatCount(end)} of ${formatCount(total)} ${label}`;
}

/** Up to two initials from a person's name, e.g. "Demo HR Manager" → "DH"; "?" for a blank name. */
export function formatInitials(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
  return initials || "?";
}

const dates = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

/** A UTC calendar date (`YYYY-MM-DD` or an ISO timestamp's date), e.g. "2024-01-15" → "15 Jan 2024"; null → "—". */
export function formatDate(date: string | null): string {
  if (!date) return "—";
  return dates.format(new Date(`${date.slice(0, 10)}T00:00:00Z`));
}

/** An ISO UTC timestamp as date and minute, e.g. "2024-01-15T10:05:00.000Z" → "15 Jan 2024 · 10:05 UTC". */
export function formatTimestamp(timestamp: string): string {
  const time = new Date(timestamp).toISOString().slice(11, 16);
  return `${formatDate(timestamp)} · ${time} UTC`;
}

/** A signed two-place percentage string as shown beside a change, e.g. "5.00" → "+5.00%", "-3.25" → "−3.25%". */
export function formatPercent(percent: string): string {
  const units = toMinorUnits(percent.replace(/^-/, ""));
  if (units === null) return `${percent}%`;
  const magnitude = `${counts.format(units / 100n)}.${(units % 100n).toString().padStart(2, "0")}`;
  if (units === 0n) return `${magnitude}%`;
  return `${percent.startsWith("-") ? "−" : "+"}${magnitude}%`;
}
