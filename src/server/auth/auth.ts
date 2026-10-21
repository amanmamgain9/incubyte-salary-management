import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { betterAuth } from "better-auth";
import { db } from "@/server/db/client";
import { account, session, user, verification } from "@/server/db/schema";
import { getEnv } from "@/server/env";

// Login/logout and PostgreSQL-backed cookie sessions (docs/login.md). The demo HR account is seeded, never signed up.
export const auth = betterAuth({
  baseURL: getEnv().APP_URL,
  secret: getEnv().BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
  emailAndPassword: { enabled: true, disableSignUp: true },
  // Every request checks the session row, so expiry and revocation apply immediately.
  session: { cookieCache: { enabled: false } },
});
