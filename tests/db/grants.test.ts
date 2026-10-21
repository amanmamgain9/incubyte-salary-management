import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { countries, currencies, departments } from "@/server/db/schema";
import { resetTables } from "./harness";

// Exactly what the app role may do on each public table (src/server/AGENTS.md › Data access).
const betterAuthTable = ["SELECT", "INSERT", "UPDATE", "DELETE"];
const expectedPrivileges: Record<string, string[]> = {
  countries: ["SELECT"],
  currencies: ["SELECT"],
  departments: ["SELECT"],
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
});
