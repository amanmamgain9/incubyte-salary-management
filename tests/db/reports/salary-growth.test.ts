import { beforeEach, describe, expect, it } from "vitest";
import type { SalaryGrowthInput } from "@/contracts/reports/salary-growth";
import {
  type EmployeeRow,
  type HrUserFixture,
  insertEmployee,
  insertHrUser,
  insertLookups,
  insertSalaryRevision,
  updateEmployee,
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

/** The employee's next revision at `at` (an ISO instant), to `amount` in `currency` (default: unchanged). */
const revise = (employee: EmployeeRow, at: string, amount: string, currency?: string) =>
  insertSalaryRevision(employee, { changed_at: new Date(at), annual_base_pay: amount, currency_code: currency });

const changes = (month: string, increases: string, decreases: string, net_change: string, currency_switch_count = 0) => ({
  month,
  increases,
  decreases,
  net_change,
  currency_switch_count,
});

describe("reports.salaryGrowth rows", () => {
  it("compares each revision with its preceding entry and sums increases and decreases by month", async () => {
    let employee = await insertEmployee({
      id: "E-1",
      work_country_code: "FR",
      joining_date: "2024-06-03",
      annual_base_pay: "100000.00",
      salary_currency_code: "EUR",
    });
    employee = await revise(employee, "2025-03-10T09:00:00Z", "110000.00");
    await revise(employee, "2025-04-30T23:30:00Z", "108000.00");

    const { rows, summary } = await growth();

    const fr = { work_country_code: "FR", salary_currency_code: "EUR" };
    expect(rows.items).toEqual([
      { ...fr, ...changes("2025-03", "10000.00", "0.00", "10000.00") },
      { ...fr, ...changes("2025-04", "0.00", "2000.00", "-2000.00") },
    ]);
    expect(summary.by_country).toEqual([
      { ...fr, increases: "10000.00", decreases: "2000.00", net_change: "8000.00", currency_switch_count: 0 },
    ]);
  });

  it("uses a preceding entry from before the period and skips initial salaries", async () => {
    let employee = await insertEmployee({ id: "E-1", joining_date: "2024-01-15", annual_base_pay: "1000000.00" });
    employee = await revise(employee, "2024-12-31T09:00:00Z", "1100000.00");
    await revise(employee, "2025-02-01T00:00:00Z", "1210000.00");
    await insertEmployee({ id: "E-2", joining_date: "2025-05-01", annual_base_pay: "900000.00" });

    const { rows } = await growth();

    expect(rows.items).toEqual([
      { work_country_code: "IN", salary_currency_code: "INR", ...changes("2025-02", "110000.00", "0.00", "110000.00") },
    ]);
  });

  it("counts a currency switch under the new currency without a growth amount", async () => {
    let employee = await insertEmployee({ id: "E-1", annual_base_pay: "1000000.00", salary_currency_code: "INR" });
    employee = await revise(employee, "2025-06-10T09:00:00Z", "15000.00", "USD");
    await revise(employee, "2025-07-10T09:00:00Z", "16000.00");

    const { rows, summary } = await growth();

    const inUsd = { work_country_code: "IN", salary_currency_code: "USD" };
    expect(rows.items).toEqual([
      { ...inUsd, ...changes("2025-06", "0.00", "0.00", "0.00", 1) },
      { ...inUsd, ...changes("2025-07", "1000.00", "0.00", "1000.00") },
    ]);
    expect(summary.currency_switch_count).toBe(1);
  });

  it("compares several revisions on one day each with its own predecessor", async () => {
    let employee = await insertEmployee({ id: "E-1", annual_base_pay: "100.00" });
    employee = await revise(employee, "2025-03-10T09:00:00Z", "120.00");
    await revise(employee, "2025-03-10T15:00:00Z", "110.00");

    const { rows } = await growth();

    expect(rows.items).toEqual([
      { work_country_code: "IN", salary_currency_code: "INR", ...changes("2025-03", "20.00", "10.00", "10.00") },
    ]);
  });

  it("groups revisions by UTC month and includes both period ends", async () => {
    let employee = await insertEmployee({ id: "E-1", annual_base_pay: "100.00" });
    employee = await revise(employee, "2025-01-31T23:59:59Z", "110.00");
    employee = await revise(employee, "2025-02-01T00:00:00Z", "120.00");
    employee = await revise(employee, "2025-02-28T22:00:00-05:00", "125.00");
    employee = await revise(employee, "2025-03-31T23:59:59Z", "150.00");
    await revise(employee, "2025-04-01T00:00:00Z", "140.00");

    const { rows } = await growth({ from: "2025-02-01", to: "2025-03-31" });

    const inInr = { work_country_code: "IN", salary_currency_code: "INR" };
    expect(rows.items).toEqual([
      { ...inInr, ...changes("2025-02", "10.00", "0.00", "10.00") },
      { ...inInr, ...changes("2025-03", "30.00", "0.00", "30.00") },
    ]);
  });

  it("counts a revision before joining in its own month and keeps employees who later left", async () => {
    let offer = await insertEmployee({ id: "E-1", joining_date: "2025-03-03", annual_base_pay: "500.00" });
    offer = await revise(offer, "2025-03-20T09:00:00Z", "550.00");
    await updateEmployee(offer, { joining_date: "2025-05-01" });
    const leaver = await insertEmployee({ id: "E-2", joining_date: "2024-01-01", annual_base_pay: "1000.00" });
    await updateEmployee(await revise(leaver, "2025-06-02T09:00:00Z", "1100.00"), { last_working_day: "2025-08-31" });

    const { rows } = await growth();

    const inInr = { work_country_code: "IN", salary_currency_code: "INR" };
    expect(rows.items).toEqual([
      { ...inInr, ...changes("2025-03", "50.00", "0.00", "50.00") },
      { ...inInr, ...changes("2025-06", "100.00", "0.00", "100.00") },
    ]);
  });

  it("filters by the country and department saved with each revision, together, in rows and summary", async () => {
    let employee = await insertEmployee({ id: "E-1", department_id: "engineering", annual_base_pay: "1000.00" });
    employee = await revise(employee, "2025-03-01T09:00:00Z", "1100.00");
    employee = await updateEmployee(employee, { work_country_code: "US", department_id: "finance" });
    await revise(employee, "2025-05-01T09:00:00Z", "1200.00");

    const india = await growth({ work_country_code: "IN" });
    const finance = await growth({ department_id: "finance" });
    const usEngineering = await growth({ work_country_code: "US", department_id: "engineering" });

    expect(india.rows.items).toEqual([
      { work_country_code: "IN", salary_currency_code: "INR", ...changes("2025-03", "100.00", "0.00", "100.00") },
    ]);
    expect(finance.rows.items).toEqual([
      { work_country_code: "US", salary_currency_code: "INR", ...changes("2025-05", "100.00", "0.00", "100.00") },
    ]);
    const { month: _month, ...usTotals } = finance.rows.items[0] ?? {};
    expect(finance.summary.by_country).toEqual([usTotals]);
    expect(usEngineering.rows.total_count).toBe(0);
  });
});
