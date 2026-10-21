// `npm run db:verify [-- --seed <text>] [--as-of YYYY-MM-DD]`: regenerates the seeded dataset, builds its independent
// manifest (scripts/data-generation/manifest.ts) and compares the database with it, as owner. Exits non-zero on drift.
// `--as-of` defaults to the latest salary history date, which the seed records upcoming joiners' entries at.
// Checked today: status counts, history row count and current-pay consistency, and the commitment and department
// numbers via direct SQL. Growth and benchmark rows join once their report queries exist.
import { isDeepStrictEqual } from "node:util";
import { and, eq, exists, gt, isNull, max, ne, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { ownerDb } from "@/server/db/owner";
import { employees, salaryHistory } from "@/server/db/schema";
import { employmentStatusOn, isActiveOn } from "@/server/employees/status";
import { generateDataset } from "@scripts/data-generation/generate";
import { buildManifest, type Manifest } from "@scripts/data-generation/manifest";
import { DEMO_HR_ID, parseDatasetOptions } from "./seed";

async function latestHistoryDate(): Promise<string | undefined> {
  const [row] = await ownerDb
    .select({ date: sql<string | null>`(${max(salaryHistory.changed_at)} at time zone 'UTC')::date::text` })
    .from(salaryHistory);
  return row?.date ?? undefined;
}

async function statusCounts(asOf: string): Promise<Manifest["status"]> {
  const status = employmentStatusOn(asOf);
  const countOf = (name: string) => sql<number>`(count(*) filter (where ${status} = ${name}))::int`;
  const [row] = await ownerDb
    .select({
      employee_count: sql<number>`count(*)::int`,
      active_count: countOf("active"),
      upcoming_count: countOf("upcoming"),
      departed_count: countOf("departed"),
    })
    .from(employees);
  return row ?? { employee_count: 0, active_count: 0, upcoming_count: 0, departed_count: 0 };
}

const totals = {
  employee_count: sql<number>`count(*)::int`,
  total_annual_base_pay: sql<string>`sum(${employees.annual_base_pay})::text`,
};

function commitmentRows(asOf: string): Promise<Manifest["commitment"]> {
  return ownerDb
    .select({
      work_country_code: employees.work_country_code,
      salary_currency_code: employees.salary_currency_code,
      ...totals,
    })
    .from(employees)
    .where(isActiveOn(asOf))
    .groupBy(employees.work_country_code, employees.salary_currency_code)
    .orderBy(employees.work_country_code, employees.salary_currency_code);
}

function departmentRows(asOf: string): Promise<Manifest["departments"]> {
  const keys = [employees.work_country_code, employees.department_id, employees.salary_currency_code] as const;
  return ownerDb
    .select({
      work_country_code: employees.work_country_code,
      department_id: employees.department_id,
      salary_currency_code: employees.salary_currency_code,
      ...totals,
      average_annual_base_pay: sql<string>`round(avg(${employees.annual_base_pay}), 2)::text`,
    })
    .from(employees)
    .where(isActiveOn(asOf))
    .groupBy(...keys)
    .orderBy(...keys);
}

/** History rows, and employees whose salary_revision, pay or currency differ from their latest history entry. */
async function historyConsistency(): Promise<{ history_count: number; mismatched_employees: number }> {
  const later = alias(salaryHistory, "later");
  const [history] = await ownerDb.select({ count: sql<number>`count(*)::int` }).from(salaryHistory);
  const [mismatched] = await ownerDb
    .select({ count: sql<number>`count(*)::int` })
    .from(employees)
    .leftJoin(
      salaryHistory,
      and(eq(salaryHistory.employee_id, employees.id), eq(salaryHistory.revision, employees.salary_revision)),
    )
    .where(
      or(
        isNull(salaryHistory.id),
        ne(salaryHistory.annual_base_pay, employees.annual_base_pay),
        ne(salaryHistory.currency_code, employees.salary_currency_code),
        exists(
          ownerDb
            .select({ id: later.id })
            .from(later)
            .where(and(eq(later.employee_id, employees.id), gt(later.revision, employees.salary_revision))),
        ),
      ),
    );
  return { history_count: history?.count ?? 0, mismatched_employees: mismatched?.count ?? 0 };
}

if (import.meta.main) {
  try {
    const options = parseDatasetOptions(process.argv.slice(2));
    const as_of = options.as_of ?? (await latestHistoryDate());
    if (as_of === undefined) throw new Error("No salary history to verify; run `npm run db:seed` first.");
    const started = performance.now();
    const dataset = generateDataset({ seed: options.seed, as_of, changed_by: DEMO_HR_ID });
    const manifest = buildManifest(dataset);
    const built = performance.now();

    const checks: [string, unknown, unknown][] = [
      ["status counts", manifest.status, await statusCounts(as_of)],
      ["history", { history_count: dataset.history.length, mismatched_employees: 0 }, await historyConsistency()],
      ["salary commitment rows", manifest.commitment, await commitmentRows(as_of)],
      ["department breakdown rows", manifest.departments, await departmentRows(as_of)],
    ];
    let failures = 0;
    for (const [name, expected, actual] of checks) {
      if (isDeepStrictEqual(expected, actual)) {
        console.log(`ok    ${name}`);
        continue;
      }
      failures++;
      console.error(`FAIL  ${name}\n  expected ${JSON.stringify(expected)}\n  actual   ${JSON.stringify(actual)}`);
    }
    const seconds = (from: number, to: number) => ((to - from) / 1000).toFixed(1);
    console.log(
      `Verified seed "${options.seed}", as_of ${as_of} in ${seconds(started, performance.now())}s ` +
        `(manifest ${seconds(started, built)}s): ${checks.length - failures}/${checks.length} checks passed.`,
    );
    if (failures > 0) process.exitCode = 1;
  } finally {
    await ownerDb.$client.end();
  }
}
