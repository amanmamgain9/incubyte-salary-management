import { TRPCClientError } from "@trpc/client";
import { FieldErrors } from "@/contracts/errors";

export type FormErrors = { fields: Record<string, string>; message: string | null };

const NETWORK_MESSAGE = "We couldn’t reach the server. Check your connection and try again.";
const GENERIC_MESSAGE = "Something went wrong. Try again.";

/**
 * Splits a failed submit into errors beside the form's own fields and one form-level message.
 * Field errors for inputs the form does not show, and errors without field details, become the message.
 */
export function toFieldErrors(error: unknown, fieldNames: readonly string[]): FormErrors {
  if (!(error instanceof Error)) return { fields: {}, message: GENERIC_MESSAGE };
  if (!(error instanceof TRPCClientError)) return { fields: {}, message: error.message || GENERIC_MESSAGE };
  if (!error.data) return { fields: {}, message: NETWORK_MESSAGE };

  const parsed = FieldErrors.nullable().catch(null).parse(error.data.field_errors);
  const fields: Record<string, string> = {};
  const others: string[] = [];
  for (const [name, message] of Object.entries(parsed ?? {})) {
    if (fieldNames.includes(name)) fields[name] = message;
    else others.push(message);
  }
  if (Object.keys(fields).length === 0 && others.length === 0) return { fields, message: error.message };
  return { fields, message: others[0] ?? null };
}

/** True when a write was rejected as CONFLICT (a duplicate ID, or a salary changed since the form loaded). */
export function isConflict(error: unknown): boolean {
  return error instanceof TRPCClientError && error.data?.code === "CONFLICT";
}
