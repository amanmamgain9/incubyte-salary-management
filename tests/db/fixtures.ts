import { eq } from "drizzle-orm";
import type { Country, Currency, Department } from "@/contracts/lookups";
import { ownerDb } from "@/server/db/owner";
import { countries, currencies, departments, employees, salaryHistory } from "@/server/db/schema";
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

export type EmployeeRow = typeof employees.$inferSelect;

/**
 * An employee with its initial salary (revision 1, `Initial salary`, at 09:00 UTC on the joining date), inserted as
 * owner. Needs the default lookups and an HR user (`changed_by`, default `hr-1`).
 */
export async function insertEmployee(
  overrides: Partial<Omit<EmployeeRow, "salary_revision">> = {},
  changed_by = "hr-1",
): Promise<EmployeeRow> {
  const employee: EmployeeRow = {
    id: "E-0001",
    name: "Asha Rao",
    department_id: "engineering",
    work_country_code: "IN",
    joining_date: "2024-01-15",
    last_working_day: null,
    annual_base_pay: "1200000.00",
    salary_currency_code: "INR",
    ...overrides,
    salary_revision: 1,
  };
  await ownerDb.insert(employees).values(employee);
  await ownerDb.insert(salaryHistory).values({
    employee_id: employee.id,
    revision: 1,
    annual_base_pay: employee.annual_base_pay,
    currency_code: employee.salary_currency_code,
    work_country_code_at_change: employee.work_country_code,
    department_id_at_change: employee.department_id,
    changed_by,
    changed_at: new Date(`${employee.joining_date}T09:00:00Z`),
    reason: "Initial salary",
  });
  return employee;
}

/**
 * Appends the employee's next revision as owner (as the seed would) and moves its current pay and
 * `salary_revision` to it; amount and currency default to the current ones.
 */
export async function insertSalaryRevision(
  employee: EmployeeRow,
  entry: { changed_at: Date; annual_base_pay?: string; currency_code?: string; changed_by?: string },
): Promise<EmployeeRow> {
  const next: EmployeeRow = {
    ...employee,
    annual_base_pay: entry.annual_base_pay ?? employee.annual_base_pay,
    salary_currency_code: entry.currency_code ?? employee.salary_currency_code,
    salary_revision: employee.salary_revision + 1,
  };
  await ownerDb.insert(salaryHistory).values({
    employee_id: employee.id,
    revision: next.salary_revision,
    annual_base_pay: next.annual_base_pay,
    currency_code: next.salary_currency_code,
    work_country_code_at_change: employee.work_country_code,
    department_id_at_change: employee.department_id,
    changed_by: entry.changed_by ?? "hr-1",
    changed_at: entry.changed_at,
    reason: "Annual review",
  });
  await ownerDb
    .update(employees)
    .set({
      annual_base_pay: next.annual_base_pay,
      salary_currency_code: next.salary_currency_code,
      salary_revision: next.salary_revision,
    })
    .where(eq(employees.id, employee.id));
  return next;
}
