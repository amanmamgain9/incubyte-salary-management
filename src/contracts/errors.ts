import { z } from "zod";

/** `error.data.field_errors`: one message per invalid input field, keyed by its dotted input path (= form field name). */
export const FieldErrors = z.record(z.string(), z.string());
export type FieldErrors = z.infer<typeof FieldErrors>;

/** `error.message` of the BAD_REQUEST for an altered, foreign or reused page cursor (the client drops the cursor). */
export const INVALID_CURSOR_MESSAGE = "Invalid cursor";
