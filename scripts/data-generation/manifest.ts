// Independent expected report numbers for a dataset (docs/data-generation.md › Known cases and checks).
// Deliberately shares nothing with the app's SQL: plain loops over the rows with exact bigint minor units.
// Rounding is half away from zero, as PostgreSQL `round(numeric)`.
import { addDays, addMonths, monthEnd, monthStart } from "@/lib/dates";
import { divideRounded, fromMinorUnits, toMinorUnits } from "@/lib/money";
import type { GeneratedEmployee, GeneratedHistoryEntry } from "./generate";
import { HISTORY_YEARS } from "./profiles";

export type ManifestInput = {
  as_of: string;
  employees: readonly Pick<
    GeneratedEmployee,
    "id" | "department_id" | "work_country_code" | "joining_date" | "last_working_day" | "annual_base_pay" | "salary_currency_code"
  >[];
  history: readonly Pick<
    GeneratedHistoryEntry,
    | "employee_id"
    | "revision"
    | "annual_base_pay"
    | "currency_code"
    | "work_country_code_at_change"
    | "department_id_at_change"
    | "changed_at"
  >[];
};

type CountryCurrency = { work_country_code: string; salary_currency_code: string };
type Totals = { employee_count: number; total_annual_base_pay: string };

export type Manifest = {
  as_of: string;
  status: { employee_count: number; active_count: number; upcoming_count: number; departed_count: number };
  /** Salary commitment rows: active at `as_of`, current pay; country, currency ascending. */
  commitment: (CountryCurrency & Totals)[];
  /** Department breakdown rows; country, department, currency ascending. */
  departments: (CountryCurrency & Totals & { department_id: string; average_annual_base_pay: string })[];
  /** Salary growth per month and snapshot country/department/currency of each non-initial revision. */
  growth: (CountryCurrency & {
    month: string;
    department_id: string;
    increases: string;
    decreases: string;
    net_change: string;
    currency_switch_count: number;
  })[];
  /** Historical benchmark per month-end snapshot (`as_of` for its own month) and country/department/currency. */
  benchmark: (CountryCurrency &
    Totals & {
      month: string;
      snapshot_date: string;
      department_id: string;
      p10_annual_base_pay: string;
      median_annual_base_pay: string;
      p90_annual_base_pay: string;
      country_median_annual_base_pay: string;
      median_gap_percent: string;
      median_yoy_percent: string | null;
    })[];
};

const compare = <T extends string | bigint>(a: T, b: T) => (a < b ? -1 : a > b ? 1 : 0);
const compareKeys = (a: readonly string[], b: readonly string[]) => {
  for (let i = 0; i < a.length; i++) {
    const order = compare(a[i] ?? "", b[i] ?? "");
    if (order !== 0) return order;
  }
  return 0;
};
/** Groups by a composite key, keeping the key parts for sorting. */
function groupBy<T>(items: Iterable<T>, keyOf: (item: T) => string[]): { key: string[]; items: T[] }[] {
  const groups = new Map<string, { key: string[]; items: T[] }>();
  for (const item of items) {
    const key = keyOf(item);
    const id = key.join("\u0000");
    const group = groups.get(id) ?? { key, items: [] };
    group.items.push(item);
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => compareKeys(a.key, b.key));
}
/** A stored amount in minor units; the dataset only holds valid two-place decimals. */
function units(amount: string): bigint {
  const minor = toMinorUnits(amount);
  if (minor === null) throw new RangeError(`Not a decimal amount: ${amount}`);
  return minor;
}
const sum = (amounts: readonly bigint[]) => amounts.reduce((total, amount) => total + amount, 0n);
const utcDate = (at: Date) => at.toISOString().slice(0, 10);

/** Exact percentile with linear interpolation (`percentile_cont`), in tenths of a minor unit, for p = tenths/10. */
function percentileTenths(sorted: readonly bigint[], tenths: 1 | 5 | 9): bigint {
  if (sorted.length === 0) throw new RangeError("Percentile of an empty set");
  const position = tenths * (sorted.length - 1);
  const lower = Math.floor(position / 10);
  const fraction = BigInt(position % 10);
  const low = sorted[lower] ?? 0n;
  const high = sorted[Math.min(lower + 1, sorted.length - 1)] ?? low;
  return low * (10n - fraction) + high * fraction;
}
const tenthsToAmount = (tenths: bigint) => fromMinorUnits(divideRounded(tenths, 10n));
/** `(value / reference − 1) × 100`, rounded to two places. */
const percentChange = (value: bigint, reference: bigint) => fromMinorUnits(divideRounded((value - reference) * 10_000n, reference));

