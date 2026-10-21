"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { SelectOption } from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";

/** `lookups.get` (prefetched by every page that renders it) with name lookups and select options. */
export function useLookups() {
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
