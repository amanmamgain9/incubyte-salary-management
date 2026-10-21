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
  clearedFilters,
  type FilterParam,
  type FilterValues,
  type ReportFilterField,
} from "@/features/reports/search-params";
import { useUrlState } from "@/hooks/use-url-state";

type ReportParams = Partial<Record<FilterParam | "cursor", unknown>>;

/**
 * The report screen shell: title → filters → summary (overview, group totals, charts) → table with pagination. It
 * owns the URL state, the deferred query and the cursor wiring; each report only supplies its parts.
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
  queryOptions,
  summary,
  table,
}: {
  title: string;
  today: string;
  /** From the report's `search-params.ts` builder (memoized: `useUrlState` caches its parse per schema). */
  search: z.ZodType<I, ReportParams>;
  filters: readonly ReportFilterField[];
  /** e.g. `(input) => trpc.reports.salaryGrowth.queryOptions(input)` */
  queryOptions: (input: I) => UseSuspenseQueryOptions<O, E, O, K>;
  summary: (output: O, input: I) => ReactNode;
  table: (items: O["rows"]["items"], input: I) => ReactNode;
}) {
  const [params, patch] = useUrlState(search);
  // While the next page or filter result loads, keep showing (dimmed) results instead of the loading state.
  const input = useDeferredValue(params);
  const { data } = useSuspenseQuery(queryOptions(input));
  const reset = () => patch(clearedFilters);
  const applied: FilterValues = {
    from: params.from,
    to: params.to,
    work_country_code: params.work_country_code,
    department_id: params.department_id,
    salary_currency_code: params.salary_currency_code,
  };

  return (
    <>
      <PageHeader title={title} />
      <ReportFilters
        key={JSON.stringify(applied)}
        fields={filters}
        values={applied}
        today={today}
        onApply={patch}
        onReset={reset}
      />
      <DeferredContent stale={input !== params}>
        {summary(data, input)}
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
              {table(data.rows.items, input)}
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
