import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

const tones = {
  info: "bg-accent-soft text-accent-ink",
  success: "bg-positive-soft text-positive-ink",
  error: "bg-negative-soft text-negative-ink",
} as const;

/** An inline notice. Errors interrupt assistive tech (`role="alert"`); other tones are polite status messages. */
export function Alert({
  tone,
  children,
  action,
}: {
  tone: keyof typeof tones;
  children: ReactNode;
  /** Optional follow-up control, e.g. a reload or retry button. */
  action?: ReactNode;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("mb-4 rounded-control px-3 py-2.5 text-body", tones[tone])}
    >
      {children}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
