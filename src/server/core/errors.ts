// Domain errors thrown by operations and core helpers; api/middleware/map-domain-errors.ts maps them to tRPC codes.
// Their messages and field errors reach the client, so they never carry SQL, constraint names or other internals.
// Script-safe: no `server-only`.
import { INVALID_CURSOR_MESSAGE, type FieldErrors } from "@/contracts/errors";

/** A record the input names does not exist → NOT_FOUND. */
export class NotFoundError extends Error {
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** The write clashes with stored state (duplicate ID, stale revision) → CONFLICT, with field errors when a field is to blame. */
export class ConflictError extends Error {
  readonly field_errors: FieldErrors | null;

  constructor(message: string, field_errors: FieldErrors | null = null) {
    super(message);
    this.name = "ConflictError";
    this.field_errors = field_errors;
  }
}

/** Input that passed the contract but breaks a rule needing the DB or clock → BAD_REQUEST with field errors. */
export class ValidationError extends Error {
  readonly field_errors: FieldErrors;

  constructor(field_errors: FieldErrors, message = "Invalid input") {
    super(message);
    this.name = "ValidationError";
    this.field_errors = field_errors;
  }
}

/** A pagination cursor that was altered, signed with another secret, malformed, or reused with other filters. */
export class InvalidCursorError extends Error {
  constructor() {
    super(INVALID_CURSOR_MESSAGE);
    this.name = "InvalidCursorError";
  }
}

/** The PostgreSQL SQLSTATE behind a driver error, looking through wrappers' `cause` (e.g. "23505"). */
export function sqlStateOf(error: unknown): string | undefined {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ("code" in current && typeof current.code === "string") return current.code;
  }
  return undefined;
}

/** A unique or primary-key violation (SQLSTATE 23505); callers translate it into a field-keyed ConflictError. */
export function isUniqueViolation(error: unknown): boolean {
  return sqlStateOf(error) === "23505";
}
