"use client";

import { BarChart } from "@/components/charts/bar-chart";
import { Caption } from "@/components/ui/caption";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import type { GrowthPoint } from "@/contracts/reports/salary-growth";
import { trendGroups } from "@/features/reports/salary-growth/salary-growth-data";
import { useLookups } from "@/hooks/use-lookups";
import { cn } from "@/lib/cn";

/** Monthly net change over the period's last 12 months, one chart per country/currency (never combined). */
export function SalaryGrowthChart({ trend }: { trend: readonly GrowthPoint[] }) {
  const { countryName } = useLookups();
  const groups = trendGroups(trend);
  if (groups.length === 0) return null;
  return (
    <Card label="Net change trend">
      <CardHeader title="Net change trend" aside={<Caption>Latest 12 months</Caption>} />
      <CardBody>
        <div className={cn("grid gap-x-8 gap-y-5", groups.length > 1 && "xl:grid-cols-2")}>
          {groups.map((group) => {
            const title = `${countryName(group.work_country_code)} · ${group.salary_currency_code}`;
            return (
              <section key={title} aria-label={title}>
                <h3 className="mb-2 text-heading">{title}</h3>
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
