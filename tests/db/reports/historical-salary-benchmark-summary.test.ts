import { beforeEach, describe, expect, it } from "vitest";
import type { HistoricalSalaryBenchmarkInput } from "@/contracts/reports/historical-salary-benchmark";
import { type EmployeeRow, type HrUserFixture, insertEmployee, insertHrUser, insertLookups } from "@tests/db/fixtures";
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
  (await callerFor(hr, { now })).reports.historicalSalaryBenchmark({ from: "2026-08-01", to: "2026-10-15", ...input });

let nextId = 0;
/** An employee in India, engineering, INR who joined on 2024-01-15 unless overridden. */
const hire = (annual_base_pay: string, overrides: Partial<EmployeeRow> = {}) =>
  insertEmployee({ id: `E-${++nextId}`, joining_date: "2024-01-15", annual_base_pay, ...overrides });

/** India engineering/finance in INR and USD, France in EUR; the French finance employee left on 2026-09-30. */
async function hireMixedTeams(): Promise<void> {
  await hire("100.00");
  await hire("300.00", { department_id: "finance" });
  await hire("50.00", { salary_currency_code: "USD" });
  await hire("70.00", { work_country_code: "FR", salary_currency_code: "EUR" });
  await hire("999.00", {
    work_country_code: "FR",
    department_id: "finance",
    salary_currency_code: "EUR",
    last_working_day: "2026-09-30",
  });
}

const noAmounts = {
  p10_annual_base_pay: null,
  median_annual_base_pay: null,
  p90_annual_base_pay: null,
  country_median_annual_base_pay: null,
};
const amounts = (p10: string, median: string, p90: string, country: string) => ({
  p10_annual_base_pay: p10,
  median_annual_base_pay: median,
  p90_annual_base_pay: p90,
  country_median_annual_base_pay: country,
});

describe("reports.historicalSalaryBenchmark summary", () => {
  it("totals the final snapshot by country and currency, independent of pagination", async () => {
    await hireMixedTeams();

    const { rows, summary } = await benchmark({ limit: 1 });

    expect(rows.items).toHaveLength(1);
    expect(rows.total_count).toBe(14);
    expect({ ...summary, trend: undefined }).toEqual({
      snapshot_date: "2026-10-15",
      employee_count: 4,
      by_country: [
        { work_country_code: "FR", salary_currency_code: "EUR", employee_count: 1, total_annual_base_pay: "70.00" },
        { work_country_code: "IN", salary_currency_code: "INR", employee_count: 2, total_annual_base_pay: "400.00" },
        { work_country_code: "IN", salary_currency_code: "USD", employee_count: 1, total_annual_base_pay: "50.00" },
      ],
      trend: undefined,
    });
  });

  it("applies the department filter to final-snapshot membership", async () => {
    await hireMixedTeams();

    const { summary } = await benchmark({ department_id: "finance" });

    expect(summary.employee_count).toBe(1);
    expect(summary.by_country).toEqual([
      { work_country_code: "IN", salary_currency_code: "INR", employee_count: 1, total_annual_base_pay: "300.00" },
    ]);
  });

  it("trends headcount over every visible month, without amounts when groups are mixed", async () => {
    await hireMixedTeams();

    const { summary } = await benchmark();

    expect(summary.trend).toEqual([
      { month: "2026-08", employee_count: 5, ...noAmounts },
      { month: "2026-09", employee_count: 5, ...noAmounts },
      { month: "2026-10", employee_count: 4, ...noAmounts },
    ]);
  });

  it("trends one group's pay range against its all-department country median", async () => {
    await hire("100.00");
    await hire("300.00", { joining_date: "2026-09-10" });
    await hire("500.00", { department_id: "finance" });

    const { summary } = await benchmark({ from: "2026-08-01", to: "2026-09-30", department_id: "engineering" });

    expect(summary.trend).toEqual([
      { month: "2026-08", employee_count: 1, ...amounts("100.00", "100.00", "100.00", "300.00") },
      { month: "2026-09", employee_count: 2, ...amounts("120.00", "200.00", "280.00", "300.00") },
    ]);
  });

  it("counts zero without amounts in visible months before anyone matches", async () => {
    await hire("100.00");

    const { rows, summary } = await benchmark({ from: "2023-12-01", to: "2024-01-31" });

    expect(rows.items.map((row) => row.month)).toEqual(["2024-01"]);
    expect(summary.trend).toEqual([
      { month: "2023-12", employee_count: 0, ...noAmounts },
      { month: "2024-01", employee_count: 1, ...amounts("100.00", "100.00", "100.00", "100.00") },
    ]);
  });

  it("returns empty rows, groups and trend with zero counts for known codes without matches", async () => {
    await hire("70.00", { work_country_code: "FR", salary_currency_code: "EUR" });

    const result = await benchmark({ work_country_code: "FR", salary_currency_code: "INR" });

    expect(result).toEqual({
      rows: { items: [], next_cursor: null, prev_cursor: null, total_count: 0, range_start: 0 },
      summary: { snapshot_date: "2026-10-15", employee_count: 0, by_country: [], trend: [] },
    });
  });

  it("rejects unknown codes and an end date after today, keyed by field", async () => {
    await expect(
      benchmark({ work_country_code: "JP", department_id: "legal", salary_currency_code: "JPY" }),
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
    await expect(benchmark({ to: "2026-10-22" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      cause: { field_errors: { to: "Must be today or earlier" } },
    });
    await expect(benchmark({ from: "2026-08-02" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("pages forward and back by month, country, department and currency with range starts", async () => {
    await hire("100.00");
    await hire("300.00", { department_id: "finance" });
    const page = (cursor?: string | null) =>
      benchmark({ limit: 4, cursor: cursor ?? undefined });
    const keys = (rows: { items: { month: string; department_id: string }[] }) =>
      rows.items.map((row) => `${row.month}/${row.department_id}`);

    const first = (await page()).rows;
    const second = (await page(first.next_cursor)).rows;
    const back = (await page(second.prev_cursor)).rows;

    expect([keys(first), first.range_start, first.total_count]).toEqual([
      ["2026-08/engineering", "2026-08/finance", "2026-09/engineering", "2026-09/finance"],
      1,
      6,
    ]);
    expect([keys(second), second.range_start, second.next_cursor]).toEqual([
      ["2026-10/engineering", "2026-10/finance"],
      5,
      null,
    ]);
    expect([keys(back), back.range_start, back.prev_cursor]).toEqual([keys(first), 1, null]);
  });
});
