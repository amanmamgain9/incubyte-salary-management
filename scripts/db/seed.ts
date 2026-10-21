// `npm run db:seed`: seeds the demo HR account, then the lookups, as owner (docs/data-generation.md).
// Both steps upsert, so re-running is safe. Employee and salary history rows come after them, in the same transaction.
import { hashPassword } from "better-auth/crypto";
import type { Executor } from "@/server/db/connect";
import { ownerDb } from "@/server/db/owner";
import { account, countries, currencies, departments, user } from "@/server/db/schema";
import { getEnv } from "@/server/env";
import { SEED_LOOKUPS } from "@scripts/data-generation/profiles";

export type HrAccount = { id: string; name: string; email: string; password: string };

/** The demo HR user's stable ID; seeded salary history references it as `changed_by`. */
export const DEMO_HR_ID = "demo-hr";

/**
 * Inserts or refreshes a Better Auth `user` plus its `credential` account, the password hashed with Better Auth's
 * `hashPassword` so normal email/password sign-in verifies it.
 */
export async function upsertHrAccount(db: Executor, hr: HrAccount): Promise<void> {
  const email = hr.email.toLowerCase();
  const password = await hashPassword(hr.password);
  await db
    .insert(user)
    .values({ id: hr.id, name: hr.name, email, emailVerified: true })
    .onConflictDoUpdate({ target: user.id, set: { name: hr.name, email } });
  await db
    .insert(account)
    .values({ id: `${hr.id}-credential`, accountId: hr.id, providerId: "credential", userId: hr.id, password })
    .onConflictDoUpdate({ target: account.id, set: { password } });
}

/** The demo HR account from DEMO_HR_EMAIL / DEMO_HR_PASSWORD. */
export function seedDemoHrAccount(db: Executor): Promise<void> {
  const { DEMO_HR_EMAIL, DEMO_HR_PASSWORD } = getEnv();
  const demo = { id: DEMO_HR_ID, name: "Demo HR Manager", email: DEMO_HR_EMAIL, password: DEMO_HR_PASSWORD };
  return upsertHrAccount(db, demo);
}

/** The 7 countries, 6 currencies and 5 departments; rows that already exist are kept. */
export async function seedLookups(db: Executor): Promise<void> {
  await db.insert(countries).values(SEED_LOOKUPS.countries).onConflictDoNothing();
  await db.insert(currencies).values(SEED_LOOKUPS.currencies).onConflictDoNothing();
  await db.insert(departments).values(SEED_LOOKUPS.departments).onConflictDoNothing();
}

if (import.meta.main) {
  try {
    await ownerDb.transaction(async (tx) => {
      await seedDemoHrAccount(tx);
      await seedLookups(tx);
    });
    console.log("Seeded the demo HR account and lookups.");
  } finally {
    await ownerDb.$client.end();
  }
}
