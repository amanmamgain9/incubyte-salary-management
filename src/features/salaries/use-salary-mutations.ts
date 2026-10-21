"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/** salaries.update. Refreshes employees (current pay, revision), salary history and every report before resolving. */
export function useSalaryMutations() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all(
      [trpc.employees.pathKey(), trpc.salaries.pathKey(), trpc.reports.pathKey()].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  return { update: useMutation(trpc.salaries.update.mutationOptions({ onSuccess: invalidate })) };
}
