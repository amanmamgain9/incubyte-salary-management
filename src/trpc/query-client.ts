// The only QueryClient factory: the browser provider, SSR and server prefetches all build theirs here.
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";

const MAX_RETRIES = 2;

/** HTTP status of a tRPC client error; undefined for network failures and anything that is not a tRPC client error. */
function httpStatus(error: unknown): number | undefined {
  return error instanceof TRPCClientError ? error.data?.httpStatus : undefined;
}

/** True when a procedure rejected the request for a missing, expired or revoked session. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof TRPCClientError && error.data?.code === "UNAUTHORIZED";
}

/**
 * Retry only what may succeed on a second try: network failures and 5xx responses, at most twice.
 * Client errors (bad input, no session, not found, conflict) and server-side caller errors never retry.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  if (!(error instanceof TRPCClientError) || failureCount >= MAX_RETRIES) return false;
  const status = httpStatus(error);
  return status === undefined || status >= 500;
}

/**
 * UNAUTHORIZED from any query or mutation clears the cache and calls `onUnauthorized`: the browser provider refreshes
 * the route, so the server sees the missing session and redirects to `/login`. Server clients omit it (in-process
 * calls never raise client errors). Pages and components never check for UNAUTHORIZED themselves.
 */
export function makeQueryClient(options: { onUnauthorized?: () => void } = {}): QueryClient {
  const onUnauthorized = options.onUnauthorized ?? (() => {});
  const onError = (error: unknown) => {
    if (!isUnauthorized(error)) return;
    queryClient.clear();
    onUnauthorized();
  };
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError }),
    mutationCache: new MutationCache({ onError }),
    defaultOptions: {
      // Server-prefetched data stays fresh through hydration instead of refetching on mount.
      queries: { staleTime: 30_000, retry: shouldRetry },
      mutations: { retry: false },
    },
  });
  return queryClient;
}
