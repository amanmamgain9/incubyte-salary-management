import { sql } from "drizzle-orm";
import { auth } from "@/server/auth/auth";
import { ownerDb } from "@/server/db/owner";
import type { HrUserFixture } from "./fixtures";

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

/** Signs the user in through Better Auth and returns the `Cookie` header value carrying the session. */
export async function signIn(hr: HrUserFixture): Promise<string> {
  const response = await auth.api.signInEmail({ body: { email: hr.email, password: hr.password }, asResponse: true });
  if (!response.ok) throw new Error(`Sign-in failed with ${response.status}`);
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0])
    .join("; ");
}
