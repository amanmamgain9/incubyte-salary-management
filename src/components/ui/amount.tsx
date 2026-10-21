import { formatMoney } from "@/lib/format";

/** An exact amount with its currency always visible; tabular figures (right-align it in numeric cells). */
export function Amount({ value, currency }: { value: string; currency: string }) {
  return <span className="whitespace-nowrap tabular-nums">{formatMoney(value, currency)}</span>;
}
