import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { ownerDb } from "@/server/db/owner";
import { assertKnownCodes } from "@/server/lookups/operations";
import { seedLookups } from "@scripts/db/seed";
import { insertHrUser, insertLookups } from "./fixtures";
import { callerFor, resetTables } from "./harness";

beforeEach(resetTables);

describe("lookups.get", () => {
  it("returns countries, departments and currencies sorted by name", async () => {
    await insertLookups({
      countries: [
        { code: "US", name: "United States" },
        { code: "CA", name: "Canada" },
        { code: "IN", name: "India" },
      ],
      departments: [
        { id: "sales", name: "Sales" },
        { id: "eng", name: "Engineering" },
        { id: "people", name: "People" },
      ],
      currencies: [
        { code: "USD", name: "US Dollar" },
        { code: "EUR", name: "Euro" },
        { code: "INR", name: "Indian Rupee" },
      ],
    });
    const caller = await callerFor(await insertHrUser());

    await expect(caller.lookups.get()).resolves.toEqual({
      countries: [
        { code: "CA", name: "Canada" },
        { code: "IN", name: "India" },
        { code: "US", name: "United States" },
      ],
      departments: [
        { id: "eng", name: "Engineering" },
        { id: "people", name: "People" },
        { id: "sales", name: "Sales" },
      ],
      currencies: [
        { code: "EUR", name: "Euro" },
        { code: "INR", name: "Indian Rupee" },
        { code: "USD", name: "US Dollar" },
      ],
    });
  });

  it("returns the seeded 7 countries, 5 departments and 6 currencies, unchanged by re-seeding", async () => {
    await seedLookups(ownerDb);
    await seedLookups(ownerDb);
    const caller = await callerFor(await insertHrUser());

    const lookups = await caller.lookups.get();

    expect(lookups.countries.map((country) => country.code)).toEqual(["CA", "FR", "DE", "IN", "SG", "GB", "US"]);
    expect(lookups.departments.map((department) => department.id)).toEqual([
      "engineering",
      "finance",
      "operations",
      "people",
      "sales",
    ]);
    expect(lookups.currencies.map((currency) => currency.code)).toEqual(["GBP", "CAD", "EUR", "INR", "SGD", "USD"]);
  });

  it("returns empty lists when no lookups exist", async () => {
    const caller = await callerFor(await insertHrUser());

    await expect(caller.lookups.get()).resolves.toEqual({ countries: [], departments: [], currencies: [] });
  });

  it("rejects a call without a session as UNAUTHORIZED", async () => {
    await insertLookups();
    const caller = await callerFor(null);

    await expect(caller.lookups.get()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("assertKnownCodes", () => {
  const now = new Date("2026-10-21T12:00:00Z");
  const op = { db, actor: { id: "hr-1", name: "Hannah Reyes", email: "hannah@acme.test" }, now, today: "2026-10-21" };

  it("accepts known codes and skips absent fields", async () => {
    await insertLookups();

    await expect(assertKnownCodes(op, { work_country_code: "IN", salary_currency_code: "EUR" })).resolves.toBeUndefined();
  });

  it("rejects every unknown code, keyed by its field", async () => {
    await insertLookups();

    await expect(
      assertKnownCodes(op, { work_country_code: "JP", department_id: "legal", salary_currency_code: "JPY" }),
    ).rejects.toMatchObject({
      field_errors: {
        work_country_code: "Unknown country",
        department_id: "Unknown department",
        salary_currency_code: "Unknown currency",
      },
    });
  });
});
