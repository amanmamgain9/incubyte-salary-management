// Display formatting shared by every screen. The only place that uses `Intl`.
import { toMinorUnits } from "@/lib/money";

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
