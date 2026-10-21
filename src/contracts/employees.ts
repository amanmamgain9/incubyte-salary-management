import { z } from "zod";
import { CountryCode, DepartmentId, EmployeeId, IsoDate } from "@/contracts/primitives";

export const EmployeeName = z.string().trim().min(1, "Enter a name").max(200);

/** Editable employee details; every field optional. `last_working_day: null` clears a recorded departure. */
export const DetailsPatch = z.object({
  name: EmployeeName.optional(),
  department_id: DepartmentId.optional(),
  work_country_code: CountryCode.optional(),
  joining_date: IsoDate.optional(),
  last_working_day: IsoDate.nullable().optional(),
});
export type DetailsPatch = z.infer<typeof DetailsPatch>;

/** `employees.update` input: the changed details sit flat beside `id` (no nested patch); at least one is required. */
export const UpdateEmployeeInput = z
  .object({ id: EmployeeId, ...DetailsPatch.shape })
  .refine(({ id: _id, ...details }) => Object.values(details).some((value) => value !== undefined), {
    message: "Change at least one field",
  });
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeInput>;
