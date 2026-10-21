// Employment status and dates, derived from joining_date and last_working_day. Script-safe: no `server-only`.
import { type SQL, sql } from "drizzle-orm";
import type { FieldErrors } from "@/contracts/errors";
import type { DetailsPatch, EmploymentStatus } from "@/contracts/employees";
import { employees } from "@/server/db/schema";

/**
 * SQL: the employee is active on `date` (`YYYY-MM-DD`, or a date-valued SQL expression such as a snapshot date column),
 * from the joining date through the last working day.
 */
export function isActiveOn(date: string | SQL): SQL {
  return sql`(${employees.joining_date} <= ${date}::date
    and (${employees.last_working_day} is null or ${employees.last_working_day} >= ${date}::date))`;
}

/**
 * SQL: the employee's status on `date`: active (isActiveOn), upcoming before joining, departed after leaving. The same
 * rule as `employmentStatusFor` in `contracts/employees.ts`, which serves one loaded row.
 */
export function employmentStatusOn(date: string): SQL<EmploymentStatus> {
  return sql<EmploymentStatus>`(case when ${isActiveOn(date)} then 'active'
    when ${employees.joining_date} > ${date}::date then 'upcoming' else 'departed' end)`;
}

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
  stored: StoredEmploymentDates,
  patch: Pick<DetailsPatch, "joining_date" | "last_working_day">,
): FieldErrors | null {
  const joining = patch.joining_date ?? stored.joining_date;
  const lastDay = patch.last_working_day === undefined ? stored.last_working_day : patch.last_working_day;
  if (lastDay === null) return null;
  if (patch.last_working_day === undefined) {
    // Only the joining date moved; the stored last working day already satisfied the revision rule.
    return lastDay < joining ? { joining_date: "Must be on or before the last working day" } : null;
  }
  if (lastDay < joining) return { last_working_day: "Must be on or after the joining date" };
  if (stored.latest_revision_date !== null && lastDay < stored.latest_revision_date) {
    return { last_working_day: `Must be on or after the latest salary revision (${stored.latest_revision_date})` };
  }
  return null;
}
