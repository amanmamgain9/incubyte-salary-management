"use client";

import { useSuspenseQuery, type QueryKey, type UseSuspenseQueryOptions } from "@tanstack/react-query";
import { useDeferredValue, type ReactNode } from "react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DeferredContent } from "@/components/ui/deferred-content";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Pagination } from "@/components/ui/pagination";
import type { Page, Paging } from "@/contracts/paging";
import { ReportFilters } from "@/features/reports/report-filters";
import {
  appliedFilters,
  clearedFilters,
  type FilterParam,
  type FilterValues,
  type PeriodContract,
  type ReportFilterField,
} from "@/features/reports/search-params";
import { type LookupNames, useLookups } from "@/hooks/use-lookups";
import { useUrlState } from "@/hooks/use-url-state";

type ReportParams = Partial<Record<FilterParam | "cursor", unknown>>;

/**
 * The report screen shell: title → filters → summary (overview, group totals, charts) → table with pagination. It
 * owns the URL state, the deferred query, the cursor wiring and the lookups; each report only supplies its parts.
 */
export function ReportPage<
  I extends Paging & FilterValues,
  O extends { rows: Page<unknown>; summary: unknown },
  E,
  K extends QueryKey,
>({
  title,
  today,
  search,
  filters,
  period,
  queryOptions,
  summary,
  table,
}: {
  title: string;
  today: string;
  /** From the report's `search-params.ts` builder (memoized: `useUrlState` caches its parse per schema). */
  search: z.ZodType<I, ReportParams>;
  filters: readonly ReportFilterField[];
  /** With a `dates` or `months` filter: the report's input contract, whose rules check the period on Apply. */
  period?: PeriodContract;
  /** e.g. `(input) => trpc.reports.salaryGrowth.queryOptions(input)` */
  queryOptions: (input: I) => UseSuspenseQueryOptions<O, E, O, K>;
  /** `names` resolves lookup codes; fetched once here for every part of the report. */
  summary: (output: O, input: I, names: LookupNames) => ReactNode;
  table: (items: O["rows"]["items"], input: I, names: LookupNames) => ReactNode;
}) {
  const lookups = useLookups();
  const [params, patch] = useUrlState(search);
  // While the next page or filter result loads, keep showing (dimmed) results instead of the loading state.
  const input = useDeferredValue(params);
  const { data } = useSuspenseQuery(queryOptions(input));
  const reset = () => patch(clearedFilters);
  const applied = appliedFilters(params);

  return (
    <>
      <PageHeader title={title} />
      <ReportFilters
        key={JSON.stringify(applied)}
        fields={filters}
        period={period}
        values={applied}
        today={today}
        options={lookups}
        onApply={patch}
        onReset={reset}
      />
      <DeferredContent stale={input !== params}>
        {summary(data, input, lookups)}
        <Card label={`${title} results`}>
          {data.rows.items.length === 0 ? (
            <EmptyState
              title="No matching records"
              hint="Adjust or reset the filters."
              action={
                <Button variant="secondary" onClick={reset}>
                  Reset filters
                </Button>
              }
            />
          ) : (
            <>
              {table(data.rows.items, input, lookups)}
              <Pagination
                rangeStart={data.rows.range_start}
                itemCount={data.rows.items.length}
                total={data.rows.total_count}
                prevCursor={data.rows.prev_cursor}
                nextCursor={data.rows.next_cursor}
                onPage={(cursor) => patch({ cursor })}
              />
            </>
          )}
        </Card>
      </DeferredContent>
    </>
  );
}
