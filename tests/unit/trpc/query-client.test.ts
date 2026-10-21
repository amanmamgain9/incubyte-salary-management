import { TRPCClientError } from "@trpc/client";
import { describe, expect, it, vi } from "vitest";
import { isUnauthorized, makeQueryClient, shouldRetry } from "@/trpc/query-client";

function procedureError(code: string, httpStatus: number) {
  return TRPCClientError.from({ error: { code: -32000, message: code, data: { code, httpStatus } } });
}

const networkError = TRPCClientError.from(new TypeError("Failed to fetch"));

describe("isUnauthorized", () => {
  it("recognises an UNAUTHORIZED procedure error", () => {
    expect(isUnauthorized(procedureError("UNAUTHORIZED", 401))).toBe(true);
  });

  it.each([procedureError("FORBIDDEN", 403), networkError, new Error("UNAUTHORIZED")])(
    "ignores other errors (%#)",
    (error) => {
      expect(isUnauthorized(error)).toBe(false);
    },
  );
});

describe("shouldRetry", () => {
  it("retries network failures and server errors up to twice", () => {
    for (const error of [networkError, procedureError("INTERNAL_SERVER_ERROR", 500)]) {
      expect([0, 1, 2].map((failures) => shouldRetry(failures, error))).toEqual([true, true, false]);
    }
  });

  it.each([
    ["BAD_REQUEST", 400],
    ["UNAUTHORIZED", 401],
    ["FORBIDDEN", 403],
    ["NOT_FOUND", 404],
    ["CONFLICT", 409],
  ])("never retries %s", (code, status) => {
    expect(shouldRetry(0, procedureError(code, status))).toBe(false);
  });

  it("never retries errors that are not tRPC client errors", () => {
    expect(shouldRetry(0, new Error("render failed"))).toBe(false);
  });
});

describe("makeQueryClient", () => {
  it("clears the cache and calls onUnauthorized for an UNAUTHORIZED query", async () => {
    const onUnauthorized = vi.fn();
    const queryClient = makeQueryClient({ onUnauthorized });
    queryClient.setQueryData(["cached"], "kept until sign-out");

    await queryClient.prefetchQuery({
      queryKey: ["employees"],
      queryFn: () => Promise.reject(procedureError("UNAUTHORIZED", 401)),
    });

    expect(onUnauthorized).toHaveBeenCalledOnce();
    expect(queryClient.getQueryData(["cached"])).toBeUndefined();
  });

  it("handles an UNAUTHORIZED mutation the same way", async () => {
    const onUnauthorized = vi.fn();
    const queryClient = makeQueryClient({ onUnauthorized });

    const mutation = queryClient
      .getMutationCache()
      .build(queryClient, { mutationFn: () => Promise.reject(procedureError("UNAUTHORIZED", 401)) });
    await expect(mutation.execute(undefined)).rejects.toThrow();

    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("leaves other errors to the screen that made the request", async () => {
    const onUnauthorized = vi.fn();
    const queryClient = makeQueryClient({ onUnauthorized });
    queryClient.setQueryData(["cached"], "kept");

    await queryClient.prefetchQuery({
      queryKey: ["employee"],
      queryFn: () => Promise.reject(procedureError("NOT_FOUND", 404)),
    });

    expect(onUnauthorized).not.toHaveBeenCalled();
    expect(queryClient.getQueryData(["cached"])).toBe("kept");
  });
});
