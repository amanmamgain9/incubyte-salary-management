// Report checks for `npm run db:verify`: each report's queries, run as owner for representative filter sets, compared
// with expectations re-aggregated from the independent manifest in exact minor units.
import type { ReportFilters } from "@/contracts/reports/filters";
import { addMonths, monthStart } from "@/lib/dates";
import { divideRounded, fromMinorUnits, toMinorUnits } from "@/lib/money";
import { ownerDb } from "@/server/db/owner";
import {
  countDepartmentRows,
  selectDepartmentRows,
  selectDepartmentSummary,
} from "@/server/reports/department-breakdown/queries";
import {
  type BenchmarkRange,
  countBenchmarkRows,
  createBenchmarkGroups,
  selectBenchmarkRows,
  selectBenchmarkSummary,
} from "@/server/reports/historical-salary-benchmark/queries";
import {
  countCommitmentRows,
  selectCommitmentRows,
  selectCommitmentSummary,
} from "@/server/reports/salary-commitment/queries";
import {
  countGrowthRows,
  type GrowthPeriod,
  selectGrowthRows,
  selectGrowthSummary,
} from "@/server/reports/salary-growth/queries";
import type { Manifest } from "@scripts/data-generation/manifest";

export type Check = [name: string, expected: unknown, actual: unknown];

/** A page size that returns every row at once. */
const ALL = 1_000_000;

const FILTER_SETS: ReportFilters[] = [
  {},
  { work_country_code: "IN" },
  { salary_currency_code: "EUR" },
  { work_country_code: "US", department_id: "finance" },
  { work_country_code: "IN", department_id: "engineering", salary_currency_code: "USD" },
  { work_country_code: "FR", salary_currency_code: "INR" },
];

type Placed = { work_country_code: string; department_id: string; salary_currency_code: string };
const matches = (filters: ReportFilters) => (row: Placed) =>
  (filters.work_country_code ?? row.work_country_code) === row.work_country_code &&
  (filters.department_id ?? row.department_id) === row.department_id &&
  (filters.salary_currency_code ?? row.salary_currency_code) === row.salary_currency_code;

const units = (amount: string) => {
  const minor = toMinorUnits(amount);
  if (minor === null) throw new RangeError(`Not a decimal amount: ${amount}`);
  return minor;
};
const sumOf = <T>(items: readonly T[], amount: (item: T) => string) =>
  fromMinorUnits(items.reduce((total, item) => total + units(amount(item)), 0n));
const countOf = <T>(items: readonly T[], count: (item: T) => number) => items.reduce((n, item) => n + count(item), 0);

/** Groups rows by a composite key, in key order (keys never contain `|`). */
function groupBy<T>(items: readonly T[], keyOf: (item: T) => string[]): [string[], T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const id = keyOf(item).join("|");
    groups.set(id, [...(groups.get(id) ?? []), item]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, group]) => [id.split("|"), group]);
}

const pairOf = (row: { work_country_code: string; salary_currency_code: string }) => [
  row.work_country_code,
  row.salary_currency_code,
];

function expectedCommitment(manifest: Manifest, filters: ReportFilters) {
  const matching = manifest.departments.filter(matches(filters));
  const rows = groupBy(matching, pairOf).map(([[work_country_code = "", salary_currency_code = ""], group]) => ({
    work_country_code,
    salary_currency_code,
    employee_count: countOf(group, (row) => row.employee_count),
    total_annual_base_pay: sumOf(group, (row) => row.total_annual_base_pay),
  }));
  const summary = {
    employee_count: countOf(matching, (row) => row.employee_count),
    currency_count: new Set(matching.map((row) => row.salary_currency_code)).size,
    by_country: groupBy(matching, (row) => [row.work_country_code]).map(([[work_country_code = ""], group]) => ({
      work_country_code,
      employee_count: countOf(group, (row) => row.employee_count),
    })),
  };
  return { rows, total_count: rows.length, summary };
}

