import { beforeEach, describe, expect, it } from "vitest";
import { type HrUserFixture, insertEmployee, insertHrUser, insertLookups } from "@tests/db/fixtures";
import { callerFor, resetTables } from "@tests/db/harness";

// Requests run at noon UTC on 2026-10-21, so "today" is 2026-10-21.
const now = new Date("2026-10-21T12:00:00Z");

let hr: HrUserFixture;

beforeEach(async () => {
  await resetTables();
  await insertLookups({
    departments: [
      { id: "engineering", name: "Engineering" },
      { id: "finance", name: "Finance" },
      { id: "sales", name: "Sales" },
    ],
  });
  hr = await insertHrUser();
});

const signedIn = () => callerFor(hr, { now });

type Placement = { work_country_code: string; department_id: string; salary_currency_code: string };
let nextId = 0;
/** An employee active today with the given pay and assignment. */
const employ = (annual_base_pay: string, placement: Placement, dates: { joining_date?: string; last_working_day?: string } = {}) =>
  insertEmployee({ id: `E-${++nextId}`, annual_base_pay, ...placement, ...dates });

const inEngineering = { work_country_code: "IN", department_id: "engineering", salary_currency_code: "INR" };
const inFinance = { work_country_code: "IN", department_id: "finance", salary_currency_code: "INR" };
const inEngineeringUsd = { work_country_code: "IN", department_id: "engineering", salary_currency_code: "USD" };
const frFinance = { work_country_code: "FR", department_id: "finance", salary_currency_code: "EUR" };

