import { sql } from "drizzle-orm";
import { check, date, index, integer, numeric, pgTable, text } from "drizzle-orm/pg-core";
import { countries, currencies, departments } from "./lookups";

// docs/data-model.md › Employee. IDs are permanent: rows are never deleted (the app role has no DELETE).
// Current pay (annual_base_pay, salary_currency_code, salary_revision) changes only through the salaries module.

export const employees = pgTable(
  "employees",
  {
    id: text().primaryKey(),
    name: text().notNull(),
    department_id: text()
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }),
    work_country_code: text()
      .notNull()
      .references(() => countries.code, { onDelete: "restrict" }),
    joining_date: date({ mode: "string" }).notNull(),
    last_working_day: date({ mode: "string" }),
    annual_base_pay: numeric({ precision: 18, scale: 2 }).notNull(),
    salary_currency_code: text()
      .notNull()
      .references(() => currencies.code, { onDelete: "restrict" }),
    salary_revision: integer().notNull(),
  },
  (t) => [
    index("employees_work_country_code_id_idx").on(t.work_country_code, t.id),
    index("employees_department_id_id_idx").on(t.department_id, t.id),
    // NUMERIC accepts 'NaN' and sorts it above every number, so `> 0` alone would let it through.
    check("employees_annual_base_pay_positive", sql`${t.annual_base_pay} > 0 and ${t.annual_base_pay} <> 'NaN'`),
    check("employees_salary_revision_positive", sql`${t.salary_revision} > 0`),
    check(
      "employees_last_working_day_after_joining",
      sql`${t.last_working_day} is null or ${t.last_working_day} >= ${t.joining_date}`,
    ),
  ],
);
