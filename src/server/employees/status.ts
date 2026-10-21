// Employment status and dates, derived from joining_date and last_working_day. Script-safe: no `server-only`.
import type { FieldErrors } from "@/contracts/errors";
import type { DetailsPatch } from "@/contracts/employees";

/** The stored dates a details edit is checked against. */
export type StoredEmploymentDates = {
  joining_date: string;
  last_working_day: string | null;
  /** UTC date of the latest salary revision after the initial salary (revision > 1); null when there is none. */
  latest_revision_date: string | null;
};

/**
 * Field errors for the date fields of a details edit, keyed by the submitted field, or null when valid:
 * the resulting last working day is on or after the joining date, and a submitted last working day is on or after
 * the latest post-initial revision date. Joining dates are not checked against history (revisions may precede joining).
 */
export function employmentDateErrors(
  _stored: StoredEmploymentDates,
  _patch: Pick<DetailsPatch, "joining_date" | "last_working_day">,
): FieldErrors | null {
  throw new Error("not implemented");
}
