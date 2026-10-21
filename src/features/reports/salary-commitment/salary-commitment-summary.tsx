"use client";

import { MiniBars } from "@/components/charts/mini-bars";
import { Amount } from "@/components/ui/amount";
import { Overview } from "@/components/ui/overview";
import { Stat } from "@/components/ui/stat";
import type { SalaryCommitmentInput, SalaryCommitmentOutput } from "@/contracts/reports/salary-commitment";
import { reportScope } from "@/features/reports/report-scope";
import { countryBars, singleCommitment } from "@/features/reports/salary-commitment/salary-commitment-data";
import { useLookups } from "@/hooks/use-lookups";
import { formatCompact, formatCount, formatDate } from "@/lib/format";

/** Active headcount, then one group's commitment or the country and currency counts; employees by country. */
export function SalaryCommitmentSummary({
  output,
  input,
  today,
}: {
  output: SalaryCommitmentOutput;
  input: SalaryCommitmentInput;
  today: string;
}) {
  const lookups = useLookups();
  const { summary } = output;
  const single = singleCommitment(output.rows);
  return (
    <Overview
      scope={`${reportScope(input, lookups)} · ${formatDate(today)}`}
      visual={
        summary.by_country.length > 0 ? (
          <MiniBars caption="Employees by country" bars={countryBars(summary.by_country, lookups.countryName)} />
        ) : undefined
      }
    >
      <Stat label="Active employees" value={formatCount(summary.employee_count)} />
      {single ? (
        <Stat
          label={`Annual base pay · ${single.salary_currency_code}`}
          value={formatCompact(single.total_annual_base_pay)}
          detail={<Amount value={single.total_annual_base_pay} currency={single.salary_currency_code} />}
        />
      ) : (
        <>
          <Stat label="Countries" value={formatCount(summary.by_country.length)} />
          <Stat label="Currencies" value={formatCount(summary.currency_count)} />
        </>
      )}
    </Overview>
  );
}
