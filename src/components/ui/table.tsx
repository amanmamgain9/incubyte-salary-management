import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A table in its own horizontal scroller, so wide data never overflows the page. `wide` tables keep their first
 * column (e.g. the month) in view while the rest scrolls.
 */
export function Table({ label, wide = false, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        aria-label={label}
        className={cn(
          "w-full border-collapse text-left text-body whitespace-nowrap",
          wide &&
            "min-w-240 [&_td:first-child]:bg-surface [&_tr>*:first-child]:sticky [&_tr>*:first-child]:left-0 [&_tr>*:first-child]:z-1 [&_tr>*:first-child]:shadow-[1px_0_var(--color-line)]",
        )}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr>{children}</tr>
    </thead>
  );
}

export function TableBody({ children }: { children: ReactNode }) {
  return <tbody className="[&>tr:last-child>td]:border-b-0">{children}</tbody>;
}

export function TableRow({ children }: { children: ReactNode }) {
  return <tr className="hover:bg-surface-hover">{children}</tr>;
}

/** A column heading; `numeric` right-aligns it to match its amounts. */
export function TableHeader({ children, numeric = false }: { children?: ReactNode; numeric?: boolean }) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-line bg-surface-subtle px-4.5 py-3 text-label font-medium text-muted",
        numeric && "text-right",
      )}
    >
      {children}
    </th>
  );
}

/** A data cell; `numeric` right-aligns with tabular figures. */
export function TableCell({ children, numeric = false }: { children: ReactNode; numeric?: boolean }) {
  return (
    <td className={cn("border-b border-line-soft px-4.5 py-3.5", numeric && "text-right tabular-nums")}>
      {children}
    </td>
  );
}
