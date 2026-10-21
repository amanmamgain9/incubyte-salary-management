import { asc } from "drizzle-orm";
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
