// Playwright `setup` project (runs before every spec): drop/create and migrate `<db>_e2e`, then seed the demo HR
// account and the lookups with `npm run db:seed`'s own steps (no generated employees: specs arrange their data).
// The dev database is never touched.
import { test as setup } from "@playwright/test";
import { createDb } from "@/server/db/connect";
import { recreateMigratedDatabase } from "@/server/db/owner";
import { seedDemoHrAccount, seedLookups } from "@scripts/db/seed";

setup("recreate, migrate and seed the e2e database", async () => {
  const db = createDb(await recreateMigratedDatabase("_e2e"));
  try {
    await db.transaction(async (tx) => {
      await seedDemoHrAccount(tx);
      await seedLookups(tx);
    });
  } finally {
    await db.$client.end();
  }
});
