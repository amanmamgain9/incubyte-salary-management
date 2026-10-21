// Owner-role database for migrate, reset, seed, verify and test setup. Script-safe: no `server-only`.
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { ownerEnv } from "@/server/env";
import { createDb, databaseName, siblingDatabaseUrl } from "./connect";

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

/**
 * Test-suite setup: drops and recreates the dev database's `_test` or `_e2e` sibling as owner and applies drizzle/.
 * Never touches the dev database itself. Returns the sibling's owner URL.
 */
export async function recreateMigratedDatabase(suffix: "_test" | "_e2e"): Promise<string> {
  const devOwnerUrl = ownerEnv().DATABASE_OWNER_URL;
  const url = siblingDatabaseUrl(devOwnerUrl, suffix);
  const name = sql.identifier(databaseName(url));
  const server = createDb(devOwnerUrl);
  try {
    await server.execute(sql`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await server.execute(sql`CREATE DATABASE ${name}`);
  } finally {
    await server.$client.end();
  }
  const sibling = createDb(url);
  try {
    await migrate(sibling, { migrationsFolder: "drizzle" });
  } finally {
    await sibling.$client.end();
  }
  return url;
}
