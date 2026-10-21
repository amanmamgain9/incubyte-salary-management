import { beforeEach, describe, expect, it } from "vitest";
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

describe("salaries.history", () => {
  /** E-1 at revisions 1–5 (one Initial salary, then a raise a month), all by hr-1. */
  const employeeWithFiveRevisions = async () => {
    let employee = await insertEmployee({ id: "E-1", joining_date: "2024-01-15" });
    for (const month of ["02", "03", "04", "05"]) {
      employee = await insertSalaryRevision(employee, {
        changed_at: new Date(`2025-${month}-01T10:00:00Z`),
        annual_base_pay: `12${month}000.00`,
      });
    }
  };
  const revisionsOf = (page: { items: { revision: number }[] }) => page.items.map(({ revision }) => revision);

  it("lists an entry with its snapshot, the acting user's name and an ISO UTC timestamp", async () => {
    await insertHrUser({ id: "hr-2", name: "Omar Patel", email: "omar@acme.test" });
    const employee = await insertEmployee({ id: "E-1", work_country_code: "US", department_id: "finance" });
    await insertSalaryRevision(employee, {
      changed_at: new Date("2026-03-01T23:30:00-05:00"),
      annual_base_pay: "98000.50",
      currency_code: "USD",
      changed_by: "hr-2",
    });

    const page = await (await signedIn()).salaries.history({ employee_id: "E-1", limit: 1 });

    expect(page.items).toEqual([
      {
        id: expect.any(String) as unknown,
        employee_id: "E-1",
        revision: 2,
        annual_base_pay: "98000.50",
        currency_code: "USD",
        work_country_code_at_change: "US",
        department_id_at_change: "finance",
        changed_by: "hr-2",
        changed_by_name: "Omar Patel",
        changed_at: "2026-03-02T04:30:00.000Z",
        reason: "Annual review",
      },
    ]);
  });

  it("lists revisions newest first and pages forward and back with positions", async () => {
    await employeeWithFiveRevisions();
    const caller = await signedIn();

    const first = await caller.salaries.history({ employee_id: "E-1", limit: 2 });
    expect(revisionsOf(first)).toEqual([5, 4]);
    expect(first).toMatchObject({ total_count: 5, range_start: 1, prev_cursor: null });

    const second = await caller.salaries.history({ employee_id: "E-1", limit: 2, cursor: first.next_cursor ?? "" });
    expect(revisionsOf(second)).toEqual([3, 2]);
    expect(second).toMatchObject({ total_count: 5, range_start: 3 });

    const last = await caller.salaries.history({ employee_id: "E-1", limit: 2, cursor: second.next_cursor ?? "" });
    expect(revisionsOf(last)).toEqual([1]);
    expect(last).toMatchObject({ range_start: 5, next_cursor: null });

    const back = await caller.salaries.history({ employee_id: "E-1", limit: 2, cursor: second.prev_cursor ?? "" });
    expect(revisionsOf(back)).toEqual([5, 4]);
    expect(back).toMatchObject({ range_start: 1, prev_cursor: null });
  });

  it("shows a salary change made through salaries.update first", async () => {
    await insertEmployee({ id: "E-1" });
    const caller = await signedIn();
    await caller.salaries.update({
      employee_id: "E-1",
      expected_revision: 1,
      annual_base_pay: "1300000",
      salary_currency_code: "INR",
      reason: "Promotion",
    });

    const page = await caller.salaries.history({ employee_id: "E-1" });

    expect(page.items.map(({ revision, reason, changed_by_name }) => [revision, reason, changed_by_name])).toEqual([
      [2, "Promotion", hr.name],
      [1, "Initial salary", hr.name],
    ]);
  });

  it("keeps a departed employee's history readable", async () => {
    await insertEmployee({ id: "E-1", last_working_day: "2025-06-30" });

    await expect((await signedIn()).salaries.history({ employee_id: "E-1" })).resolves.toMatchObject({
      total_count: 1,
      items: [{ revision: 1, reason: "Initial salary" }],
    });
  });

  it("rejects another employee's cursor as BAD_REQUEST", async () => {
    await employeeWithFiveRevisions();
    await insertEmployee({ id: "E-2" });
    const caller = await signedIn();
    const first = await caller.salaries.history({ employee_id: "E-1", limit: 2 });

    await expect(
      caller.salaries.history({ employee_id: "E-2", limit: 2, cursor: first.next_cursor ?? "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Invalid cursor" });
  });

  it("rejects an unknown employee as NOT_FOUND", async () => {
    await expect((await signedIn()).salaries.history({ employee_id: "E-404" })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("requires a session", async () => {
    await insertEmployee({ id: "E-1" });

    await expect((await callerFor(null)).salaries.history({ employee_id: "E-1" })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
});
