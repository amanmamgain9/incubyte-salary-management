// Search-param parsing shared by server pages (`await props.searchParams`) and `useUrlState` (client), so both
// build the same query input from the same URL.
import type { z } from "zod";

export type RawSearchParams = URLSearchParams | Readonly<Record<string, string | string[] | undefined>>;

/** First value of each key, as plain strings. */
function firstValues(raw: RawSearchParams): Record<string, string> {
  const values: Record<string, string> = {};
  if (raw instanceof URLSearchParams) {
    for (const key of new Set(raw.keys())) values[key] = raw.get(key) ?? "";
    return values;
  }
  for (const [key, value] of Object.entries(raw)) {
    const first = Array.isArray(value) ? value[0] : value;
    if (first !== undefined) values[key] = first;
  }
  return values;
}

/**
 * Parses URL params with a screen's schema. Schemas `.catch()` every field, so a hand-edited URL falls back to
 * defaults instead of throwing.
 */
export function parseSearchParams<S extends z.ZodType>(schema: S, raw: RawSearchParams): z.output<S> {
  return schema.parse(firstValues(raw));
}

/**
 * Applies a patch to the current params and returns the new query string (without `?`). Blank and undefined
 * values remove their key. Patching any key but `cursor` itself and the caller's `keepsCursor` (params that do not
 * change what the page lists, such as a dialog over it) also removes `cursor`, because a cursor is only valid for the
 * filters it was issued with.
 */
export function patchSearchParams(
  current: URLSearchParams,
  patch: Readonly<Record<string, string | undefined>>,
  keepsCursor: readonly string[] = [],
): string {
  const next = new URLSearchParams(current);
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined || value.trim() === "") next.delete(key);
    else next.set(key, value);
    if (key !== "cursor" && !keepsCursor.includes(key)) next.delete("cursor");
  }
  return next.toString();
}
