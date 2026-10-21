import { z } from "zod";

/** `error.data.field_errors`: one message per invalid input field, keyed by its dotted input path (= form field name). */
export const FieldErrors = z.record(z.string(), z.string());
export type FieldErrors = z.infer<typeof FieldErrors>;
