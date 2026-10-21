import type { Country, Currency, Department } from "@/contracts/lookups";
import { ownerDb } from "@/server/db/owner";
import { countries, currencies, departments } from "@/server/db/schema";
import { type HrAccount, upsertHrAccount } from "@scripts/db/seed";

type LookupRows = { countries: Country[]; departments: Department[]; currencies: Currency[] };

const defaultLookups: LookupRows = {
  countries: [
    { code: "IN", name: "India" },
    { code: "US", name: "United States" },
    { code: "FR", name: "France" },
  ],
  departments: [
    { id: "engineering", name: "Engineering" },
    { id: "finance", name: "Finance" },
  ],
  currencies: [
    { code: "INR", name: "Indian Rupee" },
    { code: "USD", name: "US Dollar" },
    { code: "EUR", name: "Euro" },
  ],
};

/** Inserts lookup rows as owner (the app role only reads them); each list defaults to a small fixed set. */
export async function insertLookups(rows: Partial<LookupRows> = {}): Promise<LookupRows> {
  const lookups = { ...defaultLookups, ...rows };
  if (lookups.countries.length > 0) await ownerDb.insert(countries).values(lookups.countries);
  if (lookups.departments.length > 0) await ownerDb.insert(departments).values(lookups.departments);
  if (lookups.currencies.length > 0) await ownerDb.insert(currencies).values(lookups.currencies);
  return lookups;
}

export type HrUserFixture = HrAccount;

/** An HR user with a credential account, inserted as owner by the seed's own helper. */
export async function insertHrUser(overrides: Partial<HrUserFixture> = {}): Promise<HrUserFixture> {
  const hr = { id: "hr-1", name: "Hannah Reyes", email: "hannah@acme.test", password: "fixture-password-1", ...overrides };
  await upsertHrAccount(ownerDb, hr);
  return hr;
}
