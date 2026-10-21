import { sql } from "drizzle-orm";
import { check, index, integer, numeric, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { employees } from "./employees";
import { countries, currencies, departments } from "./lookups";

// docs/data-model.md › Salary history. Append-only: the app role may only SELECT and INSERT.
// `changed_at` is timestamptz; a revision's UTC date is `(changed_at at time zone 'UTC')::date`.

export const salaryHistory = pgTable(
  "salary_history",
  {
    id: text()
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    employee_id: text()
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    revision: integer().notNull(),
    annual_base_pay: numeric({ precision: 18, scale: 2 }).notNull(),
    currency_code: text()
      .notNull()
      .references(() => currencies.code, { onDelete: "restrict" }),
    work_country_code_at_change: text()
      .notNull()
      .references(() => countries.code, { onDelete: "restrict" }),
    department_id_at_change: text()
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    changed_by: text()
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    changed_at: timestamp({ withTimezone: true }).notNull(),
    reason: text().notNull(),
  },
  (t) => [
    // Also serves history ordered by revision for one employee.
    unique("salary_history_employee_id_revision_unique").on(t.employee_id, t.revision),
    index("salary_history_changed_at_employee_id_idx").on(t.changed_at, t.employee_id),
    check("salary_history_annual_base_pay_positive", sql`${t.annual_base_pay} > 0 and ${t.annual_base_pay} <> 'NaN'`),
    check("salary_history_revision_positive", sql`${t.revision} > 0`),
  ],
);
