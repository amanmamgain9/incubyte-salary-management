import { asc, eq } from "drizzle-orm";
import type { Country, Currency, Department } from "@/contracts/lookups";
import type { Executor } from "@/server/db/connect";
import { countries, currencies, departments } from "@/server/db/schema";

// Lookups list in name order (for pickers); the key breaks ties.

export function selectCountries(db: Executor): Promise<Country[]> {
  return db
    .select({ code: countries.code, name: countries.name })
    .from(countries)
    .orderBy(asc(countries.name), asc(countries.code));
}

export function selectDepartments(db: Executor): Promise<Department[]> {
  return db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .orderBy(asc(departments.name), asc(departments.id));
}

export function selectCurrencies(db: Executor): Promise<Currency[]> {
  return db
    .select({ code: currencies.code, name: currencies.name })
    .from(currencies)
    .orderBy(asc(currencies.name), asc(currencies.code));
}

// Existence checks for codes named by filters and writes; each matches at most one row by primary key.

export async function countryExists(db: Executor, code: string): Promise<boolean> {
  const rows = await db.select({ code: countries.code }).from(countries).where(eq(countries.code, code));
  return rows.length > 0;
}

export async function departmentExists(db: Executor, id: string): Promise<boolean> {
  const rows = await db.select({ id: departments.id }).from(departments).where(eq(departments.id, id));
  return rows.length > 0;
}

export async function currencyExists(db: Executor, code: string): Promise<boolean> {
  const rows = await db.select({ code: currencies.code }).from(currencies).where(eq(currencies.code, code));
  return rows.length > 0;
}
