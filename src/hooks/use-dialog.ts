"use client";

import { z } from "zod";
import { useUrlState } from "@/hooks/use-url-state";

type Names = readonly [string, ...string[]];

/** What `dialogParams` builds: the open dialog and the saved notice, each one of the feature's names or none. */
type DialogSchema<D extends string, N extends string> = z.ZodType<
  { dialog?: D | undefined; saved?: N | undefined },
  { dialog?: unknown; saved?: unknown }
>;

/**
 * The URL schema of a feature's dialogs: `?dialog=` names the modal open over the page, `?saved=` the notice a save
 * leaves behind. Unknown values fall back to none. Build it once at module level in the feature that owns the names.
 */
export function dialogParams<const D extends Names, const N extends Names>(
  dialogs: D,
  notices: N,
): DialogSchema<D[number], N[number]> {
  return z.object({
    dialog: z.enum(dialogs).optional().catch(undefined),
    saved: z.enum(notices).optional().catch(undefined),
  });
}

/** The `?dialog=` modal layered over the current page, and the `?saved=` notice left after a successful save. */
export function useDialog<D extends string, N extends string>(params: DialogSchema<D, N>) {
  const [{ dialog, saved }, patch] = useUrlState(params);
  return {
    current: dialog ?? null,
    saved: saved ?? null,
    open: (name: D) => patch({ dialog: name, saved: undefined }),
    close: (notice?: N) => patch({ dialog: undefined, saved: notice }),
  };
}
