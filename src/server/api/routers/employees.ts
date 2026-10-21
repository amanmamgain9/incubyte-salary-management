import "server-only";
import {
  EmployeeInput,
  EmployeeView,
  GetEmployeeInput,
  ListEmployeesInput,
  ListEmployeesOutput,
  UpdateEmployeeInput,
} from "@/contracts/employees";
import { router, signedInMutationProcedure, signedInProcedure } from "@/server/api/trpc";
import { createEmployee, getEmployee, listEmployees, updateEmployeeDetails } from "@/server/employees/operations";

export const employeesRouter = router({
  list: signedInProcedure
    .input(ListEmployeesInput)
    .output(ListEmployeesOutput)
    .query(({ ctx, input }) => listEmployees(ctx.op, input)),
  get: signedInProcedure
    .input(GetEmployeeInput)
    .output(EmployeeView)
    .query(({ ctx, input }) => getEmployee(ctx.op, input)),
  create: signedInMutationProcedure
    .input(EmployeeInput)
    .output(EmployeeView)
    .mutation(({ ctx, input }) => createEmployee(ctx.op, input)),
  update: signedInMutationProcedure
    .input(UpdateEmployeeInput)
    .output(EmployeeView)
    .mutation(({ ctx, input }) => updateEmployeeDetails(ctx.op, input)),
});
