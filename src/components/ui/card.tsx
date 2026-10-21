import type { ReactNode } from "react";

/** A white data surface. Never nest cards. */
export function Card({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="mb-5 overflow-hidden rounded-surface border border-line bg-surface shadow-surface last:mb-0"
    >
      {children}
    </section>
  );
}

/** A card's title row with an optional aside (e.g. a badge), above a table or list. */
export function CardHeader({ title, aside }: { title: string; aside?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4.5 py-3.5">
      <h2 className="text-heading">{title}</h2>
      {aside}
    </div>
  );
}
