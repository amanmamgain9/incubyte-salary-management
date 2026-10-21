// Exact money arithmetic on decimal strings via integer minor units (cents). Never `Number` math on amounts.

const DECIMAL_AMOUNT = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

/** A signed decimal string with at most two decimals (`"1200.5"`, `"-0.01"`) in minor units; null otherwise. */
export function toMinorUnits(amount: string): bigint | null {
  const match = DECIMAL_AMOUNT.exec(amount);
  if (!match) return null;
  const [, sign, whole = "", fraction = ""] = match;
  const units = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return sign === "-" ? -units : units;
}

/** Minor units as a signed decimal string with two places (`-1n` → `"-0.01"`). */
export function fromMinorUnits(units: bigint): string {
  const magnitude = units < 0n ? -units : units;
  const fraction = (magnitude % 100n).toString().padStart(2, "0");
  return `${units < 0n ? "-" : ""}${magnitude / 100n}.${fraction}`;
}
