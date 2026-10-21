// `npm run db:seed [-- --seed <text>] [--as-of YYYY-MM-DD]`: seeds the demo HR account, the lookups, then the
// generated 10,000 employees and their salary history, as owner in one transaction (docs/data-generation.md).
// The HR account and lookups upsert; employees go only into an empty table (reseeding needs `npm run db:reset`).
import { parseArgs } from "node:util";
import { hashPassword } from "better-auth/crypto";
import { IsoDate } from "@/contracts/primitives";
import { todayUtc } from "@/lib/dates";
import type { Executor } from "@/server/db/connect";
import { ownerDb } from "@/server/db/owner";
import { account, countries, currencies, departments, employees, salaryHistory, user } from "@/server/db/schema";
import { getEnv } from "@/server/env";
import { type Dataset, generateDataset } from "@scripts/data-generation/generate";
import { SEED_LOOKUPS } from "@scripts/data-generation/profiles";

export type HrAccount = { id: string; name: string; email: string; password: string };

/** The demo HR user's stable ID; seeded salary history references it as `changed_by`. */
export const DEMO_HR_ID = "demo-hr";

/** The generator seed used when `--seed` is not given. */
const DEFAULT_SEED = "acme";

/** `--seed` and `--as-of` from the command line; `as_of` stays undefined when not given. */
export function parseDatasetOptions(args: string[]): { seed: string; as_of: string | undefined } {
  const { values } = parseArgs({ args, options: { seed: { type: "string" }, "as-of": { type: "string" } } });
  const asOf = values["as-of"];
  if (asOf !== undefined && !IsoDate.safeParse(asOf).success) throw new Error("--as-of must be a date (YYYY-MM-DD)");
  return { seed: values.seed ?? DEFAULT_SEED, as_of: asOf };
}

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

// PostgreSQL binds at most 65,535 parameters per statement; employees have 9 columns, history entries 10.
const EMPLOYEE_BATCH = 5_000;
const HISTORY_BATCH = 6_000;

/**
 * Bulk-inserts a generated dataset's employees and salary history. Refuses when any employee exists, so a reseed
 * never mixes datasets; needs the lookups and the history's `changed_by` user.
 */
export async function seedEmployees(db: Executor, dataset: Pick<Dataset, "employees" | "history">): Promise<void> {
  const existing = await db.select({ id: employees.id }).from(employees).limit(1);
  if (existing.length > 0) throw new Error("Employees already exist; run `npm run db:reset` before reseeding.");
  for (let i = 0; i < dataset.employees.length; i += EMPLOYEE_BATCH) {
    await db.insert(employees).values(dataset.employees.slice(i, i + EMPLOYEE_BATCH));
  }
  for (let i = 0; i < dataset.history.length; i += HISTORY_BATCH) {
    await db.insert(salaryHistory).values(dataset.history.slice(i, i + HISTORY_BATCH));
  }
}

if (import.meta.main) {
  try {
    const options = parseDatasetOptions(process.argv.slice(2));
    const as_of = options.as_of ?? todayUtc(new Date());
    const started = performance.now();
    const dataset = generateDataset({ seed: options.seed, as_of, changed_by: DEMO_HR_ID });
    const generated = performance.now();
    await ownerDb.transaction(async (tx) => {
      await seedDemoHrAccount(tx);
      await seedLookups(tx);
      await seedEmployees(tx, dataset);
    });
    const seconds = (from: number, to: number) => ((to - from) / 1000).toFixed(1);
    console.log(
      `Seeded the demo HR account, lookups, ${dataset.employees.length} employees and ${dataset.history.length} ` +
        `salary history entries (seed "${options.seed}", as_of ${as_of}) in ${seconds(started, performance.now())}s ` +
        `(generation ${seconds(started, generated)}s).`,
    );
  } finally {
    await ownerDb.$client.end();
  }
}