function expectedDepartments(manifest: Manifest, filters: ReportFilters) {
  const rows = manifest.departments.filter(matches(filters));
  const pairs = groupBy(rows, pairOf);
  const totals = <T extends { employee_count: number; total_annual_base_pay: string }>(group: T[]) => {
    const total = group.reduce((sum, row) => sum + units(row.total_annual_base_pay), 0n);
    const employee_count = countOf(group, (row) => row.employee_count);
    return { employee_count, total, total_annual_base_pay: fromMinorUnits(total) };
  };
  const summary = {
    employee_count: countOf(rows, (row) => row.employee_count),
    by_country: pairs.map(([[work_country_code = "", salary_currency_code = ""], group]) => {
      const { employee_count, total, total_annual_base_pay } = totals(group);
      const average_annual_base_pay = fromMinorUnits(divideRounded(total, BigInt(employee_count)));
      return { work_country_code, salary_currency_code, employee_count, total_annual_base_pay, average_annual_base_pay };
    }),
    by_department: groupBy(rows, (row) => [row.department_id]).map(([[department_id = ""], group]) => {
      const { employee_count, total_annual_base_pay } = totals(group);
      return { department_id, employee_count, total_annual_base_pay: pairs.length === 1 ? total_annual_base_pay : null };
    }),
  };
  return { rows, total_count: rows.length, summary };
}

function expectedGrowth(manifest: Manifest, period: GrowthPeriod) {
  const [first, last] = [period.from.slice(0, 7), period.to.slice(0, 7)];
  const inPeriod = manifest.growth.filter((row) => row.month >= first && row.month <= last && matches(period)(row));
  const totals = (group: Manifest["growth"]) => ({
    increases: sumOf(group, (row) => row.increases),
    decreases: sumOf(group, (row) => row.decreases),
    net_change: sumOf(group, (row) => row.net_change),
    currency_switch_count: countOf(group, (row) => row.currency_switch_count),
  });
  const monthly = groupBy(inPeriod, (row) => [row.month, ...pairOf(row)]);
  const rows = monthly.map(([[month = "", work_country_code = "", salary_currency_code = ""], group]) => ({
    month,
    work_country_code,
    salary_currency_code,
    ...totals(group),
  }));
  const by_country = groupBy(inPeriod, pairOf).map(([[work_country_code = "", salary_currency_code = ""], group]) => ({
    work_country_code,
    salary_currency_code,
    ...totals(group),
  }));
  const trendMonths = Array.from({ length: 12 }, (_, index) => addMonths(`${last}-01`, index - 11).slice(0, 7)).filter(
    (month) => month >= first,
  );
  const trend = by_country.flatMap(({ work_country_code, salary_currency_code }) =>
    trendMonths.map((month) => {
      const key = [month, work_country_code, salary_currency_code].join();
      const match = rows.find((row) => [row.month, ...pairOf(row)].join() === key);
      return { month, work_country_code, salary_currency_code, net_change: match?.net_change ?? "0.00" };
    }),
  );
  const currency_switch_count = countOf(by_country, (group) => group.currency_switch_count);
  return { rows, total_count: rows.length, summary: { by_country, currency_switch_count, trend } };
}

