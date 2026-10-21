"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { SelectOption } from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";

/** Display names for lookup codes (an unknown code shows as itself); what display components take as `names`. */
export type LookupNames = {
  countryName: (code: string) => string;
  departmentName: (id: string) => string;
};

/** Select options for the lookup fields; what forms and filters take as `options`. */
export type LookupOptions = {
  countryOptions: readonly SelectOption[];
  departmentOptions: readonly SelectOption[];
  currencyOptions: readonly SelectOption[];
};

/**
 * `lookups.get` (prefetched by every page that renders it) as names and select options, built once per screen. Only
 * screens call it (the directory, the profile, the report shell); their parts receive `names` or `options` as props.
 */
export function useLookups(): LookupNames & LookupOptions {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.lookups.get.queryOptions());
  return useMemo(() => {
    const countries = new Map(data.countries.map((country) => [country.code, country.name]));
    const departments = new Map(data.departments.map((department) => [department.id, department.name]));
    return {
      countryName: (code: string) => countries.get(code) ?? code,
      departmentName: (id: string) => departments.get(id) ?? id,
      countryOptions: data.countries.map(({ code, name }): SelectOption => ({ value: code, label: name })),
      departmentOptions: data.departments.map(({ id, name }): SelectOption => ({ value: id, label: name })),
      currencyOptions: data.currencies.map(({ code, name }): SelectOption => ({ value: code, label: `${code} · ${name}` })),
    };
  }, [data]);
}
