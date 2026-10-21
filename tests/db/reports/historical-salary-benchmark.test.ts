import { beforeEach, describe, expect, it } from "vitest";
import type {
  HistoricalSalaryBenchmarkInput,
  HistoricalSalaryBenchmarkRow,
} from "@/contracts/reports/historical-salary-benchmark";
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

const benchmark = async (input: Partial<HistoricalSalaryBenchmarkInput> = {}) =>
  (await callerFor(hr, { now })).reports.historicalSalaryBenchmark({ from: "2026-09-01", to: "2026-09-30", ...input });

let nextId = 0;
/** An employee in India, engineering, INR who joined on 2024-01-15 unless overridden. */
const hire = (annual_base_pay: string, overrides: Partial<EmployeeRow> = {}) =>
  insertEmployee({ id: `E-${++nextId}`, joining_date: "2024-01-15", annual_base_pay, ...overrides });
const revise = (employee: EmployeeRow, at: string, amount: string, currency?: string) =>
  insertSalaryRevision(employee, { changed_at: new Date(at), annual_base_pay: amount, currency_code: currency });

const group = (row: HistoricalSalaryBenchmarkRow) =>
  `${row.month} ${row.work_country_code}/${row.department_id}/${row.salary_currency_code}`;
const headcounts = (rows: HistoricalSalaryBenchmarkRow[]) =>
  rows.map((row) => [group(row), row.employee_count, row.total_annual_base_pay]);

describe("reports.historicalSalaryBenchmark snapshots", () => {
  it("computes exact percentiles, the country median and year-over-year change at month end", async () => {
    await hire("100.00");
    await hire("200.00");
    await revise(await hire("250.00"), "2026-03-01T09:00:00Z", "300.00");
    await hire("400.00");
    await hire("1000.00");

    const { rows } = await benchmark();

    expect(rows.items).toEqual([
      {
        month: "2026-09",
        work_country_code: "IN",
        department_id: "engineering",
        salary_currency_code: "INR",
        employee_count: 5,
        total_annual_base_pay: "2000.00",
        p10_annual_base_pay: "140.00",
        median_annual_base_pay: "300.00",
        p90_annual_base_pay: "760.00",
        country_median_annual_base_pay: "300.00",
        median_gap_percent: "0.00",
        median_yoy_percent: "20.00",
      },
    ]);
  });

  it("interpolates percentiles in exact decimals before rounding half away from zero", async () => {
    for (const amount of ["100.00", "100.01", "100.02", "100.04"]) await hire(amount);

    const { rows } = await benchmark();

    expect(rows.items[0]).toMatchObject({
      total_annual_base_pay: "400.07",
      p10_annual_base_pay: "100.00",
      median_annual_base_pay: "100.02",
      p90_annual_base_pay: "100.03",
    });
  });

  it("takes the latest revision before the next UTC midnight, and `to` as the final partial month's snapshot", async () => {
    let employee = await hire("100.00");
    employee = await revise(employee, "2026-09-30T23:59:59Z", "200.00");
    employee = await revise(employee, "2026-10-01T00:00:00Z", "300.00");
    employee = await revise(employee, "2026-10-15T23:00:00Z", "400.00");
    await revise(employee, "2026-10-16T08:00:00Z", "500.00");

    const { rows, summary } = await benchmark({ to: "2026-10-15" });

    expect(rows.items.map((row) => [row.month, row.median_annual_base_pay])).toEqual([
      ["2026-09", "200.00"],
      ["2026-10", "400.00"],
    ]);
    expect(summary.snapshot_date).toBe("2026-10-15");
  });

  it("includes employees active at each snapshot; a pre-joining revision first appears after joining", async () => {
    await hire("10.00", { joining_date: "2026-09-30" });
    await hire("20.00", { last_working_day: "2026-09-30" });
    await hire("40.00", { last_working_day: "2026-09-29" });
    await hire("80.00", { joining_date: "2026-10-01" });
    const offer = await revise(await hire("85.00", { joining_date: "2026-08-10" }), "2026-08-20T09:00:00Z", "90.00");
    await updateEmployee(offer, { joining_date: "2026-10-05" });

    const { rows } = await benchmark({ from: "2026-08-01", to: "2026-10-15" });

    expect(headcounts(rows.items)).toEqual([
      ["2026-08 IN/engineering/INR", 2, "60.00"],
      ["2026-09 IN/engineering/INR", 2, "30.00"],
      ["2026-10 IN/engineering/INR", 3, "180.00"],
    ]);
  });

  it("uses the country, department and currency saved with each salary entry", async () => {
    let employee = await hire("1000.00");
    employee = await revise(employee, "2026-05-01T09:00:00Z", "1100.00");
    employee = await updateEmployee(employee, { work_country_code: "US", department_id: "finance" });
    await revise(employee, "2026-10-05T09:00:00Z", "50.00", "USD");

    const { rows } = await benchmark({ to: "2026-10-15" });

    expect(headcounts(rows.items)).toEqual([
      ["2026-09 IN/engineering/INR", 1, "1100.00"],
      ["2026-10 US/finance/USD", 1, "50.00"],
    ]);
  });

  it("keeps currencies apart and compares each department with its country median across departments", async () => {
    await hire("100.00");
    await hire("300.00");
    await hire("500.00", { department_id: "finance", joining_date: "2026-01-15" });
    await hire("70.00", { salary_currency_code: "USD" });

    const all = await benchmark();
    const finance = await benchmark({ department_id: "finance" });

    const comparison = (row: HistoricalSalaryBenchmarkRow) => [
      group(row),
      row.median_annual_base_pay,
      row.country_median_annual_base_pay,
      row.median_gap_percent,
      row.median_yoy_percent,
    ];
    expect(all.rows.items.map(comparison)).toEqual([
      ["2026-09 IN/engineering/INR", "200.00", "300.00", "-33.33", "0.00"],
      ["2026-09 IN/engineering/USD", "70.00", "70.00", "0.00", "0.00"],
      ["2026-09 IN/finance/INR", "500.00", "300.00", "66.67", null],
    ]);
    expect(finance.rows.items.map(comparison)).toEqual([["2026-09 IN/finance/INR", "500.00", "300.00", "66.67", null]]);
  });
});
