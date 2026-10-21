import type { ReactNode } from "react";
import { Caption } from "@/components/ui/caption";
import type { LookupNames } from "@/hooks/use-lookups";
import { cn } from "@/lib/cn";

type Group = { work_country_code: string; salary_currency_code: string };

/**
 * One strip of country/currency summary groups (a local horizontal scroller), each titled "Country · CUR"; `wide`
 * cells hold several measures. Every figure comes from the report summary; currencies stay apart.
 */
export function CountryTotals<G extends Group>({
  label,
  groups,
  names,
  wide = false,
  children,
}: {
  label: string;
  groups: readonly G[];
  names: LookupNames;
  wide?: boolean;
  children: (group: G) => ReactNode;
}) {
  return (
    <section aria-label={label} className="mb-4 flex overflow-x-auto rounded-surface border border-line bg-surface">
      {groups.map((group) => (
        <div
          key={`${group.work_country_code}-${group.salary_currency_code}`}
          className={cn("flex-none border-r border-line px-4 py-3 last:border-r-0", wide ? "min-w-77.5" : "min-w-61.25")}
        >
          <Caption>
            {names.countryName(group.work_country_code)} · {group.salary_currency_code}
          </Caption>
          {children(group)}
        </div>
      ))}
    </section>
  );
}

/** A group's headline amount. */
export function GroupTotal({ children }: { children: ReactNode }) {
  return <strong className="my-1.25 block text-heading tabular-nums">{children}</strong>;
}
