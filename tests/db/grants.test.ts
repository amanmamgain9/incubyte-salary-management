import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { countries, currencies, departments, employees, salaryHistory } from "@/server/db/schema";
import { insertEmployee, insertHrUser, insertLookups } from "./fixtures";
import { resetTables } from "./harness";

// Exactly what the app role may do on each public table (src/server/AGENTS.md › Data access).
const betterAuthTable = ["SELECT", "INSERT", "UPDATE", "DELETE"];
const expectedPrivileges: Record<string, string[]> = {
  countries: ["SELECT"],
  currencies: ["SELECT"],
  departments: ["SELECT"],
  employees: ["SELECT", "INSERT", "UPDATE"],
  salary_history: ["SELECT", "INSERT"],
  user: betterAuthTable,
  session: betterAuthTable,
  account: betterAuthTable,
  verification: betterAuthTable,
};

const privileges = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"];

const permissionDenied = { cause: { code: "42501" } };

beforeEach(resetTables);

describe("app role grants", () => {
  it("grants the app role exactly its planned privileges on every public table", async () => {
    const { rows } = await db.execute<{ table_name: string; privilege: string; granted: boolean }>(sql`
      select t.tablename as table_name, p.privilege,
             has_table_privilege(current_user, format('public.%I', t.tablename), p.privilege) as granted
      from pg_tables t
      cross join unnest(array[${sql.join(privileges.map((name) => sql`${name}`), sql`, `)}]::text[]) as p(privilege)
      where t.schemaname = 'public'
    `);
    const granted: Record<string, string[]> = {};
    for (const row of rows) {
      granted[row.table_name] ??= [];
      if (row.granted) granted[row.table_name]?.push(row.privilege);
    }

    expect(granted).toEqual(expectedPrivileges);
  });

  it("lets the app role read lookups but not write them", async () => {
    await expect(db.select().from(countries)).resolves.toEqual([]);
    await expect(db.insert(countries).values({ code: "IN", name: "India" })).rejects.toMatchObject(permissionDenied);
    await expect(db.update(currencies).set({ name: "Euro" })).rejects.toMatchObject(permissionDenied);
    await expect(db.delete(departments)).rejects.toMatchObject(permissionDenied);
  });

  it("lets the app role append and read salary history but never change or delete it", async () => {
    await insertLookups();
    await insertHrUser();
    const employee = await insertEmployee();
    await db.insert(salaryHistory).values({
      employee_id: employee.id,
      revision: 2,
      annual_base_pay: "1300000.00",
      currency_code: "INR",
      work_country_code_at_change: "IN",
      department_id_at_change: "engineering",
      changed_by: "hr-1",
      changed_at: new Date("2025-04-01T10:00:00Z"),
      reason: "Annual review",
    });

    await expect(db.select().from(salaryHistory)).resolves.toHaveLength(2);
    await expect(db.update(salaryHistory).set({ reason: "Edited" })).rejects.toMatchObject(permissionDenied);
    await expect(db.delete(salaryHistory)).rejects.toMatchObject(permissionDenied);
  });

  it("lets the app role keep employees but never delete one", async () => {
    await insertLookups();
    await insertHrUser();
    await insertEmployee();

    await expect(db.update(employees).set({ name: "Asha R." })).resolves.toBeDefined();
    await expect(db.delete(employees)).rejects.toMatchObject(permissionDenied);
  });
});
