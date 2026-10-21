import type { BarDatum } from "@/components/charts/bar-chart";
import type { GrowthPoint } from "@/contracts/reports/salary-growth";
import { formatMoney, formatMonth } from "@/lib/format";
import { toChartNumber } from "@/lib/money";

export type TrendGroup = { work_country_code: string; salary_currency_code: string; bars: BarDatum[] };

/**
 * The net change trend split into one bar series per country/currency (API order: country, currency, month), so no
 * chart mixes currencies. Increases and decreases get their own tones.
 */
export function trendGroups(trend: readonly GrowthPoint[]): TrendGroup[] {
  const groups: TrendGroup[] = [];
  for (const point of trend) {
    let group = groups.at(-1);
    if (
      !group ||
      group.work_country_code !== point.work_country_code ||
      group.salary_currency_code !== point.salary_currency_code
    ) {
      group = { work_country_code: point.work_country_code, salary_currency_code: point.salary_currency_code, bars: [] };
      groups.push(group);
    }
    group.bars.push({
      label: formatMonth(point.month, "short"),
      value: toChartNumber(point.net_change),
      display: `${formatMonth(point.month)}: ${formatMoney(point.net_change, point.salary_currency_code)}`,
      tone: point.net_change.startsWith("-") ? "decrease" : "increase",
    });
  }
  return groups;
}
