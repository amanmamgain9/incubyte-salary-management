import { z } from "zod";
import { EmployeeFilters } from "@/contracts/employees";
import { Paging } from "@/contracts/paging";

/**
 * The directory URL → `employees.list` input, used by the page's prefetch and by the client so both hit the same
 * cache entry. Invalid params fall back to "no filter"; a blank search is no search.
 */
export const directorySearch = z.object({
  search: EmployeeFilters.shape.search
    .unwrap()
    .transform((value) => value || undefined)
    .optional()
    .catch(undefined),
  department_id: EmployeeFilters.shape.department_id.catch(undefined),
  work_country_code: EmployeeFilters.shape.work_country_code.catch(undefined),
  employment_status: EmployeeFilters.shape.employment_status.catch(undefined),
  cursor: Paging.shape.cursor.catch(undefined),
});

export type DirectorySearch = z.output<typeof directorySearch>;
