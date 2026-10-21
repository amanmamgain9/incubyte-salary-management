// `npm run bench [-- --runs <n>] [--explain]`: times each report request on the seeded database as the app role.
// A request is what the report's operation runs: the first page (limit 50) and its count together, then the summary;
// the benchmark first builds its snapshot table in the request's transaction. Prints p50/p95/max over the runs after
// warmups; `--explain` adds EXPLAIN (ANALYZE, BUFFERS) of the benchmark's snapshot build (24 months).
import { parseArgs } from "node:util";
import { DEFAULT_LIMIT } from "@/contracts/paging";
import type { ReportFilters } from "@/contracts/reports/filters";
import { addMonths, monthStart, todayUtc } from "@/lib/dates";
import { createDb } from "@/server/db/connect";
import { getEnv } from "@/server/env";
import {
  countDepartmentRows,
  selectDepartmentRows,
  selectDepartmentSummary,
} from "@/server/reports/department-breakdown/queries";
import {
  type BenchmarkRange,
  countBenchmarkRows,
  createBenchmarkGroups,
  explainBenchmarkGroups,
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

const WARMUPS = 3;
const take = DEFAULT_LIMIT + 1;

type Request = { name: string; run: (db: ReturnType<typeof createDb>) => Promise<unknown> };

function commitment(filters: ReportFilters, today: string): Request {
  return {
    name: `salaryCommitment ${JSON.stringify(filters)}`,
    run: async (db) => {
      await Promise.all([selectCommitmentRows(db, filters, today, null, take), countCommitmentRows(db, filters, today)]);
      return selectCommitmentSummary(db, filters, today);
    },
  };
}

function departments(filters: ReportFilters, today: string): Request {
  return {
    name: `departmentBreakdown ${JSON.stringify(filters)}`,
    run: async (db) => {
      await Promise.all([selectDepartmentRows(db, filters, today, null, take), countDepartmentRows(db, filters, today)]);
      return selectDepartmentSummary(db, filters, today);
    },
  };
}

function growth(period: GrowthPeriod): Request {
  return {
    name: `salaryGrowth ${JSON.stringify(period)}`,
    run: async (db) => {
      await Promise.all([selectGrowthRows(db, period, null, take), countGrowthRows(db, period)]);
      return selectGrowthSummary(db, period);
    },
  };
}

function benchmark(range: BenchmarkRange): Request {
  return {
    name: `historicalSalaryBenchmark ${JSON.stringify(range)}`,
    run: (db) =>
      db.transaction(async (tx) => {
        await createBenchmarkGroups(tx, range);
        await selectBenchmarkRows(tx, range, null, take);
        await countBenchmarkRows(tx, range);
        return selectBenchmarkSummary(tx, range);
      }),
  };
}

/** The `fraction` percentile (nearest rank) of ascending timings. */
const percentileOf = (sorted: number[], fraction: number) => sorted[Math.ceil(fraction * sorted.length) - 1] ?? NaN;

if (import.meta.main) {
  const { values } = parseArgs({ options: { runs: { type: "string", default: "20" }, explain: { type: "boolean" } } });
  const runs = Number(values.runs);
  const today = todayUtc(new Date());
  const monthsBack = (months: number) => monthStart(addMonths(today, -(months - 1)));
  const requests: Request[] = [
    commitment({}, today),
    commitment({ work_country_code: "IN", department_id: "engineering" }, today),
    departments({}, today),
    departments({ salary_currency_code: "EUR" }, today),
    growth({ from: monthsBack(12), to: today }),
    growth({ from: monthsBack(24), to: today }),
    growth({ from: monthsBack(24), to: today, work_country_code: "IN", department_id: "engineering" }),
    growth({ from: monthsBack(180), to: today }),
    benchmark({ from: monthsBack(24), to: today }),
    benchmark({ from: monthsBack(24), to: today, department_id: "finance" }),
    benchmark({ from: monthsBack(24), to: today, work_country_code: "IN", salary_currency_code: "USD" }),
    benchmark({ from: monthsBack(180), to: today }),
  ];
  const db = createDb(getEnv().DATABASE_URL);
  try {
    console.log(`${"request".padEnd(110)}   p50 ms   p95 ms   max ms  (${WARMUPS} warmups, ${runs} runs)`);
    for (const request of requests) {
      for (let i = 0; i < WARMUPS; i++) await request.run(db);
      const timings: number[] = [];
      for (let i = 0; i < runs; i++) {
        const started = performance.now();
        await request.run(db);
        timings.push(performance.now() - started);
      }
      timings.sort((a, b) => a - b);
      const ms = (value: number) => value.toFixed(1).padStart(8);
      const [p50, p95, max] = [percentileOf(timings, 0.5), percentileOf(timings, 0.95), timings.at(-1) ?? NaN];
      console.log(`${request.name.padEnd(110)} ${ms(p50)} ${ms(p95)} ${ms(max)}`);
    }
    if (values.explain) {
      const range = { from: monthsBack(24), to: today };
      const plan = await db.transaction((tx) => explainBenchmarkGroups(tx, range));
      console.log(`\nEXPLAIN (ANALYZE, BUFFERS) benchmark snapshot build ${JSON.stringify(range)}\n${plan.join("\n")}`);
    }
  } finally {
    await db.$client.end();
  }
}
