import { cn } from "@/lib/cn";

export type MiniBar = { label: string; value: number; description: string };

/** The overview's small bar visual (up to ~7 bars, largest first, short labels below); no axes. */
export function MiniBars({ bars }: { bars: readonly MiniBar[] }) {
  const max = Math.max(1, ...bars.map((bar) => bar.value));
  return (
    <div>
      <div
        role="img"
        aria-label={bars.map((bar) => bar.description).join(", ")}
        className="flex h-13.5 items-end gap-1.5"
      >
        {bars.map((bar, index) => (
          <span
            key={bar.label}
            title={bar.description}
            className={cn("min-w-0.75 flex-1 rounded-t-[3px] rounded-b-[1px]", index === 0 ? "bg-accent" : "bg-chart-primary")}
            style={{ height: `${Math.max(4, (bar.value / max) * 100)}%` }}
          />
        ))}
      </div>
      <div aria-hidden="true" className="mt-0.75 flex gap-1.5 text-label text-muted">
        {bars.map((bar) => (
          <span key={bar.label} className="min-w-0 flex-1 truncate text-center">
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}
