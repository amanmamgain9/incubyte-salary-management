import { describe, expect, it } from "vitest";
import { addMonths, monthEnd } from "@/lib/dates";
import { toMinorUnits } from "@/lib/money";
import { type GeneratedHistoryEntry, generateDataset, tenureBand } from "@scripts/data-generation/generate";
import { TENURE_BANDS } from "@scripts/data-generation/profiles";

const AS_OF = "2026-10-21";
const dataset = generateDataset({ seed: "unit", as_of: AS_OF, changed_by: "hr-1" });

const historyOf = new Map<string, GeneratedHistoryEntry[]>();
for (const entry of dataset.history) historyOf.set(entry.employee_id, [...(historyOf.get(entry.employee_id) ?? []), entry]);
const entriesOf = (id: string) => historyOf.get(id) ?? [];
const utcDate = (entry: GeneratedHistoryEntry) => entry.changed_at.toISOString().slice(0, 10);
const utcTime = (entry: GeneratedHistoryEntry) => entry.changed_at.toISOString().slice(11, 19);
const revisedOffers = new Set(dataset.known_cases["revised-offer"]);
/** Non-initial revisions with their preceding entry. */
const changes = dataset.history.flatMap((entry) => {
  const previous = entriesOf(entry.employee_id)[entry.revision - 2];
  return previous ? [{ entry, previous }] : [];
});

describe("generated salary history invariants", () => {
  it("numbers revisions 1..n per employee with strictly increasing timestamps, starting from an initial salary", () => {
    for (const employee of dataset.employees) {
      const entries = entriesOf(employee.id);
      expect(entries.map((entry) => entry.revision)).toEqual(entries.map((_, index) => index + 1));
      expect(entries[0]?.reason).toBe("Initial salary");
      for (let i = 1; i < entries.length; i++) {
        expect(entries[i]!.changed_at.getTime()).toBeGreaterThan(entries[i - 1]!.changed_at.getTime());
      }
    }
  });

  it("keeps each employee's current pay, currency and salary_revision equal to the latest entry", () => {
    for (const employee of dataset.employees) {
      const latest = entriesOf(employee.id).at(-1);
      expect(employee.salary_revision).toBe(latest?.revision);
      expect(employee.annual_base_pay).toBe(latest?.annual_base_pay);
      expect(employee.salary_currency_code).toBe(latest?.currency_code);
    }
  });

  it("stores positive amounts with exactly two decimals", () => {
    for (const entry of dataset.history) {
      expect(entry.annual_base_pay).toMatch(/^\d+\.\d{2}$/);
      expect(toMinorUnits(entry.annual_base_pay)! > 0n).toBe(true);
    }
  });

  it("dates revisions within employment and no later than as_of, except revised offers before joining", () => {
    for (const employee of dataset.employees) {
      for (const entry of entriesOf(employee.id)) {
        const date = utcDate(entry);
        expect(date <= AS_OF).toBe(true);
        if (employee.last_working_day !== null) expect(date <= employee.last_working_day).toBe(true);
        if (entry.revision > 1 && !revisedOffers.has(employee.id)) expect(date >= employee.joining_date).toBe(true);
      }
    }
  });

  it("gives upcoming joiners only an initial entry recorded at as_of", () => {
    for (const employee of dataset.employees.filter((e) => e.joining_date > AS_OF)) {
      expect(entriesOf(employee.id).map(utcDate)).toEqual([AS_OF]);
    }
  });

  it("keeps entry counts within the range for each tenure band", () => {
    for (const employee of dataset.employees.filter((e) => e.joining_date <= AS_OF)) {
      const band = TENURE_BANDS[tenureBand(employee.joining_date, employee.last_working_day ?? AS_OF)];
      const count = entriesOf(employee.id).length;
      expect(count).toBeGreaterThanOrEqual(band!.entries[0]);
      expect(count).toBeLessThanOrEqual(band!.entries[1]);
    }
  });

  it("gives most employees under one year a single entry and a few an early raise", () => {
    const recent = dataset.employees.filter((e) => e.joining_date <= AS_OF && e.joining_date > addMonths(AS_OF, -12));
    const single = recent.filter((employee) => entriesOf(employee.id).length === 1).length;
    expect(single / recent.length).toBeGreaterThan(0.8);
    expect(single).toBeLessThan(recent.length);
  });

  it("spans up to 15 years of history", () => {
    const dates = dataset.history.map(utcDate).sort();
    expect(dates[0]! > addMonths(AS_OF, -180)).toBe(true);
    expect(dates[0]! < addMonths(AS_OF, -179)).toBe(true);
  });

  it("gives each change a matching reason", () => {
    for (const { entry, previous } of changes) {
      const diff = toMinorUnits(entry.annual_base_pay)! - toMinorUnits(previous.annual_base_pay)!;
      if (entry.currency_code !== previous.currency_code) {
        expect(["Currency change", "Relocation"]).toContain(entry.reason);
      } else if (entry.reason === "Correction") expect(diff < 0n).toBe(true);
      else if (entry.reason === "Transfer") expect(diff).toBe(0n);
      else {
        expect(["Annual review", "Promotion", "Market adjustment", "Early raise", "Revised offer"]).toContain(entry.reason);
        expect(diff > 0n).toBe(true);
      }
    }
  });
});

