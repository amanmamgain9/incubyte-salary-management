import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/server/db/client";
import { employees, salaryHistory } from "@/server/db/schema";
import { type EmployeeRow, insertEmployee, insertHrUser, insertLookups } from "./fixtures";
import { resetTables } from "./harness";

// SQLSTATEs: unique_violation, check_violation, foreign_key_violation, numeric_value_out_of_range.
const uniqueViolation = { cause: { code: "23505" } };
const checkViolation = { cause: { code: "23514" } };
const foreignKeyViolation = { cause: { code: "23503" } };
const outOfRange = { cause: { code: "22003" } };

const newEmployee = (overrides: Partial<EmployeeRow> = {}): EmployeeRow => ({
  id: "E-0100",
  name: "Ravi Iyer",
  department_id: "engineering",
  work_country_code: "IN",
  joining_date: "2025-03-01",
  last_working_day: null,
  annual_base_pay: "900000.00",
  salary_currency_code: "INR",
  salary_revision: 1,
  ...overrides,
});

const historyEntry = (employee: EmployeeRow, revision: number) => ({
  employee_id: employee.id,
  revision,
  annual_base_pay: employee.annual_base_pay,
  currency_code: employee.salary_currency_code,
  work_country_code_at_change: employee.work_country_code,
  department_id_at_change: employee.department_id,
  changed_by: "hr-1",
  changed_at: new Date("2025-06-01T10:00:00Z"),
  reason: "Annual review",
});

beforeEach(async () => {
  await resetTables();
  await insertLookups();
  await insertHrUser();
});

describe("employees constraints", () => {
  it("rejects a second employee with an existing ID", async () => {
    const existing = await insertEmployee();

    await expect(db.insert(employees).values(newEmployee({ id: existing.id }))).rejects.toMatchObject(uniqueViolation);
  });

  it("rejects a last working day before the joining date", async () => {
    const employee = newEmployee({ joining_date: "2025-03-01", last_working_day: "2025-02-28" });

    await expect(db.insert(employees).values(employee)).rejects.toMatchObject(checkViolation);
  });

  it("accepts a last working day on the joining date", async () => {
    const employee = newEmployee({ joining_date: "2025-03-01", last_working_day: "2025-03-01" });

    await expect(db.insert(employees).values(employee)).resolves.toBeDefined();
  });

  it.each(["0.00", "-1.00", "NaN"])("rejects an annual base pay of %s", async (pay) => {
    await expect(db.insert(employees).values(newEmployee({ annual_base_pay: pay }))).rejects.toMatchObject(
      checkViolation,
    );
  });

  it("rejects a salary revision below 1", async () => {
    await expect(db.insert(employees).values(newEmployee({ salary_revision: 0 }))).rejects.toMatchObject(
      checkViolation,
    );
  });

  it("rejects an unknown department, country or currency", async () => {
    for (const unknown of [{ department_id: "legal" }, { work_country_code: "JP" }, { salary_currency_code: "JPY" }]) {
      await expect(db.insert(employees).values(newEmployee(unknown))).rejects.toMatchObject(foreignKeyViolation);
    }
  });
});

describe("money precision", () => {
  it("stores amounts exactly with two decimal places", async () => {
    await db.insert(employees).values(newEmployee({ annual_base_pay: "9999999999999999.99" }));
    await db.insert(employees).values(newEmployee({ id: "E-0101", annual_base_pay: "1234.5" }));

    const rows = await db.select({ pay: employees.annual_base_pay }).from(employees).orderBy(employees.id);

    expect(rows).toEqual([{ pay: "9999999999999999.99" }, { pay: "1234.50" }]);
  });

  it("rejects amounts beyond 16 integer digits", async () => {
    const employee = newEmployee({ annual_base_pay: "10000000000000000.00" });

    await expect(db.insert(employees).values(employee)).rejects.toMatchObject(outOfRange);
  });
});

describe("salary_history constraints", () => {
  it("rejects a revision number the employee already has", async () => {
    const employee = await insertEmployee();

    await expect(db.insert(salaryHistory).values(historyEntry(employee, 1))).rejects.toMatchObject(uniqueViolation);
  });

  it("allows the same revision number for different employees", async () => {
    const first = await insertEmployee();
    const second = await insertEmployee({ id: "E-0002" });
    await db.insert(salaryHistory).values([historyEntry(first, 2), historyEntry(second, 2)]);

    const rows = await db.select().from(salaryHistory).where(eq(salaryHistory.revision, 2));

    expect(rows).toHaveLength(2);
  });

  it.each([
    ["a revision below 1", { revision: 0 }],
    ["a non-positive amount", { annual_base_pay: "0.00" }],
  ])("rejects %s", async (_case, override) => {
    const employee = await insertEmployee();

    await expect(
      db.insert(salaryHistory).values({ ...historyEntry(employee, 2), ...override }),
    ).rejects.toMatchObject(checkViolation);
  });
});
