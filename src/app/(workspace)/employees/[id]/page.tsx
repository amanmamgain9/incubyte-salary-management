import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GetEmployeeInput } from "@/contracts/employees";
import { EmployeeProfile } from "@/features/employees/profile/employee-profile";
import { historyInput, profileSearch } from "@/features/employees/profile/search-params";
import { parseSearchParams } from "@/lib/search-params";
import { HydrateClient, prefetch, prefetchOrNotFound, trpc } from "@/trpc/server";

export const metadata: Metadata = { title: "Employee profile" };

export default async function EmployeeProfilePage(props: PageProps<"/employees/[id]">) {
  const params = GetEmployeeInput.safeParse(await props.params);
  if (!params.success) notFound();
  const { id } = params.data;
  const input = historyInput(id, parseSearchParams(profileSearch, await props.searchParams));
  await Promise.all([
    prefetchOrNotFound(trpc.employees.get.queryOptions({ id })),
    prefetch(trpc.salaries.history.queryOptions(input)),
    prefetch(trpc.lookups.get.queryOptions()),
  ]);
  return (
    <HydrateClient>
      <EmployeeProfile id={id} />
    </HydrateClient>
  );
}
