import type { DetailsPatch, EmployeeView } from "@/contracts/employees";

/** The edit form's values: input strings, with "" for no last working day. */
export type DetailsValues = {
  name: string;
  department_id: string;
  work_country_code: string;
  joining_date: string;
  last_working_day: string;
};

/** The edit form's initial values for an employee. */
export function detailsValues(employee: Pick<EmployeeView, keyof DetailsValues>): DetailsValues {
  return {
    name: employee.name,
    department_id: employee.department_id,
    work_country_code: employee.work_country_code,
    joining_date: employee.joining_date,
    last_working_day: employee.last_working_day ?? "",
  };
}

/** Only the changed fields, as `employees.update` takes them: a cleared last working day is `null`. */
export function toDetailsPatch(changes: Partial<DetailsValues>): DetailsPatch {
  const { last_working_day, ...rest } = changes;
  if (last_working_day === undefined) return rest;
  return { ...rest, last_working_day: last_working_day === "" ? null : last_working_day };
}
