import { describe, expect, it } from "vitest";
import { generateDataset } from "@scripts/data-generation/generate";
import { buildManifest, type ManifestInput } from "@scripts/data-generation/manifest";

type Employee = ManifestInput["employees"][number];
type Entry = ManifestInput["history"][number];

const AS_OF = "2026-03-15";

function person(id: string, at: Partial<Employee> & Pick<Employee, "joining_date">): Employee {
  return {
    id,
    department_id: "engineering",
    work_country_code: "DE",
    last_working_day: null,
    annual_base_pay: "1.00",
    salary_currency_code: "EUR",
    ...at,
  };
}

/** History rows for one employee: [ISO timestamp, amount, currency?, country?, department?] per revision. */
function entries(employee_id: string, rows: [string, string, string?, string?, string?][]): Entry[] {
  return rows.map(([at, amount, currency = "EUR", country = "DE", department = "engineering"], index) => ({
    employee_id,
    revision: index + 1,
    annual_base_pay: amount,
    currency_code: currency,
    work_country_code_at_change: country,
    department_id_at_change: department,
    changed_at: new Date(at),
  }));
}

// A: the documented EUR example across a month boundary. B: France stays separate from Germany despite EUR.
// C: India INR → USD switch. D: India INR. E: later leaver with an earlier raise. F: upcoming. G: revised offer.
const input: ManifestInput = {
  as_of: AS_OF,
  employees: [
    person("A", { joining_date: "2025-01-10", annual_base_pay: "108000.00" }),
    person("B", { joining_date: "2025-02-01", work_country_code: "FR", annual_base_pay: "50000.00" }),
    person("C", { joining_date: "2024-06-01", work_country_code: "IN", annual_base_pay: "15000.00", salary_currency_code: "USD" }),
    person("D", { joining_date: "2024-01-01", work_country_code: "IN", annual_base_pay: "2400000.50", salary_currency_code: "INR" }),
    person("E", { joining_date: "2024-01-01", last_working_day: "2026-03-14", department_id: "finance", annual_base_pay: "90000.00" }),
    person("F", { joining_date: "2026-04-01", department_id: "sales", annual_base_pay: "70000.00" }),
    person("G", { joining_date: "2025-03-10", department_id: "sales", annual_base_pay: "63000.00" }),
  ],
  history: [
    ...entries("A", [
      ["2025-01-10T09:00:00Z", "100000.00"],
      ["2025-04-01T00:00:00Z", "110000.00"],
      ["2025-06-30T23:59:59Z", "108000.00"],
    ]),
    ...entries("B", [["2025-02-01T09:00:00Z", "50000.00", "EUR", "FR"]]),
    ...entries("C", [
      ["2024-06-01T09:00:00Z", "1200000.00", "INR", "IN"],
      ["2025-05-10T09:00:00Z", "15000.00", "USD", "IN"],
    ]),
    ...entries("D", [["2024-01-01T09:00:00Z", "2400000.50", "INR", "IN"]]),
    ...entries("E", [
      ["2024-01-01T09:00:00Z", "80000.00", "EUR", "DE", "finance"],
      ["2025-04-15T09:00:00Z", "90000.00", "EUR", "DE", "finance"],
    ]),
    ...entries("F", [["2026-03-15T00:10:00Z", "70000.00", "EUR", "DE", "sales"]]),
    ...entries("G", [
      ["2025-02-10T09:00:00Z", "60000.00", "EUR", "DE", "sales"],
      ["2025-03-01T09:00:00Z", "63000.00", "EUR", "DE", "sales"],
    ]),
  ],
};
const manifest = buildManifest(input);
const benchmarkRow = (month: string, country: string, department: string, currency = "EUR") =>
  manifest.benchmark.find(
    (row) =>
      row.month === month &&
      row.work_country_code === country &&
      row.department_id === department &&
      row.salary_currency_code === currency,
  );

describe("buildManifest status and current pay", () => {
  it("counts employees by status at as_of", () => {
    expect(manifest.status).toEqual({ employee_count: 7, active_count: 5, upcoming_count: 1, departed_count: 1 });
  });

  it("totals active employees' current pay per country and currency, keeping EUR countries and India's currencies apart", () => {
    expect(manifest.commitment).toEqual([
      { work_country_code: "DE", salary_currency_code: "EUR", employee_count: 2, total_annual_base_pay: "171000.00" },
      { work_country_code: "FR", salary_currency_code: "EUR", employee_count: 1, total_annual_base_pay: "50000.00" },
      { work_country_code: "IN", salary_currency_code: "INR", employee_count: 1, total_annual_base_pay: "2400000.50" },
      { work_country_code: "IN", salary_currency_code: "USD", employee_count: 1, total_annual_base_pay: "15000.00" },
    ]);
  });

  it("splits departments and rounds averages half away from zero", () => {
    const small = buildManifest({
      as_of: AS_OF,
      employees: [
        person("x1", { joining_date: AS_OF, annual_base_pay: "100.00" }),
        person("x2", { joining_date: "2020-01-01", last_working_day: AS_OF, annual_base_pay: "100.00" }),
        person("x3", { joining_date: "2020-01-01", annual_base_pay: "100.01" }),
        person("y1", { joining_date: "2020-01-01", department_id: "people", annual_base_pay: "0.01" }),
        person("y2", { joining_date: "2020-01-01", department_id: "people", annual_base_pay: "0.02" }),
      ],
      history: [],
    });
    expect(small.departments.map((row) => [row.department_id, row.employee_count, row.average_annual_base_pay])).toEqual([
      ["engineering", 3, "100.00"],
      ["people", 2, "0.02"],
    ]);
  });
});