export function buildManifest(input: ManifestInput): Manifest {
  const asOf = input.as_of;
  const activeOn = (date: string, e: ManifestInput["employees"][number]) =>
    e.joining_date <= date && (e.last_working_day === null || e.last_working_day >= date);
  const active = input.employees.filter((employee) => activeOn(asOf, employee));
  const upcoming = input.employees.filter((employee) => employee.joining_date > asOf).length;

  const commitment = groupBy(active, (e) => [e.work_country_code, e.salary_currency_code]).map(({ key, items }) => ({
    work_country_code: key[0] ?? "",
    salary_currency_code: key[1] ?? "",
    employee_count: items.length,
    total_annual_base_pay: fromMinorUnits(sum(items.map((e) => units(e.annual_base_pay)))),
  }));
  const departments = groupBy(active, (e) => [e.work_country_code, e.department_id, e.salary_currency_code]).map(
    ({ key, items }) => {
      const total = sum(items.map((e) => units(e.annual_base_pay)));
      return {
        work_country_code: key[0] ?? "",
        department_id: key[1] ?? "",
        salary_currency_code: key[2] ?? "",
        employee_count: items.length,
        total_annual_base_pay: fromMinorUnits(total),
        average_annual_base_pay: fromMinorUnits(divideRounded(total, BigInt(items.length))),
      };
    },
  );

  const historyOf = new Map<string, ManifestInput["history"][number][]>();
  for (const entry of input.history) {
    const entries = historyOf.get(entry.employee_id) ?? [];
    entries.push(entry);
    historyOf.set(entry.employee_id, entries);
  }
  for (const entries of historyOf.values()) entries.sort((a, b) => a.revision - b.revision);

  return {
    as_of: asOf,
    status: {
      employee_count: input.employees.length,
      active_count: active.length,
      upcoming_count: upcoming,
      departed_count: input.employees.length - active.length - upcoming,
    },
    commitment,
    departments,
    growth: growthRows(historyOf),
    benchmark: benchmarkRows(input, historyOf, activeOn),
  };
}

type Entries = Map<string, ManifestInput["history"][number][]>;

function growthRows(historyOf: Entries): Manifest["growth"] {
  const changes = [...historyOf.values()].flatMap((entries) =>
    entries.slice(1).map((entry, index) => ({ entry, previous: entries[index] ?? entry })),
  );
  return groupBy(changes, ({ entry }) => [
    entry.changed_at.toISOString().slice(0, 7),
    entry.work_country_code_at_change,
    entry.department_id_at_change,
    entry.currency_code,
  ]).map(({ key, items }) => {
    let increases = 0n;
    let decreases = 0n;
    let switches = 0;
    for (const { entry, previous } of items) {
      if (entry.currency_code !== previous.currency_code) {
        switches++;
        continue;
      }
      const diff = units(entry.annual_base_pay) - units(previous.annual_base_pay);
      if (diff > 0n) increases += diff;
      else decreases -= diff;
    }
    return {
      month: key[0] ?? "",
      work_country_code: key[1] ?? "",
      department_id: key[2] ?? "",
      salary_currency_code: key[3] ?? "",
      increases: fromMinorUnits(increases),
      decreases: fromMinorUnits(decreases),
      net_change: fromMinorUnits(increases - decreases),
      currency_switch_count: switches,
    };
  });
}

function benchmarkRows(
  input: ManifestInput,
  historyOf: Entries,
  activeOn: (date: string, employee: ManifestInput["employees"][number]) => boolean,
): Manifest["benchmark"] {
  const asOf = input.as_of;
  const rows: Manifest["benchmark"] = [];
  /** Exact medians (tenths) by `month|country|department|currency`, for year-over-year lookups. */
  const medians = new Map<string, bigint>();
  for (let month = monthStart(addMonths(asOf, -12 * HISTORY_YEARS)); month <= asOf; month = addMonths(month, 1)) {
    const snapshot = monthEnd(month) < asOf ? monthEnd(month) : asOf;
    const before = addDays(snapshot, 1);
    const snapshots = input.employees.flatMap((employee) => {
      if (!activeOn(snapshot, employee)) return [];
      const entry = (historyOf.get(employee.id) ?? []).findLast((candidate) => utcDate(candidate.changed_at) < before);
      return entry ? [{ entry, amount: units(entry.annual_base_pay) }] : [];
    });
    const countryMedians = new Map(
      groupBy(snapshots, ({ entry }) => [entry.work_country_code_at_change, entry.currency_code]).map(({ key, items }) => [
        key.join("|"),
        percentileTenths(items.map(({ amount }) => amount).sort(compare), 5),
      ]),
    );
    const groups = groupBy(snapshots, ({ entry }) => [
      entry.work_country_code_at_change,
      entry.department_id_at_change,
      entry.currency_code,
    ]);
    for (const { key, items } of groups) {
      const [country = "", department = "", currency = ""] = key;
      const sorted = items.map(({ amount }) => amount).sort(compare);
      const median = percentileTenths(sorted, 5);
      const countryMedian = countryMedians.get(`${country}|${currency}`) ?? median;
      const priorMedian = medians.get([addMonths(month, -12).slice(0, 7), country, department, currency].join("|"));
      medians.set([month.slice(0, 7), country, department, currency].join("|"), median);
      rows.push({
        month: month.slice(0, 7),
        snapshot_date: snapshot,
        work_country_code: country,
        department_id: department,
        salary_currency_code: currency,
        employee_count: sorted.length,
        total_annual_base_pay: fromMinorUnits(sum(sorted)),
        p10_annual_base_pay: tenthsToAmount(percentileTenths(sorted, 1)),
        median_annual_base_pay: tenthsToAmount(median),
        p90_annual_base_pay: tenthsToAmount(percentileTenths(sorted, 9)),
        country_median_annual_base_pay: tenthsToAmount(countryMedian),
        median_gap_percent: percentChange(median, countryMedian),
        median_yoy_percent: priorMedian === undefined ? null : percentChange(median, priorMedian),
      });
    }
  }
  return rows;
}
