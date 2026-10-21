import { beforeEach, describe, expect, it } from "vitest";
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

const signedIn = () => callerFor(hr, { now });
const idsOf = (page: { items: { id: string }[] }) => page.items.map((employee) => employee.id);

describe("employees.list", () => {
  it("lists employees by ID with their status today, from joining date through last working day", async () => {
    await insertEmployee({ id: "E-4", joining_date: "2026-10-22" });
    await insertEmployee({ id: "E-1", joining_date: "2026-10-21" });
    await insertEmployee({ id: "E-3", joining_date: "2020-01-01", last_working_day: "2026-10-20" });
    await insertEmployee({ id: "E-2", joining_date: "2020-01-01", last_working_day: "2026-10-21" });

    const { rows } = await (await signedIn()).employees.list({});

    expect(rows.items.map(({ id, employment_status }) => [id, employment_status])).toEqual([
      ["E-1", "active"],
      ["E-2", "active"],
      ["E-3", "departed"],
      ["E-4", "upcoming"],
    ]);
    expect(rows).toMatchObject({ total_count: 4, range_start: 1, next_cursor: null, prev_cursor: null });
  });

  it("returns the employee view with exact pay and current revision", async () => {
    await insertEmployee({ id: "E-1", annual_base_pay: "1234567.89" });

    const { rows } = await (await signedIn()).employees.list({});

    expect(rows.items).toEqual([
      {
        id: "E-1",
        name: "Asha Rao",
        department_id: "engineering",
        work_country_code: "IN",
        joining_date: "2024-01-15",
        last_working_day: null,
        annual_base_pay: "1234567.89",
        salary_currency_code: "INR",
        salary_revision: 1,
        employment_status: "active",
      },
    ]);
  });

  it("summarizes every matching employee by status and counts their countries", async () => {
    await insertEmployee({ id: "E-1", work_country_code: "IN" });
    await insertEmployee({ id: "E-2", work_country_code: "US", joining_date: "2026-11-01" });
    await insertEmployee({ id: "E-3", work_country_code: "US", last_working_day: "2025-06-30" });
    await insertEmployee({ id: "E-4", work_country_code: "IN" });

    const { summary } = await (await signedIn()).employees.list({ limit: 1 });

    expect(summary).toEqual({
      employee_count: 4,
      active_count: 2,
      upcoming_count: 1,
      departed_count: 1,
      country_count: 2,
    });
  });

  it("searches names and IDs case-insensitively by partial match", async () => {
    await insertEmployee({ id: "E-1", name: "Asha Rao" });
    await insertEmployee({ id: "E-2", name: "Ravi Iyer" });
    await insertEmployee({ id: "X-77", name: "Mia Chen" });
    const caller = await signedIn();

    expect(idsOf((await caller.employees.list({ search: "RA" })).rows)).toEqual(["E-1", "E-2"]);
    expect(idsOf((await caller.employees.list({ search: "x-7" })).rows)).toEqual(["X-77"]);
  });

  it("matches LIKE wildcards in a search literally", async () => {
    await insertEmployee({ id: "E-1", name: "Asha Rao" });
    await insertEmployee({ id: "E-2", name: "100% Ravi" });

    const { rows } = await (await signedIn()).employees.list({ search: "%" });

    expect(idsOf(rows)).toEqual(["E-2"]);
  });

  it("treats a blank search as no search", async () => {
    await insertEmployee({ id: "E-1" });
    await insertEmployee({ id: "E-2" });

    const { rows } = await (await signedIn()).employees.list({ search: "   " });

    expect(idsOf(rows)).toEqual(["E-1", "E-2"]);
  });

  it("applies department, country and status filters together, to rows and summary", async () => {
    await insertEmployee({ id: "E-1", department_id: "engineering", work_country_code: "IN" });
    await insertEmployee({ id: "E-2", department_id: "finance", work_country_code: "IN" });
    await insertEmployee({ id: "E-3", department_id: "engineering", work_country_code: "US" });
    await insertEmployee({ id: "E-4", department_id: "engineering", work_country_code: "IN", joining_date: "2027-01-04" });

    const { rows, summary } = await (await signedIn()).employees.list({
      department_id: "engineering",
      work_country_code: "IN",
      employment_status: "active",
    });

    expect(idsOf(rows)).toEqual(["E-1"]);
    expect(summary).toMatchObject({ employee_count: 1, active_count: 1, upcoming_count: 0, country_count: 1 });
  });

  it("returns an empty page and zero counts for known codes without matches", async () => {
    await insertEmployee({ id: "E-1", work_country_code: "IN" });

    const { rows, summary } = await (await signedIn()).employees.list({ work_country_code: "FR" });

    expect(rows).toEqual({ items: [], next_cursor: null, prev_cursor: null, total_count: 0, range_start: 0 });
    expect(summary).toEqual({
      employee_count: 0,
      active_count: 0,
      upcoming_count: 0,
      departed_count: 0,
      country_count: 0,
    });
  });

  it("pages forward and back by ID with range starts", async () => {
    for (const id of ["E-1", "E-2", "E-3", "E-4", "E-5"]) await insertEmployee({ id });
    const caller = await signedIn();

    const first = (await caller.employees.list({ limit: 2 })).rows;
    const second = (await caller.employees.list({ limit: 2, cursor: first.next_cursor ?? undefined })).rows;
    const back = (await caller.employees.list({ limit: 2, cursor: second.prev_cursor ?? undefined })).rows;

    expect([idsOf(first), first.range_start]).toEqual([["E-1", "E-2"], 1]);
    expect([idsOf(second), second.range_start, second.total_count]).toEqual([["E-3", "E-4"], 3, 5]);
    expect([idsOf(back), back.range_start, back.prev_cursor]).toEqual([["E-1", "E-2"], 1, null]);
  });

  it("rejects a cursor reused with different filters as BAD_REQUEST", async () => {
    for (const id of ["E-1", "E-2", "E-3"]) await insertEmployee({ id });
    const caller = await signedIn();
    const { rows } = await caller.employees.list({ limit: 1 });

    await expect(
      caller.employees.list({ limit: 1, cursor: rows.next_cursor ?? undefined, search: "E" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Invalid cursor" });
  });

  it("rejects unknown department and country codes, keyed by field", async () => {
    const caller = await signedIn();

    await expect(caller.employees.list({ department_id: "legal", work_country_code: "JP" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { field_errors: { department_id: "Unknown department", work_country_code: "Unknown country" } },
    });
  });

  it("rejects a call without a session as UNAUTHORIZED", async () => {
    const caller = await callerFor(null, { now });

    await expect(caller.employees.list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("employees.get", () => {
  it("returns the employee with its status today", async () => {
    await insertEmployee({ id: "E-1", last_working_day: "2026-10-20" });

    await expect((await signedIn()).employees.get({ id: "E-1" })).resolves.toMatchObject({
      id: "E-1",
      last_working_day: "2026-10-20",
      employment_status: "departed",
    });
  });

  it("rejects an unknown ID as NOT_FOUND", async () => {
    await expect((await signedIn()).employees.get({ id: "E-404" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
