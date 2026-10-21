import { z } from "zod";

/** ISO 3166-1 alpha-2 country code, e.g. `IN`. */
export const CountryCode = z.string().regex(/^[A-Z]{2}$/, "Use a two-letter country code");
/** ISO 4217 currency code, e.g. `INR`. */
export const CurrencyCode = z.string().regex(/^[A-Z]{3}$/, "Use a three-letter currency code");
export const DepartmentId = z.string().min(1).max(64);

/** Permanent employee ID chosen by HR, e.g. `E-00042`: 1–32 letters, digits or hyphens, starting with a letter or digit. */
export const EmployeeId = z
  .string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9-]{0,31}$/, "Use up to 32 letters, digits or hyphens");

/** A calendar date, `YYYY-MM-DD` (impossible dates such as 2025-02-30 are rejected). */
export const IsoDate = z.iso.date("Use a valid date (YYYY-MM-DD)");

/** An instant as an ISO 8601 UTC string, e.g. `2026-10-21T12:00:00.000Z`. */
export const Timestamp = z.iso.datetime();

const MONEY_MESSAGE = "Use a positive amount with at most two decimals";

/** Input money: a positive decimal string with at most two decimals and 16 integer digits (fits NUMERIC(18,2)). */
export const Money = z
  .string()
  .regex(/^\d{1,16}(\.\d{1,2})?$/, MONEY_MESSAGE)
  .refine((amount) => /[1-9]/.test(amount), MONEY_MESSAGE);

/** Output money: an exact signed decimal string with two places, as PostgreSQL `NUMERIC(18,2)` returns it. */
export const Decimal = z.string().regex(/^-?\d+\.\d{2}$/);

// Output array caps (docs/trpc-contracts.md › Array limits).
export const MAX_COUNTRIES = 250;
export const MAX_CURRENCIES = 200;
export const MAX_DEPARTMENTS = 100;
/** Country/currency pairs in a report summary (`by_country` of the department, growth and benchmark reports). */
export const MAX_COUNTRY_CURRENCY_PAIRS = 500;
