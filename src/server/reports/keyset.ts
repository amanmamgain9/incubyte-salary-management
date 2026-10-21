// Keyset paging SQL shared by report queries: compare and order rows by a report's sort key.
// Script-safe: no `server-only`.
import { type AnyColumn, asc, desc, type SQL, sql } from "drizzle-orm";
import type { KeysetFrom } from "@/contracts/paging";

/** One sort key column, or an expression such as a formatted month. */
type KeyPart = AnyColumn | SQL;

/** SQL: the row's sort key comes after `from.key` (before it when `from.before`); `true` on the first page. */
export function pastKey(key: readonly KeyPart[], from: KeysetFrom<readonly (string | number)[]>): SQL {
  if (from === null) return sql`true`;
  const columns = sql.join([...key], sql`, `);
  const values = sql.join(
    from.key.map((value) => sql`${value}`),
    sql`, `,
  );
  return from.before ? sql`(${columns}) < (${values})` : sql`(${columns}) > (${values})`;
}

/** ORDER BY for a keyset page: the sort key ascending, or descending when reading backwards from a cursor. */
export function keyOrder(key: readonly KeyPart[], from: KeysetFrom<unknown>): SQL {
  return sql.join(
    key.map((part) => (from?.before ? desc(part) : asc(part))),
    sql`, `,
  );
}
