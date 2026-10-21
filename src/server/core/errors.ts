// Domain errors thrown by operations and core helpers; api/middleware/map-domain-errors.ts maps them to tRPC codes.
// Script-safe: no `server-only`.

/** A pagination cursor that was altered, signed with another secret, malformed, or reused with other filters. */
export class InvalidCursorError extends Error {
  constructor() {
    super("Invalid cursor");
    this.name = "InvalidCursorError";
  }
}
