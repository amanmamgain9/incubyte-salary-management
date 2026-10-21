import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Results that stay visible (dimmed, `aria-busy`) while the next filter or page result loads (`useDeferredValue`). */
export function DeferredContent({ stale, children }: { stale: boolean; children: ReactNode }) {
  return (
    <div aria-busy={stale} className={cn("transition-opacity", stale && "opacity-60")}>
      {children}
    </div>
  );
}
