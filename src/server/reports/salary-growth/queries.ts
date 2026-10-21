import { type SQL, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { KeysetFrom } from "@/contracts/paging";
import { GROWTH_TREND_MONTHS } from "@/contracts/primitives";
import type { GrowthPoint, GrowthTotal, SalaryGrowthInput, SalaryGrowthRow } from "@/contracts/reports/salary-growth";
import type { Executor } from "@/server/db/connect";
import { salaryHistory } from "@/server/db/schema";
import { assignmentAtChange, matchesFilters } from "@/server/reports/filters";
import { keyOrder, pastKey } from "@/server/reports/keyset";

// Each revision after the initial salary, compared with the employee's preceding entry (revision - 1, wherever it
// falls), grouped by its UTC month and the country and currency saved with it. A currency switch is counted under the
// new currency and contributes no amount.

export type GrowthPeriod = Pick<SalaryGrowthInput, "from" | "to" | "work_country_code" | "department_id">;
export type GrowthKey = readonly [month: string, work_country_code: string, salary_currency_code: string];

const previous = alias(salaryHistory, "previous");
const month = sql`to_char(${salaryHistory.changed_at} at time zone 'UTC', 'YYYY-MM')`;
const country = salaryHistory.work_country_code_at_change;
const currency = salaryHistory.currency_code;
const growthKey = [month, country, currency] as const;

const sameCurrency = sql`${previous.currency_code} = ${salaryHistory.currency_code}`;
/** The pay change against the preceding entry; null for a currency switch. */
const change = sql`case when ${sameCurrency} then ${salaryHistory.annual_base_pay} - ${previous.annual_base_pay} end`;

const growthTotals = sql`
  round(coalesce(sum(${change}) filter (where ${change} > 0), 0), 2)::text as increases,
  round(coalesce(-sum(${change}) filter (where ${change} < 0), 0), 2)::text as decreases,
  round(coalesce(sum(${change}), 0), 2)::text as net_change,
  (count(*) filter (where not ${sameCurrency}))::int as currency_switch_count`;

/** FROM … WHERE: non-initial revisions whose UTC date is in the period, filtered by their at-change assignment. */
function revisionsIn(period: GrowthPeriod): SQL {
  return sql`${salaryHistory}
    inner join ${salaryHistory} as ${previous}
      on ${previous.employee_id} = ${salaryHistory.employee_id} and ${previous.revision} = ${salaryHistory.revision} - 1
    where ${salaryHistory.changed_at} >= (${period.from}::date)::timestamp at time zone 'UTC'
      and ${salaryHistory.changed_at} < (${period.to}::date + 1)::timestamp at time zone 'UTC'
      and ${matchesFilters(period, assignmentAtChange)}`;
}

/** One page of month/country/currency rows after (or before) `from`, in key order (reversed when `from.before`). */
export async function selectGrowthRows(
  db: Executor,
  period: GrowthPeriod,
  from: KeysetFrom<GrowthKey>,
  take: number,
): Promise<SalaryGrowthRow[]> {
  const { rows } = await db.execute<SalaryGrowthRow>(sql`
    select ${month} as month, ${country} as work_country_code, ${currency} as salary_currency_code, ${growthTotals}
    from ${revisionsIn(period)} and ${pastKey(growthKey, from)}
    group by ${month}, ${country}, ${currency}
    order by ${keyOrder(growthKey, from)}
    limit ${take}`);
  return rows;
}

export async function countGrowthRows(db: Executor, period: GrowthPeriod): Promise<number> {
  const { rows } = await db.execute<{ total: number }>(sql`
    select count(distinct (${month}, ${country}, ${currency}))::int as total from ${revisionsIn(period)}`);
  return rows[0]?.total ?? 0;
}

/** Period totals by country and currency, all currency switches, and the net change trend. */
export async function selectGrowthSummary(
  db: Executor,
  period: GrowthPeriod,
): Promise<{ by_country: GrowthTotal[]; currency_switch_count: number; trend: GrowthPoint[] }> {
  const [byCountry, trend] = await Promise.all([
    db.execute<GrowthTotal>(sql`
      select ${country} as work_country_code, ${currency} as salary_currency_code, ${growthTotals}
      from ${revisionsIn(period)}
      group by ${country}, ${currency}
      order by ${country}, ${currency}`),
    selectGrowthTrend(db, period),
  ]);
  const currency_switch_count = byCountry.rows.reduce((total, group) => total + group.currency_switch_count, 0);
  return { by_country: byCountry.rows, currency_switch_count, trend };
}

/**
 * Monthly net change over the period's last 12 months (fewer when the period is shorter), for every country/currency
 * group with revisions in the period; zero in months without. Country, currency, month ascending.
 */
async function selectGrowthTrend(db: Executor, period: GrowthPeriod): Promise<GrowthPoint[]> {
  const lastMonth = sql`date_trunc('month', ${period.to}::date)`;
  const { rows } = await db.execute<GrowthPoint>(sql`
    with monthly as (
      select ${month} as month, ${country} as work_country_code, ${currency} as salary_currency_code,
             sum(${change}) as net_change
      from ${revisionsIn(period)}
      group by ${month}, ${country}, ${currency}
    ),
    pairs as (select distinct work_country_code, salary_currency_code from monthly),
    months as (
      select to_char(start, 'YYYY-MM') as month
      from generate_series(
        greatest(date_trunc('month', ${period.from}::date), ${lastMonth} - make_interval(months => ${GROWTH_TREND_MONTHS - 1})),
        ${lastMonth},
        interval '1 month'
      ) as start
    )
    select months.month, pairs.work_country_code, pairs.salary_currency_code,
           round(coalesce(monthly.net_change, 0), 2)::text as net_change
    from pairs
    cross join months
    left join monthly using (month, work_country_code, salary_currency_code)
    order by pairs.work_country_code, pairs.salary_currency_code, months.month`);
  return rows;
}
