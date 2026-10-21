"use client";

import { z } from "zod";
import { useUrlState } from "@/hooks/use-url-state";

const DialogParams = z.object({
  dialog: z.enum(["create", "edit", "salary"]).optional().catch(undefined),
  saved: z.enum(["created", "details", "salary"]).optional().catch(undefined),
});

export type DialogName = NonNullable<z.output<typeof DialogParams>["dialog"]>;
export type SavedNotice = NonNullable<z.output<typeof DialogParams>["saved"]>;

/** The `?dialog=` modal layered over the current page, and the `?saved=` notice left after a successful save. */
export function useDialog() {
  const [{ dialog, saved }, patch] = useUrlState(DialogParams);
  return {
    current: dialog ?? null,
    saved: saved ?? null,
    open: (name: DialogName) => patch({ dialog: name, saved: undefined }),
    close: (notice?: SavedNotice) => patch({ dialog: undefined, saved: notice }),
  };
}
