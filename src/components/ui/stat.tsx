import type { ReactNode } from "react";

/** One overview measure: label, large tabular value and an optional detail line. */
export function Stat({ label, value, detail }: { label: string; value: ReactNode; detail?: ReactNode }) {
  return (
    <div className="min-w-0 sm:border-l sm:border-line sm:pl-4 sm:first:border-l-0 sm:first:pl-0">
      <span className="mb-1.75 block text-label leading-[1.3] font-medium text-muted">{label}</span>
      <strong className="block text-metric whitespace-nowrap tabular-nums">{value}</strong>
      {detail ? <small className="mt-1.75 block text-label leading-[1.3] text-muted">{detail}</small> : null}
    </div>
  );
}
