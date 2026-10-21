// Playwright `setup` project (runs before every spec): drop/create and migrate `<db>_e2e`, then seed the demo HR
// account, the lookups and a small generated workforce (the first employees of GB, DE and SG, with their salary
// histories, from the deterministic generator as of today) with `npm run db:seed`'s own steps. Other specs arrange
// their own data in IN, US, CA and FR. The dev database is never touched.
import { test as setup } from "@playwright/test";
import { todayUtc } from "@/lib/dates";
import { createDb } from "@/server/db/connect";
import { recreateMigratedDatabase } from "@/server/db/owner";
import { generateDataset } from "@scripts/data-generation/generate";
import { DEMO_HR_ID, seedDemoHrAccount, seedEmployees, seedLookups } from "@scripts/db/seed";

const SEEDED_COUNTRIES = ["GB", "DE", "SG"];
const EMPLOYEES_PER_COUNTRY = 8;

/** The first employees (by ID: the longest histories) of each seeded country, with their history. */
function e2eWorkforce() {
  const dataset = generateDataset({ seed: "e2e", as_of: todayUtc(new Date()), changed_by: DEMO_HR_ID });
  const employees = SEEDED_COUNTRIES.flatMap((country) =>
    dataset.employees.filter((employee) => employee.work_country_code === country).slice(0, EMPLOYEES_PER_COUNTRY),
  );
  const ids = new Set(employees.map((employee) => employee.id));
  return { employees, history: dataset.history.filter((entry) => ids.has(entry.employee_id)) };
}

setup("recreate, migrate and seed the e2e database", async () => {
  const db = createDb(await recreateMigratedDatabase("_e2e"));
  try {
    await db.transaction(async (tx) => {
      await seedDemoHrAccount(tx);
      await seedLookups(tx);
      await seedEmployees(tx, e2eWorkforce());
    });
  } finally {
    await db.$client.end();
  }
});
