import { initTRPC, TRPCError } from "@trpc/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mapDomainErrors } from "@/server/api/middleware/map-domain-errors";
import { ConflictError, InvalidCursorError, NotFoundError, ValidationError } from "@/server/core/errors";

const t = initTRPC.create();

/** Calls a procedure behind mapDomainErrors whose resolver throws `thrown`; resolves to the error the caller sees. */
async function errorFor(thrown: unknown): Promise<TRPCError> {
  const router = t.router({
    fail: t.procedure.concat(mapDomainErrors).query(() => {
      throw thrown;
    }),
  });
  const failure: unknown = await t
    .createCallerFactory(router)({})
    .fail()
    .then(
      () => null,
      (error: unknown) => error,
    );
  if (!(failure instanceof TRPCError)) throw new Error("expected a TRPCError");
  return failure;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("mapDomainErrors", () => {
  it("maps NotFoundError to NOT_FOUND with its message", async () => {
    const error = await errorFor(new NotFoundError("Employee not found"));

    expect(error).toMatchObject({ code: "NOT_FOUND", message: "Employee not found" });
  });

  it("maps ConflictError to CONFLICT and keeps it as the cause for its field errors", async () => {
    const conflict = new ConflictError("Employee ID already exists", { id: "Already exists" });
    const error = await errorFor(conflict);

    expect(error).toMatchObject({ code: "CONFLICT", message: "Employee ID already exists", cause: conflict });
  });

  it("maps ValidationError to BAD_REQUEST and keeps it as the cause for its field errors", async () => {
    const invalid = new ValidationError({ work_country_code: "Unknown country" });
    const error = await errorFor(invalid);

    expect(error).toMatchObject({ code: "BAD_REQUEST", message: "Invalid input", cause: invalid });
  });

  it("maps InvalidCursorError to BAD_REQUEST", async () => {
    const error = await errorFor(new InvalidCursorError());

    expect(error).toMatchObject({ code: "BAD_REQUEST", message: "Invalid cursor" });
  });

  it("passes tRPC errors from later middleware through unchanged", async () => {
    const unauthorized = new TRPCError({ code: "UNAUTHORIZED" });

    await expect(errorFor(unauthorized)).resolves.toBe(unauthorized);
  });

  it("leaves unexpected errors as INTERNAL_SERVER_ERROR", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const error = await errorFor(new Error("connection refused"));

    expect(error.code).toBe("INTERNAL_SERVER_ERROR");
  });

  it("logs an unexpected error with its procedure path but without its message", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await errorFor(new Error("duplicate key: secret@acme.test"));

    expect(log).toHaveBeenCalledOnce();
    const logged = JSON.stringify(log.mock.calls);
    expect(logged).toContain("fail");
    expect(logged).not.toContain("secret@acme.test");
  });

  it("does not log domain errors", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await errorFor(new NotFoundError());

    expect(log).not.toHaveBeenCalled();
  });
});
