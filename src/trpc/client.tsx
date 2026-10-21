"use client";

import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCContext } from "@trpc/tanstack-react-query";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { AppRouter } from "@/server/api/root";
import { makeQueryClient } from "@/trpc/query-client";

const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

export { useTRPC };

let browserQueryClient: QueryClient | undefined;

// SSR renders get a fresh client per request; the browser keeps one for the whole session.
function getQueryClient(onUnauthorized: () => void): QueryClient {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient({ onUnauthorized });
  return browserQueryClient;
}

/**
 * Same-origin tRPC client. Queries run in the browser only: every page prefetches what it renders on the server
 * (`trpc/server.tsx`), so SSR reads the hydrated cache instead of calling the relative `/api/trpc` URL.
 */
export function TRPCReactProvider({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  // Re-rendering the route re-reads the session on the server, whose layout then redirects to /login.
  const queryClient = getQueryClient(() => router.refresh());
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({ links: [httpBatchLink({ url: "/api/trpc" })] }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
