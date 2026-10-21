import "server-only";
import type { TRPCDefaultErrorShape as DefaultErrorShape, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import type { FieldErrors } from "@/contracts/errors";
import { ConflictError, ValidationError } from "@/server/core/errors";

export type ErrorShape = DefaultErrorShape & {
  data: DefaultErrorShape["data"] & { field_errors: FieldErrors | null };
};

const INVALID_INPUT = "Invalid input";

/** tRPC errorFormatter: adds `data.field_errors`; unexpected errors get a generic message. */
export function formatError({ shape, error }: { shape: DefaultErrorShape; error: TRPCError }): ErrorShape {
  const { message, field_errors } = describe(error);
  return { ...shape, message, data: { ...shape.data, field_errors } };
}

function describe(error: TRPCError): { message: string; field_errors: FieldErrors | null } {
  const cause = error.cause;
  // Output validation failures and anything unmapped are internal: never echo their details.
  if (error.code === "INTERNAL_SERVER_ERROR") return { message: "Internal server error", field_errors: null };
  if (cause instanceof ValidationError || cause instanceof ConflictError) {
    return { message: error.message, field_errors: cause.field_errors };
  }
  if (cause instanceof ZodError) return fromZod(cause);
  return { message: error.message, field_errors: null };
}

// Fields are keyed by their dotted input path; an input-level issue (empty path) becomes the message.
function fromZod(error: ZodError): { message: string; field_errors: FieldErrors } {
  const field_errors: FieldErrors = {};
  let message = INVALID_INPUT;
  for (const issue of error.issues) {
    const path = issue.path.map(String).join(".");
    if (path === "") {
      if (message === INVALID_INPUT) message = issue.message;
    } else {
      field_errors[path] ??= issue.message;
    }
  }
  return { message, field_errors };
}
