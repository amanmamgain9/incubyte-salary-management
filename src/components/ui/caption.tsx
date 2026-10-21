import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * A muted secondary line: an ID, timestamp, revision or group detail. `under` adds the small gap it keeps below the
 * primary line it annotates (a name, a revision number).
 */
export function Caption({ children, under = false }: { children: ReactNode; under?: boolean }) {
  return <small className={cn("block text-label text-muted", under && "mt-0.75")}>{children}</small>;
}
