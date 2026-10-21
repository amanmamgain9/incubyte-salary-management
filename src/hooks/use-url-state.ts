"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { z } from "zod";
import { parseSearchParams, patchSearchParams } from "@/lib/search-params";

type Patch<S extends z.ZodType> = Partial<Record<keyof z.input<S> & string, string | undefined>>;

/**
 * The only reader/writer of search-param state. `schema` must be a module-level constant (its parse is memoized
 * on it). Patches replace the history entry in place (Next.js keeps `useSearchParams` in sync) and follow
 * `patchSearchParams`: changing a filter drops `cursor`, except for the caller's `keepsCursor` params (a module-level
 * constant too).
 */
export function useUrlState<S extends z.ZodType>(
  schema: S,
  keepsCursor: readonly (keyof z.input<S> & string)[] = [],
): readonly [z.output<S>, (patch: Patch<S>) => void] {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const state = useMemo(() => parseSearchParams(schema, searchParams), [schema, searchParams]);
  const patch = useCallback(
    (changes: Patch<S>) => {
      const query = patchSearchParams(new URLSearchParams(window.location.search), changes, keepsCursor);
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [pathname, keepsCursor],
  );
  return [state, patch] as const;
}
