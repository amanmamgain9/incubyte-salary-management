import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import {
  ConflictError,
  InvalidCursorError,
  NotFoundError,
  sqlStateOf,
  ValidationError,
} from "@/server/core/errors";

// A standalone builder so api/trpc.ts can `.concat()` this middleware without an import cycle.
const t = initTRPC.create();

/** The one domain-error → tRPC code mapping; logs unexpected errors without inputs. */
export const mapDomainErrors = t.procedure.use(async ({ path, next }) => {
  const result = await next();
  if (result.ok) return result;
  const mapped = toTRPCError(result.error);
  if (mapped.code === "INTERNAL_SERVER_ERROR") logUnexpected(path, mapped.cause);
  throw mapped;
});

// Resolvers' thrown errors arrive wrapped as INTERNAL_SERVER_ERROR with the original as `cause`.
function toTRPCError(error: TRPCError): TRPCError {
  const cause = error.cause;
  const as = (code: "NOT_FOUND" | "CONFLICT" | "BAD_REQUEST") => new TRPCError({ code, message: cause?.message, cause });
  if (cause instanceof NotFoundError) return as("NOT_FOUND");
  if (cause instanceof ConflictError) return as("CONFLICT");
  if (cause instanceof ValidationError || cause instanceof InvalidCursorError) return as("BAD_REQUEST");
  return error;
}

// Error messages can embed SQL parameters (inputs), so only the name and SQLSTATE are logged.
function logUnexpected(path: string, cause: Error | undefined): void {
  const sqlState = sqlStateOf(cause);
  console.error(`Unexpected error in ${path}: ${cause?.name ?? "Error"}${sqlState ? ` (SQLSTATE ${sqlState})` : ""}`);
}
