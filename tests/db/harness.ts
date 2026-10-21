import { sql } from "drizzle-orm";
import { ownerDb } from "@/server/db/owner";

/** Empties every app and auth table (all of `public`) as owner. Call in each db test file's `beforeEach`. */
export async function resetTables(): Promise<void> {
  const current = await ownerDb.execute<{ database: string }>(sql`select current_database() as database`);
  // Without tests/db/setup.ts the URLs would still name the dev database; never truncate that.
  if (!current.rows[0]?.database.endsWith("_test")) {
    throw new Error("resetTables only runs against a `_test` database");
  }
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
