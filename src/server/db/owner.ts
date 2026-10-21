// Owner-role database for migrate, reset, seed, verify and test setup. Script-safe: no `server-only`.
import { sql } from "drizzle-orm";
import { ownerEnv } from "@/server/env";
import { createDb } from "./connect";

export const ownerDb = createDb(ownerEnv().DATABASE_OWNER_URL);

/** Empties every table in `public` (app and auth) and restarts identities; migrations (schema `drizzle`) stay applied. */
export async function truncatePublicTables(): Promise<void> {
  const { rows } = await ownerDb.execute<{ name: string }>(
    sql`select tablename as name from pg_tables where schemaname = 'public'`,
  );
  if (rows.length === 0) return;
  const tables = sql.join(
    rows.map((row) => sql`public.${sql.identifier(row.name)}`),
    sql`, `,
  );
  await ownerDb.execute(sql`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
}
