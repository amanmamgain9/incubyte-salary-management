import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** A table in its own horizontal scroller, so wide data never overflows the page. */
export function Table({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="w-full overflow-x-auto">
      <table aria-label={label} className="w-full border-collapse text-left text-body whitespace-nowrap">
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
