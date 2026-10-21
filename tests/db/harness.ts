import { sql } from "drizzle-orm";
import { type Context, createContext } from "@/server/api/context";
import { appRouter } from "@/server/api/root";
import { createCallerFactory } from "@/server/api/trpc";
import { auth } from "@/server/auth/auth";
import { ownerDb, truncatePublicTables } from "@/server/db/owner";
import { getEnv } from "@/server/env";
import type { HrUserFixture } from "./fixtures";

/** Empties every app and auth table (all of `public`) as owner. Call in each db test file's `beforeEach`. */
export async function resetTables(): Promise<void> {
  const current = await ownerDb.execute<{ database: string }>(sql`select current_database() as database`);
  // Without tests/db/setup.ts the URLs would still name the dev database; never truncate that.
  if (!current.rows[0]?.database.endsWith("_test")) {
    throw new Error("resetTables only runs against a `_test` database");
  }
  await truncatePublicTables();
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

export type CallOptions = {
  /** The request clock; defaults to the real time. */
  now?: Date;
  /** The `Origin` header; defaults to the app origin, `null` omits it. */
  origin?: string | null;
};

/** The tRPC context a request from `hr` (signed in through Better Auth) or an anonymous client would get. */
export async function contextFor(hr: HrUserFixture | null, options: CallOptions = {}): Promise<Context> {
  const headers = new Headers();
  if (hr) headers.set("cookie", await signIn(hr));
  const origin = options.origin === undefined ? getEnv().appOrigin : options.origin;
  if (origin !== null) headers.set("origin", origin);
  const context = await createContext({ headers });
  return { ...context, now: options.now ?? context.now };
}

/** An appRouter caller for `hr`, or for an anonymous client when `hr` is null. */
export async function callerFor(hr: HrUserFixture | null, options: CallOptions = {}) {
  return createCallerFactory(appRouter)(await contextFor(hr, options));
}
