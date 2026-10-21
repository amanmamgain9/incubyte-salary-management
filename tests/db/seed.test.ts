import { asc, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { ownerDb } from "@/server/db/owner";
import { employees, salaryHistory } from "@/server/db/schema";
import { generateDataset } from "@scripts/data-generation/generate";
import { DEMO_HR_ID, seedDemoHrAccount, seedEmployees, seedLookups } from "@scripts/db/seed";
import { resetTables } from "./harness";

beforeEach(resetTables);

const dataset = generateDataset({ seed: "db-test", as_of: "2026-10-21", changed_by: DEMO_HR_ID });
const countRows = async (table: typeof employees | typeof salaryHistory) => {
  const [row] = await ownerDb.select({ count: sql<number>`count(*)::int` }).from(table);
  return row?.count;
};

describe("seedEmployees", () => {
  it("inserts every generated employee and history entry within the database constraints", async () => {
    await seedDemoHrAccount(ownerDb);
    await seedLookups(ownerDb);
    await seedEmployees(ownerDb, dataset);

    expect(await countRows(employees)).toBe(10_000);
    expect(await countRows(salaryHistory)).toBe(dataset.history.length);
    const [first] = await ownerDb.select().from(employees).where(eq(employees.id, "E-00001"));
    expect(first).toEqual(dataset.employees[0]);
    const history = await ownerDb
      .select()
      .from(salaryHistory)
      .where(eq(salaryHistory.employee_id, "E-00001"))
      .orderBy(asc(salaryHistory.revision));
    expect(history).toEqual(dataset.history.filter((entry) => entry.employee_id === "E-00001"));
  }, 60_000); // ~42,000 history rows with five foreign keys each

  it("refuses to seed on top of existing employees and leaves them unchanged", async () => {
    const one = {
      employees: dataset.employees.slice(0, 1),
      history: dataset.history.filter((entry) => entry.employee_id === dataset.employees[0]?.id),
    };
    await seedDemoHrAccount(ownerDb);
    await seedLookups(ownerDb);
    await seedEmployees(ownerDb, one);

    await expect(seedEmployees(ownerDb, dataset)).rejects.toThrow("run `npm run db:reset` before reseeding");
    expect(await countRows(employees)).toBe(1);
  });
});