describe("reports.departmentBreakdown", () => {
  it("groups active employees by country, department and currency with exact totals and rounded averages", async () => {
    await employ("100.00", inEngineering);
    await employ("100.01", inEngineering);
    await employ("300.00", inFinance);
    await employ("50.00", inEngineeringUsd);
    await employ("999.00", inEngineering, { last_working_day: "2026-10-20" });
    await employ("999.00", inEngineering, { joining_date: "2026-10-22" });

    const { rows } = await (await signedIn()).reports.departmentBreakdown({});

    expect(rows.items).toEqual([
      {
        ...inEngineering,
        employee_count: 2,
        total_annual_base_pay: "200.01",
        average_annual_base_pay: "100.01",
      },
      {
        ...inEngineeringUsd,
        employee_count: 1,
        total_annual_base_pay: "50.00",
        average_annual_base_pay: "50.00",
      },
      { ...inFinance, employee_count: 1, total_annual_base_pay: "300.00", average_annual_base_pay: "300.00" },
    ]);
    expect(rows.total_count).toBe(3);
  });

  it("summarizes headcount and country/currency totals and averages over all matching employees", async () => {
    await employ("100.00", inEngineering);
    await employ("100.00", inEngineering);
    await employ("100.01", inFinance);
    await employ("50.00", inEngineeringUsd);
    await employ("70.00", frFinance);

    const { rows, summary } = await (await signedIn()).reports.departmentBreakdown({ limit: 1 });

    expect(rows.items).toHaveLength(1);
    expect(summary.employee_count).toBe(5);
    expect(summary.by_country).toEqual([
      {
        work_country_code: "FR",
        salary_currency_code: "EUR",
        employee_count: 1,
        total_annual_base_pay: "70.00",
        average_annual_base_pay: "70.00",
      },
      {
        work_country_code: "IN",
        salary_currency_code: "INR",
        employee_count: 3,
        total_annual_base_pay: "300.01",
        average_annual_base_pay: "100.00",
      },
      {
        work_country_code: "IN",
        salary_currency_code: "USD",
        employee_count: 1,
        total_annual_base_pay: "50.00",
        average_annual_base_pay: "50.00",
      },
    ]);
  });

  it("charts department headcount but leaves totals null when countries or currencies are mixed", async () => {
    await employ("100.00", inEngineering);
    await employ("50.00", inEngineeringUsd);
    await employ("70.00", frFinance);

    const { summary } = await (await signedIn()).reports.departmentBreakdown({});

    expect(summary.by_department).toEqual([
      { department_id: "engineering", employee_count: 2, total_annual_base_pay: null },
      { department_id: "finance", employee_count: 1, total_annual_base_pay: null },
    ]);
  });

  it("charts department totals when every matching employee shares one country and currency", async () => {
    await employ("100.00", inEngineering);
    await employ("200.50", inEngineering);
    await employ("300.00", inFinance);
    await employ("50.00", inEngineeringUsd);

    const { summary } = await (await signedIn()).reports.departmentBreakdown({ salary_currency_code: "INR" });

    expect(summary.by_department).toEqual([
      { department_id: "engineering", employee_count: 2, total_annual_base_pay: "300.50" },
      { department_id: "finance", employee_count: 1, total_annual_base_pay: "300.00" },
    ]);
  });

  it("applies country, department and currency filters together, to rows and summary", async () => {
    await employ("100.00", inEngineering);
    await employ("300.00", inFinance);
    await employ("50.00", inEngineeringUsd);
    await employ("70.00", { ...frFinance, department_id: "engineering", salary_currency_code: "INR" });

    const { rows, summary } = await (await signedIn()).reports.departmentBreakdown({
      work_country_code: "IN",
      department_id: "engineering",
      salary_currency_code: "INR",
    });

    const only = { employee_count: 1, total_annual_base_pay: "100.00", average_annual_base_pay: "100.00" };
    expect(rows.items).toEqual([{ ...inEngineering, ...only }]);
    expect(summary).toEqual({
      employee_count: 1,
      by_country: [{ work_country_code: "IN", salary_currency_code: "INR", ...only }],
      by_department: [{ department_id: "engineering", employee_count: 1, total_annual_base_pay: "100.00" }],
    });
  });

  it("returns empty rows, groups and series with zero counts for known codes without matches", async () => {
    await employ("70.00", frFinance);

    const result = await (await signedIn()).reports.departmentBreakdown({
      work_country_code: "FR",
      salary_currency_code: "INR",
    });

    expect(result).toEqual({
      rows: { items: [], next_cursor: null, prev_cursor: null, total_count: 0, range_start: 0 },
      summary: { employee_count: 0, by_country: [], by_department: [] },
    });
  });

  it("rejects unknown country, department and currency codes, keyed by field", async () => {
    const caller = await signedIn();

    await expect(
      caller.reports.departmentBreakdown({ work_country_code: "JP", department_id: "legal", salary_currency_code: "JPY" }),
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

  it("pages forward and back by country, department and currency with range starts", async () => {
    await employ("1.00", frFinance);
    await employ("1.00", inEngineering);
    await employ("1.00", inEngineeringUsd);
    await employ("1.00", inFinance);
    await employ("1.00", { ...inFinance, department_id: "sales" });
    const caller = await signedIn();
    const keys = (page: { items: Placement[] }) =>
      page.items.map((row) => `${row.work_country_code}/${row.department_id}/${row.salary_currency_code}`);

    const first = (await caller.reports.departmentBreakdown({ limit: 2 })).rows;
    const second = (await caller.reports.departmentBreakdown({ limit: 2, cursor: first.next_cursor ?? undefined })).rows;
    const third = (await caller.reports.departmentBreakdown({ limit: 2, cursor: second.next_cursor ?? undefined })).rows;
    const back = (await caller.reports.departmentBreakdown({ limit: 2, cursor: third.prev_cursor ?? undefined })).rows;

    expect([keys(first), first.range_start]).toEqual([["FR/finance/EUR", "IN/engineering/INR"], 1]);
    expect([keys(second), second.range_start, second.total_count]).toEqual([["IN/engineering/USD", "IN/finance/INR"], 3, 5]);
    expect([keys(third), third.range_start, third.next_cursor]).toEqual([["IN/sales/INR"], 5, null]);
    expect([keys(back), back.range_start]).toEqual([["IN/engineering/USD", "IN/finance/INR"], 3]);
  });
});
