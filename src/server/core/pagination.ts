import "server-only";
import type { Page, Paging } from "@/contracts/paging";

/** The only pagination implementation: signed keyset cursors bound to `scope` and the input's filters. */
export async function paginateKeyset<Row, Key extends readonly unknown[]>(_args: {
  scope: string;
  input: Paging & Record<string, unknown>;
  keyOf: (row: Row) => Key;
  fetch: (from: { key: Key; before: boolean } | null, take: number) => Promise<Row[]>;
  count: () => Promise<number>;
}): Promise<Page<Row>> {
  throw new Error("not implemented");
}
