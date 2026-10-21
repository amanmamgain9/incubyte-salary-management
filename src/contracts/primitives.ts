import { z } from "zod";

/** ISO 3166-1 alpha-2 country code, e.g. `IN`. */
export const CountryCode = z.string().regex(/^[A-Z]{2}$/, "Use a two-letter country code");
/** ISO 4217 currency code, e.g. `INR`. */
export const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code");
export const DepartmentId = z.string().min(1).max(64);

// Output array caps (docs/trpc-contracts.md › Array limits).
export const MAX_COUNTRIES = 250;
export const MAX_CURRENCIES = 200;
export const MAX_DEPARTMENTS = 100;
