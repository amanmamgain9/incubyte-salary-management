import type { ReactNode } from "react";

/** The page's single title and its one primary action. */
export function PageHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex min-h-control flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-4">
      <h1 className="text-title">{title}</h1>
      {action}
    </div>
  );
}
