import { asc } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ownerDb } from "@/server/db/owner";
import { employees, salaryHistory } from "@/server/db/schema";
import { type HrUserFixture, insertEmployee, insertHrUser, insertLookups } from "./fixtures";
import { callerFor, resetTables } from "./harness";

// Requests run at noon UTC on 2026-10-21, so "today" is 2026-10-21.
const now = new Date("2026-10-21T12:00:00Z");

let hr: HrUserFixture;

beforeEach(async () => {
  await resetTables();
  await insertLookups();
  hr = await insertHrUser();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const signedIn = () => callerFor(hr, { now });
const storedHistory = () => ownerDb.select().from(salaryHistory).orderBy(asc(salaryHistory.revision));
const storedPay = () =>
  ownerDb
    .select({
      annual_base_pay: employees.annual_base_pay,
      salary_currency_code: employees.salary_currency_code,
      salary_revision: employees.salary_revision,
    })
    .from(employees);

const unchangedPay = [{ annual_base_pay: "1200000.00", salary_currency_code: "INR", salary_revision: 1 }];

describe("salaries.update", () => {
  const change = {
    employee_id: "E-1",
    expected_revision: 1,
    annual_base_pay: "1350000.5",
    salary_currency_code: "INR",
    reason: "  Annual review ",
  };

  it("changes current pay and returns the employee at the next revision", async () => {
    await insertEmployee({ id: "E-1" });

    await expect((await signedIn()).salaries.update(change)).resolves.toEqual({
      id: "E-1",
      name: "Asha Rao",
      department_id: "engineering",
      work_country_code: "IN",
      joining_date: "2024-01-15",
      last_working_day: null,
      annual_base_pay: "1350000.50",
      salary_currency_code: "INR",
      salary_revision: 2,
      employment_status: "active",
    });
    expect(await storedPay()).toEqual([
      { annual_base_pay: "1350000.50", salary_currency_code: "INR", salary_revision: 2 },
    ]);
  });

  it("returns exactly the employee the change committed", async () => {
    await insertEmployee({ id: "E-1" });
    const caller = await signedIn();

    const returned = await caller.salaries.update(change);

    expect(returned).toEqual(await caller.employees.get({ id: "E-1" }));
    const latest = (await storedHistory()).at(-1);
    expect(returned).toMatchObject({
      salary_revision: latest?.revision,
      annual_base_pay: latest?.annual_base_pay,
      salary_currency_code: latest?.currency_code,
    });
  });

  it("appends one history entry with the assignment at change, the signed-in user, request time and reason", async () => {
    await insertEmployee({ id: "E-1", department_id: "engineering", work_country_code: "IN" });
    const caller = await signedIn();
    await caller.employees.update({ id: "E-1", department_id: "finance", work_country_code: "US" });

    await caller.salaries.update(change);

    expect(await storedHistory()).toEqual([
      expect.objectContaining({ revision: 1, work_country_code_at_change: "IN", department_id_at_change: "engineering" }),
      {
        id: expect.any(String) as unknown,
        employee_id: "E-1",
        revision: 2,
        annual_base_pay: "1350000.50",
        currency_code: "INR",
        work_country_code_at_change: "US",
        department_id_at_change: "finance",
        changed_by: hr.id,
        changed_at: now,
        reason: "Annual review",
      },
    ]);
  });

  it("switches to another known currency without converting the amount", async () => {
    await insertEmployee({ id: "E-1", salary_currency_code: "INR" });

    await expect(
      (await signedIn()).salaries.update({ ...change, annual_base_pay: "98000", salary_currency_code: "USD" }),
    ).resolves.toMatchObject({ annual_base_pay: "98000.00", salary_currency_code: "USD", salary_revision: 2 });
    expect(await storedHistory()).toMatchObject([
      { revision: 1, currency_code: "INR" },
      { revision: 2, annual_base_pay: "98000.00", currency_code: "USD" },
    ]);
  });

  it.each([
    ["upcoming (joins tomorrow)", { joining_date: "2026-10-22" }, "upcoming"],
    ["leaving today", { joining_date: "2024-01-15", last_working_day: "2026-10-21" }, "active"],
  ])("accepts a change for an employee %s", async (_case, dates, employment_status) => {
    await insertEmployee({ id: "E-1", ...dates });

    await expect((await signedIn()).salaries.update(change)).resolves.toMatchObject({
      salary_revision: 2,
      employment_status,
    });
  });

  it("rejects a departed employee as BAD_REQUEST keyed by employee_id and saves nothing", async () => {
    await insertEmployee({ id: "E-1", joining_date: "2024-01-15", last_working_day: "2026-10-20" });

    await expect((await signedIn()).salaries.update(change)).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { field_errors: { employee_id: "Salary cannot change after the last working day" } },
    });
    expect(await storedPay()).toEqual(unchangedPay);
    expect(await storedHistory()).toHaveLength(1);
  });

  it("rejects the current amount in the current currency as BAD_REQUEST keyed by annual_base_pay and saves nothing", async () => {
    await insertEmployee({ id: "E-1" });

    await expect(
      (await signedIn()).salaries.update({ ...change, annual_base_pay: "1200000", salary_currency_code: "INR" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { field_errors: { annual_base_pay: "No change from the current salary" } },
    });
    expect(await storedPay()).toEqual(unchangedPay);
    expect(await storedHistory()).toHaveLength(1);
  });

  it("accepts the current amount in another currency", async () => {
    await insertEmployee({ id: "E-1" });

    await expect(
      (await signedIn()).salaries.update({ ...change, annual_base_pay: "1200000.00", salary_currency_code: "USD" }),
    ).resolves.toMatchObject({ annual_base_pay: "1200000.00", salary_currency_code: "USD", salary_revision: 2 });
  });

  it("rejects a stale expected revision as CONFLICT and saves nothing", async () => {
    await insertEmployee({ id: "E-1" });
    const caller = await signedIn();
    await caller.salaries.update(change);

    await expect(caller.salaries.update({ ...change, annual_base_pay: "1400000" })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Salary changed since it was loaded; reload and try again",
    });
    expect(await storedPay()).toEqual([
      { annual_base_pay: "1350000.50", salary_currency_code: "INR", salary_revision: 2 },
    ]);
    expect(await storedHistory()).toHaveLength(2);
  });

  it("lets exactly one of two concurrent changes at the same expected revision succeed", async () => {
    await insertEmployee({ id: "E-1" });
    const [first, second] = await Promise.all([signedIn(), signedIn()]);

    const results = await Promise.allSettled([
      first.salaries.update({ ...change, annual_base_pay: "1300000" }),
      second.salaries.update({ ...change, annual_base_pay: "1400000" }),
    ]);

    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    expect(results.find(({ status }) => status === "rejected")).toMatchObject({ reason: { code: "CONFLICT" } });
    const history = await storedHistory();
    expect(history.map(({ revision }) => revision)).toEqual([1, 2]);
    expect(await storedPay()).toEqual([
      { annual_base_pay: history[1]?.annual_base_pay, salary_currency_code: "INR", salary_revision: 2 },
    ]);
  });

  it("rolls back the pay change when the history append fails", async () => {
    await insertEmployee({ id: "E-1" });
    // A stray entry already holds the next revision, so the append violates the unique (employee_id, revision).
    await ownerDb.insert(salaryHistory).values({
      employee_id: "E-1",
      revision: 2,
      annual_base_pay: "1.00",
      currency_code: "INR",
      work_country_code_at_change: "IN",
      department_id_at_change: "engineering",
      changed_by: hr.id,
      changed_at: new Date("2026-01-01T00:00:00Z"),
      reason: "Stray",
    });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect((await signedIn()).salaries.update(change)).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(await storedPay()).toEqual(unchangedPay);
  });

  it("rejects an unknown currency as BAD_REQUEST keyed by field and saves nothing", async () => {
    await insertEmployee({ id: "E-1" });

    await expect((await signedIn()).salaries.update({ ...change, salary_currency_code: "JPY" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { field_errors: { salary_currency_code: "Unknown currency" } },
    });
    expect(await storedPay()).toEqual(unchangedPay);
  });

  it.each(["0", "0.00", "-5", "100.001", "1e5", "10000000000000000"])(
    "rejects an annual base pay of %s as BAD_REQUEST keyed by field",
    async (annual_base_pay) => {
      await insertEmployee({ id: "E-1" });

      await expect((await signedIn()).salaries.update({ ...change, annual_base_pay })).rejects.toMatchObject({
        code: "BAD_REQUEST",
        cause: { issues: [{ path: ["annual_base_pay"], message: "Use a positive amount with at most two decimals" }] },
      });
      expect(await storedPay()).toEqual(unchangedPay);
    },
  );

  it("rejects a blank reason, keyed by field", async () => {
    await insertEmployee({ id: "E-1" });

    await expect((await signedIn()).salaries.update({ ...change, reason: "   " })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { issues: [{ path: ["reason"], message: "Enter a reason" }] },
    });
    expect(await storedHistory()).toHaveLength(1);
  });

  it("rejects an unknown employee as NOT_FOUND", async () => {
    await expect((await signedIn()).salaries.update({ ...change, employee_id: "E-404" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects a change from another origin as FORBIDDEN", async () => {
    await insertEmployee({ id: "E-1" });
    const caller = await callerFor(hr, { now, origin: "https://evil.example" });

    await expect(caller.salaries.update(change)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await storedPay()).toEqual(unchangedPay);
  });
});
