"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import type { DirectorySearch } from "@/features/employees/directory/search-params";
import { employmentStatuses } from "@/features/employees/employment-status-badge";
import { useLookups } from "@/hooks/use-lookups";

type FilterPatch = Partial<Record<"search" | "department_id" | "work_country_code" | "employment_status", string>>;

const SEARCH_DELAY_MS = 300;
// Country and department share a row on small screens; status then takes a full row.
const halfRowFilter = "flex-[1_1_40%] sm:flex-[0_1_145px]";
const statusOptions = employmentStatuses.map(({ status, label }) => ({ value: status, label }));

/** Search (applied after a short pause in typing) and the country, department and status filters. */
export function DirectoryFilters({ search, onChange }: { search: DirectorySearch; onChange: (patch: FilterPatch) => void }) {
  const lookups = useLookups();
  const applied = search.search ?? "";
  const [text, setText] = useState(applied);
  const [lastApplied, setLastApplied] = useState(applied);
  // The URL changed elsewhere (e.g. "Clear filters"): show what is applied now.
  if (applied !== lastApplied) {
    setLastApplied(applied);
    if (text.trim() !== applied) setText(applied);
  }

  useEffect(() => {
    if (text.trim() === applied) return;
    const timer = setTimeout(() => onChange({ search: text.trim() }), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [text, applied, onChange]);

  return (
    <form role="search" onSubmit={(event) => event.preventDefault()} className="mb-4.5 flex flex-wrap items-center gap-2">
      <div className="min-w-45 flex-1 basis-full sm:basis-0">
        <Input
          type="search"
          name="search"
          aria-label="Search employees by name or ID"
          placeholder="Search name or employee ID…"
          maxLength={100}
          value={text}
          onChange={(event) => setText(event.target.value)}
          leading={<Icon name="search" size={16} />}
        />
      </div>
      <div className={halfRowFilter}>
        <Select
          name="work_country_code"
          aria-label="Work country"
          emptyLabel="All countries"
          options={lookups.countryOptions}
          value={search.work_country_code ?? ""}
          onChange={(event) => onChange({ work_country_code: event.target.value })}
        />
      </div>
      <div className={halfRowFilter}>
        <Select
          name="department_id"
          aria-label="Department"
          emptyLabel="All departments"
          options={lookups.departmentOptions}
          value={search.department_id ?? ""}
          onChange={(event) => onChange({ department_id: event.target.value })}
        />
      </div>
      <div className="flex-[1_1_100%] sm:flex-[0_1_145px]">
        <Select
          name="employment_status"
          aria-label="Employment status"
          emptyLabel="All statuses"
          options={statusOptions}
          value={search.employment_status ?? ""}
          onChange={(event) => onChange({ employment_status: event.target.value })}
        />
      </div>
    </form>
  );
}
