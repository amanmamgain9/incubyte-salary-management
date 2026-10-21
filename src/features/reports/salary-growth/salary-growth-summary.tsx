"use client";

import { Amount } from "@/components/ui/amount";
import { Overview } from "@/components/ui/overview";
import { Stat } from "@/components/ui/stat";
import type { SalaryGrowthInput, SalaryGrowthSummary as Summary } from "@/contracts/reports/salary-growth";
import { CountryTotals } from "@/features/reports/country-totals";
import { reportScope } from "@/features/reports/report-scope";
import { SalaryGrowthChart } from "@/features/reports/salary-growth/salary-growth-chart";
import { useLookups } from "@/hooks/use-lookups";
import { formatCompact, formatCount, formatDate } from "@/lib/format";

/** Period increases, decreases, net change and currency switches (per group when several), then the net trend. */
export function SalaryGrowthSummary({ summary, input }: { summary: Summary; input: SalaryGrowthInput }) {
  const lookups = useLookups();
  const single = summary.by_country.length === 1 ? summary.by_country[0] : undefined;
  const money = (label: string, amount: string, currency: string) => (
    <Stat
      label={`${label} · ${currency}`}
      value={formatCompact(amount)}
      detail={<Amount value={amount} currency={currency} />}
    />
  );
  return (
    <>
      <Overview scope={`${reportScope(input, lookups)} · ${formatDate(input.from)} – ${formatDate(input.to)}`}>
        {single ? (
          <>
            {money("Increases", single.increases, single.salary_currency_code)}
            {money("Decreases", single.decreases, single.salary_currency_code)}
            {money("Net change", single.net_change, single.salary_currency_code)}
          </>
        ) : (
          <Stat label="Country/currency groups" value={formatCount(summary.by_country.length)} />
        )}
        <Stat label="Currency switches" value={formatCount(summary.currency_switch_count)} />
      </Overview>
      {!single && summary.by_country.length > 0 ? (
        <CountryTotals label="Period totals by country and currency" groups={summary.by_country} wide>
          {(group) => (
            <dl className="mt-2.5 grid grid-cols-2 gap-x-5 gap-y-2.5">
              {[
                ["Increases", <Amount key="i" value={group.increases} currency={group.salary_currency_code} />],
                ["Decreases", <Amount key="d" value={group.decreases} currency={group.salary_currency_code} />],
                ["Net change", <Amount key="n" value={group.net_change} currency={group.salary_currency_code} />],
                ["Currency switches", formatCount(group.currency_switch_count)],
              ].map(([label, value]) => (
                <div key={String(label)}>
                  <dt className="text-label text-muted">{label}</dt>
                  <dd className="mt-1 text-body font-[550] tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          )}
        </CountryTotals>
      ) : null}
      <SalaryGrowthChart trend={summary.trend} />
    </>
  );
}
