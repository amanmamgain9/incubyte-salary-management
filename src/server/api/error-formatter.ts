import "server-only";
import type { TRPCDefaultErrorShape as DefaultErrorShape, TRPCError } from "@trpc/server";
import type { FieldErrors } from "@/contracts/errors";

export type ErrorShape = DefaultErrorShape & {
  data: DefaultErrorShape["data"] & { field_errors: FieldErrors | null };
};

/** tRPC errorFormatter: adds `data.field_errors`; unexpected errors get a generic message. */
export function formatError(_opts: { shape: DefaultErrorShape; error: TRPCError }): ErrorShape {
  throw new Error("not implemented");
}
