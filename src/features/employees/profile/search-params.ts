import { z } from "zod";
import { Paging } from "@/contracts/paging";
import type { SalaryHistoryInput } from "@/contracts/salaries";

/** The profile URL's own state: the salary history page. An invalid cursor param falls back to the first page. */
export const profileSearch = z.object({ cursor: Paging.shape.cursor.catch(undefined) });

export type ProfileSearch = z.output<typeof profileSearch>;

/** The `salaries.history` input for a profile, used by the page's prefetch and the client so both hit one cache entry. */
export function historyInput(employeeId: string, search: ProfileSearch): SalaryHistoryInput {
  return { employee_id: employeeId, cursor: search.cursor };
}