describe("buildManifest salary growth", () => {
  it("reports increases, decreases and net change per revision month, skipping initial salaries", () => {
    const rows = manifest.growth.map((row) => [row.month, row.work_country_code, row.department_id, row.salary_currency_code, row.increases, row.decreases, row.net_change, row.currency_switch_count]);
    expect(rows).toEqual([
      ["2025-03", "DE", "sales", "EUR", "3000.00", "0.00", "3000.00", 0],
      ["2025-04", "DE", "engineering", "EUR", "10000.00", "0.00", "10000.00", 0],
      ["2025-04", "DE", "finance", "EUR", "10000.00", "0.00", "10000.00", 0],
      ["2025-05", "IN", "engineering", "USD", "0.00", "0.00", "0.00", 1],
      ["2025-06", "DE", "engineering", "EUR", "0.00", "2000.00", "-2000.00", 0],
    ]);
  });
});

describe("buildManifest historical benchmark", () => {
  it("snapshots month ends, using as_of for the final partial month", () => {
    expect(benchmarkRow("2025-03", "DE", "engineering")?.snapshot_date).toBe("2025-03-31");
    expect(benchmarkRow("2026-03", "DE", "engineering")?.snapshot_date).toBe(AS_OF);
    expect(manifest.benchmark.some((row) => row.month > "2026-03")).toBe(false);
  });

  it("uses the latest revision before the next UTC midnight on each side of a month boundary", () => {
    expect(benchmarkRow("2025-03", "DE", "engineering")?.median_annual_base_pay).toBe("100000.00");
    expect(benchmarkRow("2025-04", "DE", "engineering")?.median_annual_base_pay).toBe("110000.00");
    expect(benchmarkRow("2025-06", "DE", "engineering")?.median_annual_base_pay).toBe("108000.00");
  });

  it("shows a pre-joining revision from the first snapshot after joining", () => {
    expect(benchmarkRow("2025-02", "DE", "sales")).toBeUndefined();
    expect(benchmarkRow("2025-03", "DE", "sales")?.total_annual_base_pay).toBe("63000.00");
  });

  it("drops a leaver after the last working day and keeps them before", () => {
    expect(benchmarkRow("2026-02", "DE", "finance")?.employee_count).toBe(1);
    expect(benchmarkRow("2026-03", "DE", "finance")).toBeUndefined();
  });

  it("compares department medians with the country median and the same group a year earlier", () => {
    // 2025-03 DE/EUR: 63,000 (sales), 80,000 (finance), 100,000 (engineering).
    expect(benchmarkRow("2025-03", "DE", "engineering")).toMatchObject({
      country_median_annual_base_pay: "80000.00",
      median_gap_percent: "25.00",
      median_yoy_percent: null,
    });
    expect(benchmarkRow("2026-03", "DE", "engineering")?.median_yoy_percent).toBe("8.00");
  });

  it("interpolates exact percentiles and rounds half away from zero", () => {
    const amounts = ["10.00", "20.00", "30.00", "40.00", "0.01", "0.02"];
    const many = buildManifest({
      as_of: AS_OF,
      employees: amounts.map((_, index) => person(`p${index}`, { joining_date: "2026-01-01", department_id: index < 4 ? "sales" : "people" })),
      history: amounts.flatMap((amount, index) => entries(`p${index}`, [["2026-01-01T09:00:00Z", amount, "EUR", "DE", index < 4 ? "sales" : "people"]])),
    });
    const at = (department: string) => many.benchmark.find((row) => row.month === "2026-03" && row.department_id === department);
    expect(at("sales")).toMatchObject({ p10_annual_base_pay: "13.00", median_annual_base_pay: "25.00", p90_annual_base_pay: "37.00" });
    expect(at("people")).toMatchObject({ p10_annual_base_pay: "0.01", median_annual_base_pay: "0.02", p90_annual_base_pay: "0.02" });
  });
});

describe("buildManifest on the generated dataset", () => {
  const dataset = generateDataset({ seed: "unit", as_of: "2026-10-21", changed_by: "hr-1" });
  const full = buildManifest(dataset);

  it("matches the population quotas", () => {
    expect(full.status).toEqual({ employee_count: 10_000, active_count: 9_000, upcoming_count: 100, departed_count: 900 });
    expect(full.commitment.reduce((count, row) => count + row.employee_count, 0)).toBe(9_000);
    expect(full.commitment.map((row) => `${row.work_country_code}:${row.salary_currency_code}`)).toEqual([
      "CA:CAD", "DE:EUR", "FR:EUR", "GB:GBP", "IN:INR", "IN:USD", "SG:SGD", "US:USD",
    ]);
  });

  it("has a benchmark snapshot for each of the last 180 months plus the current one", () => {
    expect(new Set(full.benchmark.map((row) => row.month)).size).toBe(181);
    const final = full.benchmark.filter((row) => row.month === "2026-10");
    expect(final.reduce((count, row) => count + row.employee_count, 0)).toBe(9_000);
  });
});
