import { z } from "zod";
import { page, Paging } from "@/contracts/paging";
import { CountryCode, CurrencyCode, Decimal, DepartmentId, EmployeeId, IsoDate, Money } from "@/contracts/primitives";

/** Derived from the dates on a given day: before joining → upcoming; after the last working day → departed. */
export const EmploymentStatus = z.enum(["upcoming", "active", "departed"]);
export type EmploymentStatus = z.infer<typeof EmploymentStatus>;

export const EmployeeName = z.string().trim().min(1, "Enter a name").max(200);

/** `employees.create` input: a new joiner with their initial salary (saved as history revision 1). */
export const EmployeeInput = z.object({
  id: EmployeeId,
  name: EmployeeName,
  department_id: DepartmentId,
  work_country_code: CountryCode,
  joining_date: IsoDate,
  annual_base_pay: Money,
  salary_currency_code: CurrencyCode,
});
export type EmployeeInput = z.infer<typeof EmployeeInput>;

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

/** An employee as every procedure returns it; `employment_status` is as of today (UTC). */
export const EmployeeView = z.object({
  id: EmployeeId,
  name: z.string(),
  department_id: DepartmentId,
  work_country_code: CountryCode,
  joining_date: IsoDate,
  last_working_day: IsoDate.nullable(),
  annual_base_pay: Decimal,
  salary_currency_code: CurrencyCode,
  salary_revision: z.int().min(1),
  employment_status: EmploymentStatus,
});
export type EmployeeView = z.infer<typeof EmployeeView>;

export const GetEmployeeInput = z.object({ id: EmployeeId });
export type GetEmployeeInput = z.infer<typeof GetEmployeeInput>;

/** Directory filters; a blank search means no search. Search matches name or ID, case-insensitive, partial. */
export const EmployeeFilters = z.object({
  search: z.string().trim().max(100).optional(),
  department_id: DepartmentId.optional(),
  work_country_code: CountryCode.optional(),
  employment_status: EmploymentStatus.optional(),
});
export type EmployeeFilters = z.infer<typeof EmployeeFilters>;

export const ListEmployeesInput = z.object({ ...EmployeeFilters.shape, ...Paging.shape });
export type ListEmployeesInput = z.infer<typeof ListEmployeesInput>;

/** Counts over every employee matching the filters, independent of pagination. */
export const DirectorySummary = z.object({
  employee_count: z.int().min(0),
  active_count: z.int().min(0),
  upcoming_count: z.int().min(0),
  departed_count: z.int().min(0),
  country_count: z.int().min(0),
});
export type DirectorySummary = z.infer<typeof DirectorySummary>;

export const ListEmployeesOutput = z.object({ rows: page(EmployeeView), summary: DirectorySummary });
export type ListEmployeesOutput = z.infer<typeof ListEmployeesOutput>;
