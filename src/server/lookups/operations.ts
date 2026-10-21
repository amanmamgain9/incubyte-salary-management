import "server-only";
import type { FieldErrors } from "@/contracts/errors";
import type { LookupsOutput } from "@/contracts/lookups";
import { ValidationError } from "@/server/core/errors";
import type { OperationContext } from "@/server/core/operation-context";
import type { Executor } from "@/server/db/connect";
import {
  countryExists,
  currencyExists,
  departmentExists,
  selectCountries,
  selectCurrencies,
  selectDepartments,
} from "@/server/lookups/queries";

export async function getLookups(op: OperationContext): Promise<LookupsOutput> {
  const [countries, departments, currencies] = await Promise.all([
    selectCountries(op.db),
    selectDepartments(op.db),
    selectCurrencies(op.db),
  ]);
  return { countries, departments, currencies };
}

/** The lookup-code fields a filter or write may carry, under their contract names. */
export type CodeFields = { work_country_code?: string; department_id?: string; salary_currency_code?: string };

type CodeCheck = { field: keyof CodeFields; exists: (db: Executor, code: string) => Promise<boolean>; message: string };

const codeChecks: CodeCheck[] = [
  { field: "work_country_code", exists: countryExists, message: "Unknown country" },
  { field: "department_id", exists: departmentExists, message: "Unknown department" },
  { field: "salary_currency_code", exists: currencyExists, message: "Unknown currency" },
];

/** Throws a ValidationError keyed by each submitted field whose code does not exist; absent fields are not checked. */
export async function assertKnownCodes(op: OperationContext, input: CodeFields): Promise<void> {
  const field_errors: FieldErrors = {};
  await Promise.all(
    codeChecks.map(async ({ field, exists, message }) => {
      const code = input[field];
      if (code !== undefined && !(await exists(op.db, code))) field_errors[field] = message;
    }),
  );
  if (Object.keys(field_errors).length > 0) throw new ValidationError(field_errors);
}
