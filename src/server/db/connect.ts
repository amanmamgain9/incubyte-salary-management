// The only module that imports `pg` or creates a Pool. Script-safe: no `server-only`.
import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { Pool } from "pg";

/** A Drizzle database on its own pool; scripts and test setup close it with `db.$client.end()`. */
export function createDb(url: string) {
  return drizzle({ client: new Pool({ connectionString: url }) });
}

export type Database = ReturnType<typeof createDb>;

/** What a `queries.ts` function runs on: the database or a transaction inside it. */
export type Executor = PgDatabase<NodePgQueryResultHKT>;