describe("generated known cases", () => {
  it("includes several revisions on one day", () => {
    const sameDay = changes.filter(({ entry, previous }) => utcDate(entry) === utcDate(previous));
    expect(sameDay.length).toBeGreaterThanOrEqual(10);
  });

  it("includes revisions at both sides of a month boundary", () => {
    expect(dataset.history.some((e) => utcTime(e) === "23:59:59" && monthEnd(utcDate(e)) === utcDate(e))).toBe(true);
    expect(dataset.history.some((e) => utcTime(e) === "00:00:00" && utcDate(e).endsWith("-01") && e.revision > 1)).toBe(true);
  });

  it("includes revised offers recorded before joining", () => {
    expect(revisedOffers.size).toBeGreaterThan(0);
    for (const id of revisedOffers) {
      const employee = dataset.employees.find((e) => e.id === id)!;
      const entries = entriesOf(id);
      expect(entries.map((entry) => entry.reason)).toEqual(["Initial salary", "Revised offer"]);
      expect(entries.every((entry) => utcDate(entry) < employee.joining_date)).toBe(true);
    }
  });

  it("includes currency switches, including India INR/USD and relocations", () => {
    const switches = changes.filter(({ entry, previous }) => entry.currency_code !== previous.currency_code);
    expect(switches.length).toBeGreaterThanOrEqual(20);
    const pairs = new Set(switches.map(({ entry, previous }) => `${previous.currency_code}>${entry.currency_code}`));
    expect([...pairs].sort()).toEqual(["INR>USD", "USD>GBP", "USD>INR"]);
  });

  it("includes employees whose current assignment differs from earlier snapshots", () => {
    const moved = dataset.employees.filter((employee) =>
      entriesOf(employee.id).some(
        (entry) =>
          entry.department_id_at_change !== employee.department_id ||
          entry.work_country_code_at_change !== employee.work_country_code,
      ),
    );
    expect(moved.length).toBeGreaterThanOrEqual(50);
  });

  it("includes the EUR 100,000 → 110,000 → 108,000 example", () => {
    const [id] = dataset.known_cases["eur-review-correction"];
    expect(entriesOf(id!).map((entry) => [entry.currency_code, entry.annual_base_pay])).toEqual([
      ["EUR", "100000.00"],
      ["EUR", "110000.00"],
      ["EUR", "108000.00"],
    ]);
  });

  it("includes leavers with earlier raises", () => {
    const leaversWithRaises = dataset.employees.filter(
      (e) => e.last_working_day !== null && entriesOf(e.id).some((entry) => entry.reason === "Annual review"),
    );
    expect(leaversWithRaises.length).toBeGreaterThan(100);
  });
});

describe("generated review patterns in the latest 24 months", () => {
  const firstMonth = addMonths(AS_OF, -23).slice(0, 7);
  const monthly = new Map<string, { increases: bigint; decreases: bigint; revisions: number }>();
  for (const { entry, previous } of changes) {
    const month = utcDate(entry).slice(0, 7);
    if (month < firstMonth) continue;
    const key = `${entry.work_country_code_at_change}:${month}`;
    const totals = monthly.get(key) ?? { increases: 0n, decreases: 0n, revisions: 0 };
    totals.revisions++;
    if (entry.currency_code === previous.currency_code) {
      const diff = toMinorUnits(entry.annual_base_pay)! - toMinorUnits(previous.annual_base_pay)!;
      if (diff > 0n) totals.increases += diff;
      else totals.decreases -= diff;
    }
    monthly.set(key, totals);
  }
  const months = Array.from({ length: 24 }, (_, index) => addMonths(AS_OF, index - 23).slice(0, 7));
  const busiestMonth = (country: string) =>
    months
      .map((month) => ({ month, increases: monthly.get(`${country}:${month}`)?.increases ?? 0n }))
      .sort((a, b) => (a.increases < b.increases ? 1 : a.increases > b.increases ? -1 : 0))[0]?.month.slice(5);

  it("has a negative-net month in France's correction period", () => {
    const negative = months.filter((month) => {
      const totals = monthly.get(`FR:${month}`);
      return totals !== undefined && totals.decreases > totals.increases;
    });
    expect(negative.length).toBeGreaterThanOrEqual(1);
  });

  it("has quiet months without any revisions in the United Kingdom", () => {
    expect(months.filter((month) => !monthly.has(`GB:${month}`)).length).toBeGreaterThanOrEqual(1);
  });

  it.each([
    ["IN", ["04"]],
    ["US", ["01", "04", "07", "10"]],
    ["GB", ["04"]],
    ["DE", ["01", "07"]],
    ["FR", ["03"]],
    ["CA", ["06"]],
    ["SG", ["01", "03", "09"]],
  ])("peaks %s's increases in its review months", (country, reviewMonths) => {
    expect(reviewMonths).toContain(busiestMonth(country));
  });
});
