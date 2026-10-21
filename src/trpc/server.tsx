import "server-only";
import {
  dehydrate,
  HydrationBoundary,
  type FetchQueryOptions,
  type QueryKey,
} from "@tanstack/react-query";
import { TRPCError } from "@trpc/server";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import { createContext } from "@/server/api/context";
import { appRouter } from "@/server/api/root";
import { makeQueryClient } from "@/trpc/query-client";

/** One QueryClient per server request, shared by every prefetch and `<HydrateClient>` in that render. */
export const getQueryClient = cache(makeQueryClient);

/** Server-side options proxy: calls procedures in-process with this request's cookies (no HTTP round trip). */
export const trpc = createTRPCOptionsProxy({
  router: appRouter,
  ctx: async () => createContext({ headers: await headers() }),
  queryClient: getQueryClient,
});

/**
 * Fetches a query into this request's cache so `<HydrateClient>` ships it to the browser. Never throws: a failed
 * prefetch is not dehydrated, and the client query then refetches and reaches the route's error boundary.
 */
export function prefetch<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): Promise<void> {
  return getQueryClient().prefetchQuery(options);
}

/**
 * `prefetch` for the record a page is about: NOT_FOUND renders the route's 404 (`notFound()`) instead of the page.
 * Any other failure behaves like `prefetch` (not dehydrated; the client query refetches and reaches the error boundary).
 */
export async function prefetchOrNotFound<TQueryFnData, TError, TData, TQueryKey extends QueryKey>(
  options: FetchQueryOptions<TQueryFnData, TError, TData, TQueryKey>,
): Promise<void> {
  try {
    await getQueryClient().fetchQuery(options);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") notFound();
  }
}

/** Hydrates the client cache with everything this request prefetched. */
export function HydrateClient({ children }: Readonly<{ children: ReactNode }>) {
  return <HydrationBoundary state={dehydrate(getQueryClient())}>{children}</HydrationBoundary>;
}
