// The only module that imports `pg` or creates a Pool. Script-safe: no `server-only`.
import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgDatabase, PgTransaction } from "drizzle-orm/pg-core";
import { Pool } from "pg";

/** A Drizzle database on its own pool; scripts and test setup close it with `db.$client.end()`. */
export function createDb(url: string) {
  return drizzle({ client: new Pool({ connectionString: url }) });
}

export type Database = ReturnType<typeof createDb>;

/** The same server and credentials as `url`, on the disposable sibling database `<name><suffix>` (`acme` → `acme_e2e`). */
export function siblingDatabaseUrl(url: string, suffix: "_test" | "_e2e"): string {
  const sibling = new URL(url);
  sibling.pathname = `/${encodeURIComponent(databaseName(url) + suffix)}`;
  return sibling.href;
}

/** The database a connection URL names. */
export function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1));
}

/** What a `queries.ts` function runs on when it works either way: the database or a transaction inside it. */
export type Executor = PgDatabase<NodePgQueryResultHKT>;

/**
 * A transaction from `db.transaction(...)`. Functions that rely on running inside one take `Tx`, never `Executor`:
 * row locks held until commit, lock-then-write sequences, `SET LOCAL` and `ON COMMIT DROP` temporary tables.
 */
export type Tx = PgTransaction<NodePgQueryResultHKT, Record<string, never>, ExtractTablesWithRelations<Record<string, never>>>;
