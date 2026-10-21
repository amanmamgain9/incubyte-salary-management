import { z } from "zod";
import {
  CountryCode,
  CurrencyCode,
  DepartmentId,
  MAX_COUNTRIES,
  MAX_CURRENCIES,
  MAX_DEPARTMENTS,
} from "@/contracts/primitives";

export const Country = z.object({ code: CountryCode, name: z.string() });
export type Country = z.infer<typeof Country>;

export const Department = z.object({ id: DepartmentId, name: z.string() });
export type Department = z.infer<typeof Department>;

export const Currency = z.object({ code: CurrencyCode, name: z.string() });
export type Currency = z.infer<typeof Currency>;

/** `lookups.get` output: every list sorted by name. */
export const LookupsOutput = z.object({
  countries: z.array(Country).max(MAX_COUNTRIES),
  departments: z.array(Department).max(MAX_DEPARTMENTS),
  currencies: z.array(Currency).max(MAX_CURRENCIES),
});
export type LookupsOutput = z.infer<typeof LookupsOutput>;
