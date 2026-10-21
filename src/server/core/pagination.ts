import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { DEFAULT_LIMIT, type KeysetFrom, type Page, type Paging } from "@/contracts/paging";
import { type CursorCodec, getCursorCodec } from "@/server/core/cursor";
import { InvalidCursorError } from "@/server/core/errors";

// Signed cursor payload. `range_start` is the 1-based position of the row after `key` (next) or of `key` (previous).
const cursorPayload = z.object({
  scope: z.string(),
  fingerprint: z.string(),
  key: z.array(z.unknown()),
  before: z.boolean(),
  range_start: z.int().min(1),
});
type CursorPayload = z.infer<typeof cursorPayload>;

/**
 * The only pagination implementation: signed keyset cursors bound to `scope` and the input's filters.
 * `keyOf` must return JSON values (strings, numbers) in ORDER BY column order; `fetch` orders by them,
 * reversed when `before`, and returns at most `take` rows.
 */
export async function paginateKeyset<Row, Key extends readonly unknown[]>(args: {
  scope: string;
  input: Paging & Record<string, unknown>;
  keyOf: (row: Row) => Key;
  fetch: (from: KeysetFrom<Key>, take: number) => Promise<Row[]>;
  count: () => Promise<number>;
}): Promise<Page<Row>> {
  const { scope, input, keyOf } = args;
  const codec = getCursorCodec();
  const fingerprint = fingerprintOf(input);
  const c = input.cursor === undefined ? null : readCursor(codec, input.cursor, scope, fingerprint);
  const limit = input.limit ?? DEFAULT_LIMIT;
  // The key was produced by keyOf and signed by us, so it has Key's shape.
  const from: KeysetFrom<Key> = c && { key: c.key as unknown as Key, before: c.before };
  const [rows, total_count] = await Promise.all([args.fetch(from, limit + 1), args.count()]);

  const more = rows.length > limit;
  const items = rows.slice(0, limit);
  if (c?.before) items.reverse();
  const first = items[0];
  const last = items[items.length - 1];
  if (first === undefined || last === undefined) {
    return { items, next_cursor: null, prev_cursor: null, total_count, range_start: 0 };
  }

  const start = !c ? 1 : c.before ? startBefore(c.range_start, items.length, more) : c.range_start;
  const cursorAt = (row: Row, before: boolean, range_start: number) =>
    codec.encode({ scope, fingerprint, key: keyOf(row), before, range_start });
  return {
    items,
    next_cursor: c?.before || more ? cursorAt(last, false, start + items.length) : null,
    prev_cursor: (c?.before ? more : start > 1) ? cursorAt(first, true, start) : null,
    total_count,
    range_start: start,
  };
}

// Going back with no rows left before the page means it is the first page, even if rows changed since.
function startBefore(cursorStart: number, itemCount: number, more: boolean): number {
  return more ? Math.max(1, cursorStart - itemCount) : 1;
}

// Every input key except cursor/limit, sorted; undefined values drop out like absent keys.
function fingerprintOf(input: Readonly<Record<string, unknown>>): string {
  const filters = Object.entries(input)
    .filter(([name]) => name !== "cursor" && name !== "limit")
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return createHash("sha256").update(JSON.stringify(Object.fromEntries(filters))).digest("base64url");
}

function readCursor(codec: CursorCodec, cursor: string, scope: string, fingerprint: string): CursorPayload {
  const parsed = cursorPayload.safeParse(codec.decode(cursor));
  if (!parsed.success || parsed.data.scope !== scope || parsed.data.fingerprint !== fingerprint) {
    throw new InvalidCursorError();
  }
  return parsed.data;
}
