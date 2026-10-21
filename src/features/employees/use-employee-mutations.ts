"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";

/**
 * employees.create/update. Both refresh every employees query (directory pages and profiles) before resolving,
 * so the page behind a closing dialog already shows the saved record.
 */
export function useEmployeeMutations() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const invalidate = () =>
    Promise.all([trpc.employees.pathKey()].map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  return {
    create: useMutation(trpc.employees.create.mutationOptions({ onSuccess: invalidate })),
    update: useMutation(trpc.employees.update.mutationOptions({ onSuccess: invalidate })),
  };
}
