import { asc } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { ownerDb } from "@/server/db/owner";
import { employees, salaryHistory } from "@/server/db/schema";
import { type HrUserFixture, insertEmployee, insertHrUser, insertLookups, insertSalaryRevision } from "./fixtures";
import { callerFor, resetTables } from "./harness";

// Requests run at noon UTC on 2026-10-21, so "today" is 2026-10-21.
const now = new Date("2026-10-21T12:00:00Z");

let hr: HrUserFixture;

beforeEach(async () => {
  await resetTables();
  await insertLookups();
  hr = await insertHrUser();
});

const signedIn = () => callerFor(hr, { now });
const storedHistory = () => ownerDb.select().from(salaryHistory).orderBy(asc(salaryHistory.revision));

describe("employees.create", () => {
  const joiner = {
    id: "E-0100",
    name: "  Ravi Iyer ",
    department_id: "finance",
    work_country_code: "US",
    joining_date: "2026-11-02",
    annual_base_pay: "98500.5",
    salary_currency_code: "USD",
  };

  it("creates the employee at revision 1 and returns its view", async () => {
    await expect((await signedIn()).employees.create(joiner)).resolves.toEqual({
      id: "E-0100",
      name: "Ravi Iyer",
      department_id: "finance",
      work_country_code: "US",
      joining_date: "2026-11-02",
      last_working_day: null,
      annual_base_pay: "98500.50",
      salary_currency_code: "USD",
      salary_revision: 1,
      employment_status: "upcoming",
    });
  });

  it("saves the initial salary as history revision 1 by the signed-in user at request time", async () => {
    await (await signedIn()).employees.create(joiner);

    expect(await storedHistory()).toEqual([
      {
        id: expect.any(String) as unknown,
        employee_id: "E-0100",
        revision: 1,
        annual_base_pay: "98500.50",
        currency_code: "USD",
        work_country_code_at_change: "US",
        department_id_at_change: "finance",
        changed_by: hr.id,
        changed_at: now,
        reason: "Initial salary",
      },
    ]);
  });

  it("rejects an existing ID, even a departed employee's, as CONFLICT keyed by id and saves nothing", async () => {
    await insertEmployee({ id: "E-0100", name: "Asha Rao", last_working_day: "2025-01-31" });

    await expect((await signedIn()).employees.create(joiner)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Employee ID already exists",
      cause: { field_errors: { id: "Employee ID already exists" } },
    });
    expect(await ownerDb.select({ name: employees.name }).from(employees)).toEqual([{ name: "Asha Rao" }]);
    expect(await storedHistory()).toHaveLength(1);
  });

  it("rejects unknown department, country and currency codes, keyed by field", async () => {
    const unknown = { ...joiner, department_id: "legal", work_country_code: "JP", salary_currency_code: "JPY" };

    await expect((await signedIn()).employees.create(unknown)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: {
        field_errors: {
          department_id: "Unknown department",
          work_country_code: "Unknown country",
          salary_currency_code: "Unknown currency",
        },
      },
    });
    expect(await ownerDb.select().from(employees)).toEqual([]);
  });

  it.each(["0", "-5", "100.001"])("rejects an annual base pay of %s as BAD_REQUEST", async (annual_base_pay) => {
    await expect((await signedIn()).employees.create({ ...joiner, annual_base_pay })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("rejects a create from another origin as FORBIDDEN", async () => {
    const caller = await callerFor(hr, { now, origin: "https://evil.example" });

    await expect(caller.employees.create(joiner)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("employees.update", () => {
  it("changes only the submitted details and keeps pay and history", async () => {
    await insertEmployee({ id: "E-1", name: "Asha Rao", department_id: "engineering", work_country_code: "IN" });

    const updated = await (await signedIn()).employees.update({ id: "E-1", department_id: "finance", work_country_code: "FR" });

    expect(updated).toMatchObject({
      name: "Asha Rao",
      department_id: "finance",
      work_country_code: "FR",
      annual_base_pay: "1200000.00",
      salary_currency_code: "INR",
      salary_revision: 1,
    });
    expect(await storedHistory()).toMatchObject([{ work_country_code_at_change: "IN", department_id_at_change: "engineering" }]);
  });

  it("records a departure with a last working day and clears it with null", async () => {
    await insertEmployee({ id: "E-1", joining_date: "2024-01-15" });
    const caller = await signedIn();

    await expect(caller.employees.update({ id: "E-1", last_working_day: "2026-10-20" })).resolves.toMatchObject({
      last_working_day: "2026-10-20",
      employment_status: "departed",
    });
    await expect(caller.employees.update({ id: "E-1", last_working_day: null })).resolves.toMatchObject({
      last_working_day: null,
      employment_status: "active",
    });
  });

  it("rejects a last working day before the joining date, keyed by field, and saves nothing", async () => {
    await insertEmployee({ id: "E-1", joining_date: "2024-01-15" });

    await expect(
      (await signedIn()).employees.update({ id: "E-1", name: "Changed", last_working_day: "2024-01-14" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { field_errors: { last_working_day: "Must be on or after the joining date" } },
    });
    expect(await ownerDb.select({ name: employees.name }).from(employees)).toEqual([{ name: "Asha Rao" }]);
  });

  it("rejects a last working day before the UTC date of the latest revision after the initial salary", async () => {
    const employee = await insertEmployee({ id: "E-1", joining_date: "2024-01-15" });
    // 23:30 in New York on 1 March is 2 March in UTC.
    await insertSalaryRevision(employee, { changed_at: new Date("2026-03-01T23:30:00-05:00"), annual_base_pay: "1300000.00" });
    const caller = await signedIn();

    await expect(caller.employees.update({ id: "E-1", last_working_day: "2026-03-01" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { field_errors: { last_working_day: "Must be on or after the latest salary revision (2026-03-02)" } },
    });
    await expect(caller.employees.update({ id: "E-1", last_working_day: "2026-03-02" })).resolves.toMatchObject({
      last_working_day: "2026-03-02",
    });
  });

  it("accepts a joining date after an earlier revision, since revisions may precede joining", async () => {
    const employee = await insertEmployee({ id: "E-1", joining_date: "2026-11-01" });
    await insertSalaryRevision(employee, { changed_at: new Date("2026-10-15T10:00:00Z"), annual_base_pay: "1250000.00" });

    await expect((await signedIn()).employees.update({ id: "E-1", joining_date: "2026-12-01" })).resolves.toMatchObject({
      joining_date: "2026-12-01",
      employment_status: "upcoming",
    });
  });

  it("rejects an unknown department, keyed by field", async () => {
    await insertEmployee({ id: "E-1" });

    await expect((await signedIn()).employees.update({ id: "E-1", department_id: "legal" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { field_errors: { department_id: "Unknown department" } },
    });
  });

  it("rejects a patch without changed fields as BAD_REQUEST", async () => {
    await insertEmployee({ id: "E-1" });

    await expect((await signedIn()).employees.update({ id: "E-1" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects an unknown ID as NOT_FOUND", async () => {
    await expect((await signedIn()).employees.update({ id: "E-404", name: "Nobody" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });
});
