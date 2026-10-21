import { and, type AnyColumn, count, type SQL, sql } from "drizzle-orm";
import { integer, numeric, pgTable, text } from "drizzle-orm/pg-core";
import type { KeysetFrom } from "@/contracts/paging";
import type {
  BenchmarkPoint,
  HistoricalSalaryBenchmarkInput,
  HistoricalSalaryBenchmarkRow,
  HistoricalSalaryBenchmarkSummary,
  SnapshotTotal,
} from "@/contracts/reports/historical-salary-benchmark";
import type { Tx } from "@/server/db/connect";
import { employees, salaryHistory } from "@/server/db/schema";
import { isActiveOn } from "@/server/employees/status";
import { assignmentAtChange, type FilterColumns, keyOrder, matchesFilters, pastKey } from "@/server/reports/filters";

export type BenchmarkRange = Omit<HistoricalSalaryBenchmarkInput, "cursor" | "limit">;
export type BenchmarkKey = readonly [month: string, work_country_code: string, department_id: string, currency: string];

/**
 * Per-request temporary table (ON COMMIT DROP; not part of the schema): one row per visible month and snapshot
 * country/department/currency, every department included so country medians are complete. Built once by
 * `createBenchmarkGroups` inside the operation's transaction, then read by the page, count and summary.
 */
const benchmarkGroups = pgTable("historical_salary_benchmark_groups", {
  month: text().notNull(),
  work_country_code: text().notNull(),
  department_id: text().notNull(),
  salary_currency_code: text().notNull(),
  employee_count: integer().notNull(),
  total_annual_base_pay: numeric().notNull(),
  p10_annual_base_pay: numeric().notNull(),
  median_annual_base_pay: numeric().notNull(),
  p90_annual_base_pay: numeric().notNull(),
  country_median_annual_base_pay: numeric().notNull(),
  median_gap_percent: numeric().notNull(),
  median_yoy_percent: numeric(),
});

const groupColumns: FilterColumns = {
  work_country_code: benchmarkGroups.work_country_code,
  department_id: benchmarkGroups.department_id,
  salary_currency_code: benchmarkGroups.salary_currency_code,
};
const benchmarkKey = [
  benchmarkGroups.month,
  benchmarkGroups.work_country_code,
  benchmarkGroups.department_id,
  benchmarkGroups.salary_currency_code,
] as const;

/** A date's month as an integer index (year × 12 + month − 1), so month ranges are integer ranges. */
const monthIndex = (date: SQL | AnyColumn) =>
  sql`(extract(year from ${date})::int * 12 + extract(month from ${date})::int - 1)`;

/**
 * Each group's amounts in integer cents, sorted. Hash-aggregating and sorting each group's array avoids sorting every
 * snapshot row by its collation-ordered text keys, and integers sort faster than numerics.
 */
const sortedCents = sql`array(select cents from unnest(array_agg(cents)) as cents order by cents)`;

/** Exact `percentile_cont(fraction)` of a sorted cents array of `size` amounts, by linear interpolation, in units. */
function percentile(sorted: SQL, size: SQL, fraction: "0.1" | "0.5" | "0.9"): SQL {
  const position = sql`(${fraction}::numeric * (${size} - 1))`;
  const lower = sql`${sorted}[floor(${position})::int + 1]`;
  const upper = sql`coalesce(${sorted}[floor(${position})::int + 2], ${lower})`;
  return sql`((${lower} + (${position} - floor(${position})) * (${upper} - ${lower})) / 100.0)`;
}

/**
 * Builds the request's month-end snapshots in one statement. Each salary entry is valid from its UTC date until the
 * next entry's: at the snapshot of month m (its last day, or `to` in the final month) it is the employee's latest entry
 * exactly when month(valid_from) ≤ m < month(valid_until). Snapshots run from 12 months before `from` (for
 * year-over-year) through `to`; employees active on a snapshot date contribute that entry's amount under its country,
 * department and currency. Country and currency filters apply here; the department filter applies on read, so
 * country medians span every department. Runs inside the caller's transaction, which owns the temporary table.
 */
export async function createBenchmarkGroups(tx: Tx, range: BenchmarkRange): Promise<void> {
  await applySnapshotSettings(tx);
  await tx.execute(benchmarkGroupsStatement(range));
}

