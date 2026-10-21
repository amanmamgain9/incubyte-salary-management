import type { ReactNode } from "react";

/** A white data surface. Never nest cards. */
export function Card({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <section
      aria-label={label}
      className="overflow-hidden rounded-surface border border-line bg-surface shadow-surface"
    >
      {children}
    </section>
  );
}