function expectedBenchmark(manifest: Manifest, range: BenchmarkRange) {
  const [first, last] = [range.from.slice(0, 7), range.to.slice(0, 7)];
  const rows = manifest.benchmark
    .filter((row) => row.month >= first && row.month <= last && matches(range)(row))
    .map(({ snapshot_date: _snapshot, ...row }) => row);
  const finalRows = rows.filter((row) => row.month === last);
  const groups = new Set(rows.map((row) => [row.work_country_code, row.department_id, row.salary_currency_code].join()));
  const singleGroup = groups.size === 1;
  const months: string[] = [];
  for (let month = range.from; month <= range.to; month = addMonths(month, 1)) months.push(month.slice(0, 7));
  const trend = rows.length === 0 ? [] : months.map((month) => {
    const inMonth = rows.filter((row) => row.month === month);
    const only = singleGroup ? inMonth[0] : undefined;
    return {
      month,
      employee_count: countOf(inMonth, (row) => row.employee_count),
      p10_annual_base_pay: only?.p10_annual_base_pay ?? null,
      median_annual_base_pay: only?.median_annual_base_pay ?? null,
      p90_annual_base_pay: only?.p90_annual_base_pay ?? null,
      country_median_annual_base_pay: only?.country_median_annual_base_pay ?? null,
    };
  });
  const by_country = groupBy(finalRows, pairOf).map(([[work_country_code = "", salary_currency_code = ""], group]) => ({
    work_country_code,
    salary_currency_code,
    employee_count: countOf(group, (row) => row.employee_count),
    total_annual_base_pay: sumOf(group, (row) => row.total_annual_base_pay),
  }));
  const employee_count = countOf(finalRows, (row) => row.employee_count);
  const only = singleGroup ? rows[0] : undefined;
  const group = only
    ? {
        work_country_code: only.work_country_code,
        department_id: only.department_id,
        salary_currency_code: only.salary_currency_code,
      }
    : null;
  const summary = { snapshot_date: range.to, employee_count, by_country, group, trend };
  return { rows, total_count: rows.length, summary };
}

const describe = (filters: object) => JSON.stringify(filters);

/** Every report check for the dataset as of `asOf`, expected (from the manifest) beside actual (from the queries). */
export async function reportChecks(manifest: Manifest, asOf: string): Promise<Check[]> {
  const checks: Check[] = [];
  for (const filters of FILTER_SETS) {
    checks.push([`salary commitment ${describe(filters)}`, expectedCommitment(manifest, filters), {
      rows: await selectCommitmentRows(ownerDb, filters, asOf, null, ALL),
      total_count: await countCommitmentRows(ownerDb, filters, asOf),
      summary: await selectCommitmentSummary(ownerDb, filters, asOf),
    }]);
    checks.push([`department breakdown ${describe(filters)}`, expectedDepartments(manifest, filters), {
      rows: await selectDepartmentRows(ownerDb, filters, asOf, null, ALL),
      total_count: await countDepartmentRows(ownerDb, filters, asOf),
      summary: await selectDepartmentSummary(ownerDb, filters, asOf),
    }]);
  }
  const lastTwoYears = monthStart(addMonths(asOf, -23));
  const growthPeriods: GrowthPeriod[] = [
    { from: lastTwoYears, to: asOf },
    { from: lastTwoYears, to: asOf, work_country_code: "FR" },
    { from: lastTwoYears, to: asOf, department_id: "engineering" },
    { from: monthStart(addMonths(asOf, -179)), to: asOf, work_country_code: "IN", department_id: "sales" },
  ];
  for (const period of growthPeriods) {
    checks.push([`salary growth ${describe(period)}`, expectedGrowth(manifest, period), {
      rows: await selectGrowthRows(ownerDb, period, null, ALL),
      total_count: await countGrowthRows(ownerDb, period),
      summary: await selectGrowthSummary(ownerDb, period),
    }]);
  }
  const benchmarkRanges: BenchmarkRange[] = [
    { from: lastTwoYears, to: asOf },
    { from: lastTwoYears, to: asOf, department_id: "finance" },
    { from: lastTwoYears, to: asOf, work_country_code: "IN", department_id: "engineering", salary_currency_code: "USD" },
    { from: monthStart(addMonths(asOf, -179)), to: asOf },
  ];
  for (const range of benchmarkRanges) {
    const actual = await ownerDb.transaction(async (tx) => {
      await createBenchmarkGroups(tx, range);
      return {
        rows: await selectBenchmarkRows(tx, range, null, ALL),
        total_count: await countBenchmarkRows(tx, range),
        summary: await selectBenchmarkSummary(tx, range),
      };
    });
    checks.push([`historical salary benchmark ${describe(range)}`, expectedBenchmark(manifest, range), actual]);
  }
  return checks;
}
