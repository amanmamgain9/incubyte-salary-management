import type { ReactNode } from "react";

/** The compact overview band: scope line, 2–4 `<Stat>`s and an optional visual on the right. */
export function Overview({
  scope,
  children,
  visual,
}: {
  scope: string;
  children: ReactNode;
  visual?: ReactNode;
}) {
  return (
    <section
      aria-label="Overview"
      className="mb-5 flex min-h-29.5 min-w-0 flex-wrap items-center justify-between gap-3 rounded-surface border border-line bg-surface p-4 shadow-surface sm:flex-nowrap sm:gap-6 sm:px-5.5 sm:py-4.5"
    >
      <div className="min-w-0 flex-1 basis-full sm:basis-auto">
        <span className="mb-2.25 block text-label text-muted">{scope}</span>
        <div className="grid min-w-0 auto-cols-fr grid-flow-col gap-3.5 sm:gap-4">{children}</div>
      </div>
      {visual ? (
        <div className="w-full min-w-0 border-t border-line pt-3.5 sm:w-50 sm:flex-none sm:border-t-0 sm:border-l sm:pt-0 sm:pl-4">
          {visual}
        </div>
      ) : null}
    </section>
  );
}