/** `EXPLAIN (ANALYZE, BUFFERS)` of `createBenchmarkGroups` (which it runs), for scripts/bench-reports.ts. */
export async function explainBenchmarkGroups(tx: Tx, range: BenchmarkRange): Promise<string[]> {
  await applySnapshotSettings(tx);
  const { rows } = await tx.execute<{ "QUERY PLAN": string }>(
    sql`explain (analyze, buffers) ${benchmarkGroupsStatement(range)}`,
  );
  return rows.map((row) => row["QUERY PLAN"]);
}

// Planner settings for the caller's transaction only: the snapshot's row estimates trip JIT compilation, which costs
// more than the query, and hash-aggregating the amount arrays needs more than the default work_mem.
async function applySnapshotSettings(tx: Tx): Promise<void> {
  await tx.execute(sql`set local jit = off`);
  await tx.execute(sql`set local work_mem = '256MB'`);
}

function benchmarkGroupsStatement(range: BenchmarkRange): SQL {
  return sql`
    create temporary table ${benchmarkGroups} on commit drop as
    with bounds as (
      select ${monthIndex(sql`${range.from}::date`)} - 12 as first_month,
             ${monthIndex(sql`${range.to}::date`)} as last_month,
             ${range.to}::date as last_snapshot
    ),
    months as (
      select month, make_date(month / 12, month % 12 + 1, 1) as month_start,
             least((make_date(month / 12, month % 12 + 1, 1) + interval '1 month - 1 day')::date, last_snapshot)
               as snapshot_date
      from bounds, generate_series(first_month, last_month) as month
    ),
    revisions as (
      select ${salaryHistory.employee_id} as employee_id, ${salaryHistory.revision} as revision,
             ${salaryHistory.work_country_code_at_change} as work_country_code,
             ${salaryHistory.department_id_at_change} as department_id,
             ${salaryHistory.currency_code} as salary_currency_code,
             (${salaryHistory.annual_base_pay} * 100)::bigint as cents,
             ${monthIndex(sql`(${salaryHistory.changed_at} at time zone 'UTC')::date`)} as first_month,
             ${matchesFilters({ ...range, department_id: undefined }, assignmentAtChange)} as matches
      from ${salaryHistory}
      where ${salaryHistory.changed_at} < (${range.to}::date + 1)::timestamp at time zone 'UTC'
    ),
    entries as (
      select revisions.*, lead(first_month) over (partition by employee_id order by revision) as next_entry_month
      from revisions
    ),
    snapshots as (
      -- Each entry's months, also clipped to the employee's employment months; isActiveOn decides membership.
      select months.month, e.work_country_code, e.department_id, e.salary_currency_code, e.cents
      from bounds
      cross join entries e
      inner join ${employees} on ${employees.id} = e.employee_id
      cross join lateral generate_series(
        greatest(e.first_month, ${monthIndex(employees.joining_date)}, bounds.first_month),
        least(e.next_entry_month - 1, ${monthIndex(employees.last_working_day)}, bounds.last_month)
      ) as entry_month
      inner join months on months.month = entry_month
      where e.matches
        and (e.next_entry_month is null or e.next_entry_month > bounds.first_month)
        and ${isActiveOn(sql`months.snapshot_date`)}
    ),
    groups as (
      select month, work_country_code, department_id, salary_currency_code,
             grouping(department_id) = 1 as whole_country,
             count(*) as size, sum(cents) as total_cents, ${sortedCents} as sorted
      from snapshots
      group by grouping sets (
        (month, work_country_code, department_id, salary_currency_code),
        (month, work_country_code, salary_currency_code)
      )
    ),
    stats as (
      select month, work_country_code, department_id, salary_currency_code, whole_country, size, total_cents,
             ${percentile(sql`sorted`, sql`size`, "0.1")} as p10,
             ${percentile(sql`sorted`, sql`size`, "0.5")} as median,
             ${percentile(sql`sorted`, sql`size`, "0.9")} as p90
      from groups
    ),
    group_stats as (select * from stats where not whole_country),
    country_medians as (select month, work_country_code, salary_currency_code, median from stats where whole_country)
    select to_char(months.month_start, 'YYYY-MM') as month,
           g.work_country_code, g.department_id, g.salary_currency_code,
           g.size::int as employee_count,
           round(g.total_cents / 100.0, 2) as total_annual_base_pay,
           round(g.p10, 2) as p10_annual_base_pay,
           round(g.median, 2) as median_annual_base_pay,
           round(g.p90, 2) as p90_annual_base_pay,
           round(c.median, 2) as country_median_annual_base_pay,
           round((g.median - c.median) * 100 / c.median, 2) as median_gap_percent,
           round((g.median - prior.median) * 100 / prior.median, 2) as median_yoy_percent
    from group_stats g
    inner join months on months.month = g.month
    inner join country_medians c
      on c.month = g.month and c.work_country_code = g.work_country_code
      and c.salary_currency_code = g.salary_currency_code
    left join group_stats prior
      on prior.month = g.month - 12
      and prior.work_country_code = g.work_country_code
      and prior.department_id = g.department_id
      and prior.salary_currency_code = g.salary_currency_code
    where g.month >= (select first_month + 12 from bounds)`;
}

