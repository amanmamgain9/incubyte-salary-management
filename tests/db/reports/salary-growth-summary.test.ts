import { beforeEach, describe, expect, it } from "vitest";
import type { SalaryGrowthInput } from "@/contracts/reports/salary-growth";
import {
  type EmployeeRow,
  type HrUserFixture,
  insertEmployee,
  insertHrUser,
  insertLookups,
  insertSalaryRevision,
} from "@tests/db/fixtures";
import { callerFor, resetTables } from "@tests/db/harness";

// Requests run at noon UTC on 2026-10-21, so "today" is 2026-10-21.
const now = new Date("2026-10-21T12:00:00Z");

let hr: HrUserFixture;

beforeEach(async () => {
  await resetTables();
  await insertLookups();
  hr = await insertHrUser();
});

const growth = async (input: Partial<SalaryGrowthInput> = {}) =>
  (await callerFor(hr, { now })).reports.salaryGrowth({ from: "2025-01-01", to: "2026-10-21", ...input });

const revise = (employee: EmployeeRow, at: string, amount: string, currency?: string) =>
  insertSalaryRevision(employee, { changed_at: new Date(at), annual_base_pay: amount, currency_code: currency });

const fr = { work_country_code: "FR", salary_currency_code: "EUR" };
const inInr = { work_country_code: "IN", salary_currency_code: "INR" };
const frEmployee = (id: string, annual_base_pay: string) =>
  insertEmployee({ id, work_country_code: "FR", salary_currency_code: "EUR", annual_base_pay, joining_date: "2024-01-15" });

/** One trend point per month, `net` by month and zero otherwise. */
const trendOf = (group: object, months: string[], net: Record<string, string>) =>
  months.map((month) => ({ month, ...group, net_change: net[month] ?? "0.00" }));
const monthsFrom = (first: string, count: number) =>
  Array.from({ length: count }, (_, index) => {
    const at = new Date(`${first}-01T00:00:00Z`);
    at.setUTCMonth(at.getUTCMonth() + index);
    return at.toISOString().slice(0, 7);
  });

describe("reports.salaryGrowth summary", () => {
  it("totals the period by country and currency, independent of pagination", async () => {
    await revise(await frEmployee("E-1", "100.00"), "2025-02-10T09:00:00Z", "130.00");
    await revise(await frEmployee("E-2", "100.00"), "2025-05-10T09:00:00Z", "90.00");
    let india = await insertEmployee({ id: "E-3", annual_base_pay: "1000.00" });
    india = await revise(india, "2025-03-10T09:00:00Z", "20.00", "USD");
    await revise(india, "2025-04-10T09:00:00Z", "1200.00", "INR");

    const { rows, summary } = await growth({ limit: 1 });

    expect(rows.items).toHaveLength(1);
    expect(rows.total_count).toBe(4);
    expect(summary.by_country).toEqual([
      { ...fr, increases: "30.00", decreases: "10.00", net_change: "20.00", currency_switch_count: 0 },
      { ...inInr, increases: "0.00", decreases: "0.00", net_change: "0.00", currency_switch_count: 1 },
      {
        work_country_code: "IN",
        salary_currency_code: "USD",
        increases: "0.00",
        decreases: "0.00",
        net_change: "0.00",
        currency_switch_count: 1,
      },
    ]);
    expect(summary.currency_switch_count).toBe(2);
  });

  it("trends net change over the period's last 12 months for every group, zero without revisions", async () => {
    let paris = await frEmployee("E-1", "100.00");
    paris = await revise(paris, "2025-10-05T09:00:00Z", "150.00");
    paris = await revise(paris, "2026-02-05T09:00:00Z", "650.00");
    await revise(paris, "2026-10-21T09:00:00Z", "550.00");
    await revise(await insertEmployee({ id: "E-2", annual_base_pay: "1000.00" }), "2025-12-01T09:00:00Z", "1100.00");

    const { summary } = await growth({ from: "2025-09-15" });

    const months = monthsFrom("2025-11", 12);
    expect(summary.trend).toEqual([
      ...trendOf(fr, months, { "2026-02": "500.00", "2026-10": "-100.00" }),
      ...trendOf(inInr, months, { "2025-12": "100.00" }),
    ]);
  });

  it("trends only the period's months when the period is shorter than 12 months", async () => {
    await revise(await frEmployee("E-1", "100.00"), "2026-09-05T09:00:00Z", "120.00");

    const { summary } = await growth({ from: "2026-08-20" });

    expect(summary.trend).toEqual(trendOf(fr, ["2026-08", "2026-09", "2026-10"], { "2026-09": "20.00" }));
  });

  it("returns empty rows, groups and trend with zero counts for known codes without matches", async () => {
    await revise(await frEmployee("E-1", "100.00"), "2025-02-10T09:00:00Z", "130.00");

    const result = await growth({ work_country_code: "FR", department_id: "finance" });

    expect(result).toEqual({
      rows: { items: [], next_cursor: null, prev_cursor: null, total_count: 0, range_start: 0 },
      summary: { by_country: [], currency_switch_count: 0, trend: [] },
    });
  });

  it("rejects unknown country and department codes, keyed by field", async () => {
    await expect(growth({ work_country_code: "JP", department_id: "legal" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { field_errors: { work_country_code: "Unknown country", department_id: "Unknown department" } },
    });
  });

  it("rejects an end date after today or before the start date, keyed by `to`", async () => {
    await expect(growth({ to: "2026-10-22" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { field_errors: { to: "Must be today or earlier" } },
    });
    await expect(growth({ from: "2026-02-02", to: "2026-02-01" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("pages forward and back by month, country and currency with range starts", async () => {
    await revise(await frEmployee("E-1", "100.00"), "2025-02-10T09:00:00Z", "110.00");
    await revise(await frEmployee("E-2", "100.00"), "2025-03-10T09:00:00Z", "110.00");
    await revise(await insertEmployee({ id: "E-3", annual_base_pay: "100.00" }), "2025-02-11T09:00:00Z", "110.00");
    await revise(await insertEmployee({ id: "E-4", annual_base_pay: "100.00" }), "2025-03-11T09:00:00Z", "110.00");
    await revise(await insertEmployee({ id: "E-5", annual_base_pay: "100.00" }), "2025-04-11T09:00:00Z", "110.00");
    const keys = (page: { items: { month: string; work_country_code: string }[] }) =>
      page.items.map((row) => `${row.month}/${row.work_country_code}`);

    const first = (await growth({ limit: 2 })).rows;
    const second = (await growth({ limit: 2, cursor: first.next_cursor ?? undefined })).rows;
    const third = (await growth({ limit: 2, cursor: second.next_cursor ?? undefined })).rows;
    const back = (await growth({ limit: 2, cursor: second.prev_cursor ?? undefined })).rows;

    expect([keys(first), first.range_start]).toEqual([["2025-02/FR", "2025-02/IN"], 1]);
    expect([keys(second), second.range_start, second.total_count]).toEqual([["2025-03/FR", "2025-03/IN"], 3, 5]);
    expect([keys(third), third.range_start, third.next_cursor]).toEqual([["2025-04/IN"], 5, null]);
    expect([keys(back), back.range_start, back.prev_cursor]).toEqual([["2025-02/FR", "2025-02/IN"], 1, null]);
  });
});
