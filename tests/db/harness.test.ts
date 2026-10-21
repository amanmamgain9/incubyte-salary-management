import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { ownerDb } from "@/server/db/owner";
import { resetTables } from "./harness";

describe("database test harness", () => {
  it("connects the app as the app role to the `_test` database", async () => {
    const { rows } = await db.execute<{ database: string; role: string }>(
      sql`select current_database() as database, current_user as role`,
    );

    expect(rows).toEqual([{ database: expect.stringMatching(/_test$/) as unknown, role: "acme_app" }]);
  });

  it("resetTables empties every public table and restarts its identity", async () => {
    await ownerDb.execute(sql`create table harness_probe (id integer generated always as identity primary key)`);
    try {
      await ownerDb.execute(sql`insert into harness_probe default values`);
      await resetTables();
      await ownerDb.execute(sql`insert into harness_probe default values`);
      const { rows } = await ownerDb.execute<{ id: number }>(sql`select id from harness_probe`);

      expect(rows).toEqual([{ id: 1 }]);
    } finally {
      await ownerDb.execute(sql`drop table harness_probe`);
    }
  });
});
