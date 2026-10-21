import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  positive: "bg-status-active-soft text-status-active",
  muted: "bg-status-departed-soft text-status-departed",
  accent: "bg-status-upcoming-soft text-status-upcoming",
  neutral: "bg-status-neutral-soft text-status-neutral",
} as const;

export type BadgeTone = keyof typeof tones;

/** A short status label. `dot` adds a leading marker for states (active, departed…). */
export function Badge({ tone, dot = false, children }: { tone: BadgeTone; dot?: boolean; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-label font-medium whitespace-nowrap",
        dot && "before:size-1 before:rounded-full before:bg-current",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
