import type { Metadata } from "next";
import { EmployeeDirectory } from "@/features/employees/directory/employee-directory";
import { directorySearch } from "@/features/employees/directory/search-params";
import { parseSearchParams } from "@/lib/search-params";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Employees" };

export default async function EmployeesPage(props: PageProps<"/employees">) {
  const input = parseSearchParams(directorySearch, await props.searchParams);
  await Promise.all([prefetch(trpc.employees.list.queryOptions(input)), prefetch(trpc.lookups.get.queryOptions())]);
  return (
    <HydrateClient>
      <EmployeeDirectory />
    </HydrateClient>
  );
}
