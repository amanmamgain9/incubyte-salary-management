import { beforeEach, describe, expect, it } from "vitest";
import { type HrUserFixture, insertEmployee, insertHrUser, insertLookups, insertSalaryRevision } from "@tests/db/fixtures";
import { callerFor, resetTables } from "@tests/db/harness";

// Requests run at noon UTC on 2026-10-21, so "today" is 2026-10-21.
const now = new Date("2026-10-21T12:00:00Z");

let hr: HrUserFixture;

beforeEach(async () => {
  await resetTables();
  await insertLookups({
    countries: [
      { code: "DE", name: "Germany" },
      { code: "FR", name: "France" },
      { code: "IN", name: "India" },
      { code: "US", name: "United States" },
    ],
  });
  hr = await insertHrUser();
});

const signedIn = () => callerFor(hr, { now });

describe("reports.salaryCommitment", () => {
  it("totals current pay of employees active today by country and currency, never combining currencies", async () => {
    await insertEmployee({ id: "E-1", work_country_code: "IN", annual_base_pay: "1200000.50", salary_currency_code: "INR" });
    await insertEmployee({ id: "E-2", work_country_code: "IN", annual_base_pay: "800000.25", salary_currency_code: "INR" });
    await insertEmployee({ id: "E-3", work_country_code: "IN", annual_base_pay: "90000.00", salary_currency_code: "USD" });
    await insertEmployee({ id: "E-4", work_country_code: "FR", annual_base_pay: "55000.00", salary_currency_code: "EUR" });
    await insertEmployee({ id: "E-5", work_country_code: "DE", annual_base_pay: "70000.00", salary_currency_code: "EUR" });

    const { rows } = await (await signedIn()).reports.salaryCommitment({});

    expect(rows.items).toEqual([
      { work_country_code: "DE", salary_currency_code: "EUR", employee_count: 1, total_annual_base_pay: "70000.00" },
      { work_country_code: "FR", salary_currency_code: "EUR", employee_count: 1, total_annual_base_pay: "55000.00" },
      { work_country_code: "IN", salary_currency_code: "INR", employee_count: 2, total_annual_base_pay: "2000000.75" },
      { work_country_code: "IN", salary_currency_code: "USD", employee_count: 1, total_annual_base_pay: "90000.00" },
    ]);
    expect(rows).toMatchObject({ total_count: 4, range_start: 1, next_cursor: null, prev_cursor: null });
  });

  it("counts employees from their joining date through their last working day only", async () => {
    await insertEmployee({ id: "E-1", joining_date: "2026-10-21", annual_base_pay: "100.00" });
    await insertEmployee({ id: "E-2", last_working_day: "2026-10-21", annual_base_pay: "200.00" });
    await insertEmployee({ id: "E-3", last_working_day: "2026-10-20", annual_base_pay: "400.00" });
    await insertEmployee({ id: "E-4", joining_date: "2026-10-22", annual_base_pay: "800.00" });

    const { rows, summary } = await (await signedIn()).reports.salaryCommitment({});

    expect(rows.items).toEqual([
      { work_country_code: "IN", salary_currency_code: "INR", employee_count: 2, total_annual_base_pay: "300.00" },
    ]);
    expect(summary.employee_count).toBe(2);
  });

  it("uses each employee's current salary, including a saved change", async () => {
    const employee = await insertEmployee({ id: "E-1", annual_base_pay: "1000.00", salary_currency_code: "INR" });
    await insertSalaryRevision(employee, {
      changed_at: new Date("2026-05-01T09:00:00Z"),
      annual_base_pay: "1500.00",
      currency_code: "USD",
    });

    const { rows } = await (await signedIn()).reports.salaryCommitment({});

    expect(rows.items).toEqual([
      { work_country_code: "IN", salary_currency_code: "USD", employee_count: 1, total_annual_base_pay: "1500.00" },
    ]);
  });

  it("summarizes headcount in total and by country, and counts currencies, independent of pagination", async () => {
    await insertEmployee({ id: "E-1", work_country_code: "IN", salary_currency_code: "INR" });
    await insertEmployee({ id: "E-2", work_country_code: "IN", salary_currency_code: "USD" });
    await insertEmployee({ id: "E-3", work_country_code: "US", salary_currency_code: "USD" });
    await insertEmployee({ id: "E-4", work_country_code: "FR", salary_currency_code: "EUR" });
    await insertEmployee({ id: "E-5", work_country_code: "FR", salary_currency_code: "EUR", last_working_day: "2026-01-31" });

    const { rows, summary } = await (await signedIn()).reports.salaryCommitment({ limit: 1 });

    expect(rows.items).toHaveLength(1);
    expect(summary).toEqual({
      employee_count: 4,
      currency_count: 3,
      by_country: [
        { work_country_code: "FR", employee_count: 1 },
        { work_country_code: "IN", employee_count: 2 },
        { work_country_code: "US", employee_count: 1 },
      ],
    });
  });

  it("applies country, department and currency filters together, to rows and summary", async () => {
    await insertEmployee({ id: "E-1", work_country_code: "IN", department_id: "engineering", salary_currency_code: "INR" });
    await insertEmployee({ id: "E-2", work_country_code: "IN", department_id: "finance", salary_currency_code: "INR" });
    await insertEmployee({ id: "E-3", work_country_code: "IN", department_id: "engineering", salary_currency_code: "USD" });
    await insertEmployee({ id: "E-4", work_country_code: "US", department_id: "engineering", salary_currency_code: "INR" });

    const { rows, summary } = await (await signedIn()).reports.salaryCommitment({
      work_country_code: "IN",
      department_id: "engineering",
      salary_currency_code: "INR",
    });

    expect(rows.items).toEqual([
      { work_country_code: "IN", salary_currency_code: "INR", employee_count: 1, total_annual_base_pay: "1200000.00" },
    ]);
    expect(summary).toEqual({
      employee_count: 1,
      currency_count: 1,
      by_country: [{ work_country_code: "IN", employee_count: 1 }],
    });
  });

  it("returns empty rows and zero counts for known codes without matches", async () => {
    await insertEmployee({ id: "E-1", work_country_code: "FR", salary_currency_code: "EUR" });

    const result = await (await signedIn()).reports.salaryCommitment({
      work_country_code: "FR",
      salary_currency_code: "INR",
    });

    expect(result).toEqual({
      rows: { items: [], next_cursor: null, prev_cursor: null, total_count: 0, range_start: 0 },
      summary: { employee_count: 0, currency_count: 0, by_country: [] },
    });
  });

  it("rejects unknown country, department and currency codes, keyed by field", async () => {
    const caller = await signedIn();

    await expect(
      caller.reports.salaryCommitment({ work_country_code: "JP", department_id: "legal", salary_currency_code: "JPY" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: {
        field_errors: {
          work_country_code: "Unknown country",
          department_id: "Unknown department",
          salary_currency_code: "Unknown currency",
        },
      },
    });
  });

  it("pages forward and back by country and currency with range starts", async () => {
    await insertEmployee({ id: "E-1", work_country_code: "DE", salary_currency_code: "EUR" });
    await insertEmployee({ id: "E-2", work_country_code: "FR", salary_currency_code: "EUR" });
    await insertEmployee({ id: "E-3", work_country_code: "IN", salary_currency_code: "INR" });
    await insertEmployee({ id: "E-4", work_country_code: "IN", salary_currency_code: "USD" });
    await insertEmployee({ id: "E-5", work_country_code: "US", salary_currency_code: "USD" });
    const caller = await signedIn();
    const keys = (page: { items: { work_country_code: string; salary_currency_code: string }[] }) =>
      page.items.map((row) => `${row.work_country_code}/${row.salary_currency_code}`);

    const first = (await caller.reports.salaryCommitment({ limit: 2 })).rows;
    const second = (await caller.reports.salaryCommitment({ limit: 2, cursor: first.next_cursor ?? undefined })).rows;
    const third = (await caller.reports.salaryCommitment({ limit: 2, cursor: second.next_cursor ?? undefined })).rows;
    const back = (await caller.reports.salaryCommitment({ limit: 2, cursor: second.prev_cursor ?? undefined })).rows;

    expect([keys(first), first.range_start, first.prev_cursor]).toEqual([["DE/EUR", "FR/EUR"], 1, null]);
    expect([keys(second), second.range_start, second.total_count]).toEqual([["IN/INR", "IN/USD"], 3, 5]);
    expect([keys(third), third.range_start, third.next_cursor]).toEqual([["US/USD"], 5, null]);
    expect([keys(back), back.range_start, back.prev_cursor]).toEqual([["DE/EUR", "FR/EUR"], 1, null]);
  });

  it("rejects a cursor reused with different filters as BAD_REQUEST", async () => {
    await insertEmployee({ id: "E-1", work_country_code: "FR", salary_currency_code: "EUR" });
    await insertEmployee({ id: "E-2", work_country_code: "IN", salary_currency_code: "INR" });
    const caller = await signedIn();
    const { rows } = await caller.reports.salaryCommitment({ limit: 1 });

    await expect(
      caller.reports.salaryCommitment({ limit: 1, cursor: rows.next_cursor ?? undefined, work_country_code: "IN" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", message: "Invalid cursor" });
  });
});
