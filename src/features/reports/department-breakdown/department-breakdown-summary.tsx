"use client";

import { MiniBars } from "@/components/charts/mini-bars";
import { Amount } from "@/components/ui/amount";
import { Overview } from "@/components/ui/overview";
import { Stat } from "@/components/ui/stat";
import type { DepartmentBreakdownInput, DepartmentBreakdownSummary as Summary } from "@/contracts/reports/department-breakdown";
import { CountryTotals, GroupDetail, GroupTotal } from "@/features/reports/country-totals";
import { DepartmentBreakdownChart } from "@/features/reports/department-breakdown/department-breakdown-chart";
import { countryCount, departmentBars, singleGroup } from "@/features/reports/department-breakdown/department-breakdown-data";
import { reportScope } from "@/features/reports/report-scope";
import { useLookups } from "@/hooks/use-lookups";
import { formatCompact, formatCount, formatMoney } from "@/lib/format";

/**
 * Headcount with one group's total and average, or department and country counts with employees by department and
 * the country/currency totals; the department comparison when one country/currency matches.
 */
export function DepartmentBreakdownSummary({ summary, input }: { summary: Summary; input: DepartmentBreakdownInput }) {
  const lookups = useLookups();
  const single = singleGroup(summary.by_country);
  return (
    <>
      <Overview
        scope={reportScope(input, lookups)}
        visual={
          !single && summary.by_department.length > 0 ? (
            <MiniBars caption="Employees by department" bars={departmentBars(summary.by_department, lookups.departmentName)} />
          ) : undefined
        }
      >
        <Stat label="Employees" value={formatCount(summary.employee_count)} />
        {single ? (
          <>
            <Stat
              label={`Annual base pay · ${single.salary_currency_code}`}
              value={formatCompact(single.total_annual_base_pay)}
              detail={<Amount value={single.total_annual_base_pay} currency={single.salary_currency_code} />}
            />
            <Stat
              label={`Average · ${single.salary_currency_code}`}
              value={formatCompact(single.average_annual_base_pay)}
              detail={<Amount value={single.average_annual_base_pay} currency={single.salary_currency_code} />}
            />
          </>
        ) : (
          <>
            <Stat label="Departments" value={formatCount(summary.by_department.length)} />
            <Stat label="Countries" value={formatCount(countryCount(summary.by_country))} />
          </>
        )}
      </Overview>
      {!single && summary.by_country.length > 0 ? (
        <CountryTotals label="Totals by country and currency" groups={summary.by_country}>
          {(group) => (
            <>
              <GroupTotal>
                <Amount value={group.total_annual_base_pay} currency={group.salary_currency_code} />
              </GroupTotal>
              <GroupDetail>
                {formatCount(group.employee_count)} employees · Avg{" "}
                {formatMoney(group.average_annual_base_pay, group.salary_currency_code)}
              </GroupDetail>
            </>
          )}
        </CountryTotals>
      ) : null}
      {single ? <DepartmentBreakdownChart points={summary.by_department} currency={single.salary_currency_code} /> : null}
    </>
  );
}
