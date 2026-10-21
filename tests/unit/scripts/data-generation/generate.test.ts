import { describe, expect, it } from "vitest";
import { addMonths } from "@/lib/dates";
import { toMinorUnits } from "@/lib/money";
import { type GeneratedEmployee, generateDataset, tenureBand } from "@scripts/data-generation/generate";
import { DEPARTMENT_IDS } from "@scripts/data-generation/profiles";

const AS_OF = "2026-10-21";
const dataset = generateDataset({ seed: "unit", as_of: AS_OF, changed_by: "hr-1" });

const statusOf = (employee: GeneratedEmployee) =>
  employee.joining_date > AS_OF
    ? "upcoming"
    : employee.last_working_day !== null && employee.last_working_day < AS_OF
      ? "departed"
      : "active";
const active = dataset.employees.filter((employee) => statusOf(employee) === "active");
const countBy = <T>(items: readonly T[], key: (item: T) => string) => {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return counts;
};

describe("generateDataset reproducibility", () => {
  it("repeats employees, history and IDs exactly for the same seed and as_of", () => {
    expect(generateDataset({ seed: "unit", as_of: AS_OF, changed_by: "hr-1" })).toEqual(dataset);
  });

  it("produces different data for a different seed", () => {
    const other = generateDataset({ seed: "unit-2", as_of: AS_OF, changed_by: "hr-1" });
    expect(other.employees.map((employee) => employee.joining_date)).not.toEqual(
      dataset.employees.map((employee) => employee.joining_date),
    );
  });

  it("uses stable, unique employee and history IDs", () => {
    expect(dataset.employees[0]?.id).toBe("E-00001");
    expect(new Set(dataset.employees.map((employee) => employee.id)).size).toBe(10_000);
    expect(new Set(dataset.history.map((entry) => entry.id)).size).toBe(dataset.history.length);
  });
});

describe("generateDataset population", () => {
  it("has exactly 10,000 employees split by work country", () => {
    expect(dataset.employees).toHaveLength(10_000);
    expect(countBy(dataset.employees, (employee) => employee.work_country_code)).toEqual({
      IN: 3500, US: 2200, GB: 1300, DE: 1200, FR: 800, CA: 600, SG: 400,
    });
  });

  it("pays each country in its main currency except 200 India employees in USD", () => {
    expect(countBy(dataset.employees, (e) => `${e.work_country_code}:${e.salary_currency_code}`)).toEqual({
      "IN:INR": 3300, "IN:USD": 200, "US:USD": 2200, "GB:GBP": 1300, "DE:EUR": 1200, "FR:EUR": 800, "CA:CAD": 600, "SG:SGD": 400,
    });
  });

  it("has 9,000 active, 900 departed and 100 upcoming employees at as_of", () => {
    expect(countBy(dataset.employees, statusOf)).toEqual({ active: 9000, departed: 900, upcoming: 100 });
  });

  it("places departures within the previous year and upcoming joins within the next month", () => {
    for (const employee of dataset.employees) {
      if (statusOf(employee) === "departed") {
        expect(employee.last_working_day! >= addMonths(AS_OF, -12)).toBe(true);
      }
      if (statusOf(employee) === "upcoming") expect(employee.joining_date <= addMonths(AS_OF, 1)).toBe(true);
    }
  });

  it("keeps every last working day on or after the joining date", () => {
    for (const employee of dataset.employees) {
      if (employee.last_working_day !== null) expect(employee.last_working_day >= employee.joining_date).toBe(true);
    }
  });

  it("distributes active employees over the tenure quotas", () => {
    expect(countBy(active, (employee) => String(tenureBand(employee.joining_date, AS_OF)))).toEqual({
      0: 1800, 1: 2250, 2: 2250, 3: 1800, 4: 900,
    });
  });

  it("opens Canada and Singapore within the last five years and gives established offices more 5+ year staff", () => {
    const fivePlusShare = (country: string) => {
      const staff = active.filter((employee) => employee.work_country_code === country);
      return staff.filter((employee) => tenureBand(employee.joining_date, AS_OF) >= 3).length / staff.length;
    };
    for (const employee of dataset.employees) {
      if (["CA", "SG"].includes(employee.work_country_code)) {
        expect(employee.joining_date > addMonths(AS_OF, -60)).toBe(true);
      }
    }
    for (const established of ["US", "GB", "DE", "FR"]) {
      expect(fivePlusShare(established)).toBeGreaterThan(fivePlusShare("IN"));
    }
  });

  it("starts every joining date within the last 15 years", () => {
    const earliest = dataset.employees.map((employee) => employee.joining_date).sort()[0];
    expect(earliest! > addMonths(AS_OF, -180)).toBe(true);
    expect(earliest! < addMonths(AS_OF, -179)).toBe(true);
  });

  it("populates every country/department combination with active employees", () => {
    const combos = countBy(active, (employee) => `${employee.work_country_code}:${employee.department_id}`);
    for (const country of ["IN", "US", "GB", "DE", "FR", "CA", "SG"]) {
      for (const department of DEPARTMENT_IDS) expect(combos[`${country}:${department}`]).toBeGreaterThan(0);
    }
  });

  it("varies department proportions per country", () => {
    const engineeringShare = (country: string) => {
      const staff = active.filter((employee) => employee.work_country_code === country);
      return staff.filter((employee) => employee.department_id === "engineering").length / staff.length;
    };
    expect(engineeringShare("IN")).toBeGreaterThan(engineeringShare("FR") + 0.15);
  });

  it("repeats names under different IDs and includes fractional salaries", () => {
    expect(Object.values(countBy(dataset.employees, (employee) => employee.name)).some((count) => count > 1)).toBe(true);
    expect(dataset.employees.some((employee) => !employee.annual_base_pay.endsWith(".00"))).toBe(true);
  });
});

describe("generateDataset pay patterns", () => {
  const groups = ["IN:INR", "IN:USD", "US:USD", "GB:GBP", "DE:EUR", "FR:EUR", "CA:CAD", "SG:SGD"];

  it.each(groups)("in %s, Engineering leads headcount and total pay, Finance the average, Operations is lowest", (group) => {
    const stats = DEPARTMENT_IDS.map((department) => {
      const staff = active.filter(
        (e) => `${e.work_country_code}:${e.salary_currency_code}` === group && e.department_id === department,
      );
      const total = staff.reduce((sum, employee) => sum + toMinorUnits(employee.annual_base_pay)!, 0n);
      return { department, count: staff.length, total, average: total / BigInt(staff.length) };
    });
    const top = <K extends "count" | "total" | "average">(key: K, sign: 1 | -1) =>
      [...stats].sort((a, b) => (a[key] < b[key] ? sign : a[key] > b[key] ? -sign : 0))[0]?.department;
    expect(top("count", 1)).toBe("engineering");
    expect(top("total", 1)).toBe("engineering");
    expect(top("average", 1)).toBe("finance");
    expect(top("average", -1)).toBe("operations");
  });
});