/** One page of month/country/department/currency rows after (or before) `from`, in key order. */
export function selectBenchmarkRows(
  tx: Tx,
  range: BenchmarkRange,
  from: KeysetFrom<BenchmarkKey>,
  take: number,
): Promise<HistoricalSalaryBenchmarkRow[]> {
  return tx
    .select()
    .from(benchmarkGroups)
    .where(and(matchesFilters(range, groupColumns), pastKey(benchmarkKey, from)))
    .orderBy(keyOrder(benchmarkKey, from))
    .limit(take);
}

export async function countBenchmarkRows(tx: Tx, range: BenchmarkRange): Promise<number> {
  const [row] = await tx.select({ total: count() }).from(benchmarkGroups).where(matchesFilters(range, groupColumns));
  return row?.total ?? 0;
}

/**
 * The final snapshot (`to`) by country and currency, the pay-range trend over the visible months, and the only matching
 * group when all matching rows share one.
 */
export async function selectBenchmarkSummary(
  tx: Tx,
  range: BenchmarkRange,
): Promise<HistoricalSalaryBenchmarkSummary> {
  const g = benchmarkGroups;
  const matching = matchesFilters(range, groupColumns);
  const [byCountry, trend, groups] = await Promise.all([
    tx
      .select({
        work_country_code: g.work_country_code,
        salary_currency_code: g.salary_currency_code,
        employee_count: sql<number>`sum(${g.employee_count})::int`,
        total_annual_base_pay: sql<string>`sum(${g.total_annual_base_pay})::text`,
      })
      .from(g)
      .where(and(matching, sql`${g.month} = to_char(${range.to}::date, 'YYYY-MM')`))
      .groupBy(g.work_country_code, g.salary_currency_code)
      .orderBy(g.work_country_code, g.salary_currency_code),
    selectBenchmarkTrend(tx, range, matching),
    tx
      .selectDistinct({
        work_country_code: g.work_country_code,
        department_id: g.department_id,
        salary_currency_code: g.salary_currency_code,
      })
      .from(g)
      .where(matching)
      .limit(2),
  ]);
  const snapshot: SnapshotTotal[] = byCountry;
  const employee_count = snapshot.reduce((total, pair) => total + pair.employee_count, 0);
  const group = groups.length === 1 ? (groups[0] ?? null) : null;
  return { snapshot_date: range.to, employee_count, by_country: snapshot, group, trend };
}

/**
 * One point per visible month (none when nothing matches): headcount of every matching group, and the pay range of the
 * only matching group when all matching rows share one country, department and currency.
 */
async function selectBenchmarkTrend(tx: Tx, range: BenchmarkRange, matching: SQL): Promise<BenchmarkPoint[]> {
  const g = benchmarkGroups;
  const single = sql`(select count(distinct (${g.work_country_code}, ${g.department_id}, ${g.salary_currency_code}))
    from ${g} where ${matching}) = 1`;
  const onlyGroup = (amount: AnyColumn) => sql`case when ${single} then max(${amount})::text end`;
  const { rows } = await tx.execute<BenchmarkPoint>(sql`
    with months as (
      select to_char(start, 'YYYY-MM') as month
      from generate_series(${range.from}::timestamp, ${range.to}::timestamp, interval '1 month') as start
    )
    select months.month,
           coalesce(sum(${g.employee_count}), 0)::int as employee_count,
           ${onlyGroup(g.p10_annual_base_pay)} as p10_annual_base_pay,
           ${onlyGroup(g.median_annual_base_pay)} as median_annual_base_pay,
           ${onlyGroup(g.p90_annual_base_pay)} as p90_annual_base_pay,
           ${onlyGroup(g.country_median_annual_base_pay)} as country_median_annual_base_pay
    from months
    left join ${g} on ${g.month} = months.month and ${matching}
    where exists (select from ${g} where ${matching})
    group by months.month
    order by months.month`);
  return rows;
}
