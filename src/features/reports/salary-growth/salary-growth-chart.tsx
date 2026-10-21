"use client";

import { BarChart } from "@/components/charts/bar-chart";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { GrowthPoint } from "@/contracts/reports/salary-growth";
import { trendGroups } from "@/features/reports/salary-growth/salary-growth-data";
import { useLookups } from "@/hooks/use-lookups";

/** Monthly net change over the period's last 12 months, one chart per country/currency (never combined). */
export function SalaryGrowthChart({ trend }: { trend: readonly GrowthPoint[] }) {
  const { countryName } = useLookups();
  const groups = trendGroups(trend);
  if (groups.length === 0) return null;
  return (
    <Card label="Net change trend">
      <CardHeader title="Net change trend" aside={<span className="text-label text-muted">Latest 12 months</span>} />
      <CardBody>
        <div className="grid gap-x-8 gap-y-5 xl:grid-cols-2">
          {groups.map((group) => {
            const title = `${countryName(group.work_country_code)} · ${group.salary_currency_code}`;
            return (
              <section key={title} aria-label={title}>
                <h3 className="mb-2 text-label font-medium text-ink-secondary">{title}</h3>
                <BarChart
                  orientation="vertical"
                  height={170}
                  data={group.bars}
                  label={`Monthly net annual base pay change in ${title}`}
                />
              </section>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
