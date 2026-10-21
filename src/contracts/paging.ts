import { z } from "zod";

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 100;

/** Paging input shared by every list and report: an opaque cursor from a previous page and a page size. */
export const Paging = z.object({
  cursor: z.string().optional(),
  limit: z.int().min(1).max(MAX_LIMIT).optional(),
});
export type Paging = z.infer<typeof Paging>;

/** Page<T> output: `range_start` is the 1-based position of the first item, 0 when empty. */
export function page<Item extends z.ZodType>(item: Item) {
  return z.object({
    items: z.array(item),
    next_cursor: z.string().nullable(),
    prev_cursor: z.string().nullable(),
    total_count: z.int().min(0),
    range_start: z.int().min(0),
  });
}
export type Page<T> = z.infer<ReturnType<typeof page<z.ZodType<T>>>>;
