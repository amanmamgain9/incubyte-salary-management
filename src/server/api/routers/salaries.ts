import "server-only";
import { EmployeeView } from "@/contracts/employees";
import { SalaryHistoryInput, SalaryHistoryOutput, UpdateSalaryInput } from "@/contracts/salaries";
import { router, signedInMutationProcedure, signedInProcedure } from "@/server/api/trpc";
import { changeSalary, listSalaryHistory } from "@/server/salaries/operations";

export const salariesRouter = router({
  history: signedInProcedure
    .input(SalaryHistoryInput)
    .output(SalaryHistoryOutput)
    .query(({ ctx, input }) => listSalaryHistory(ctx.op, input)),
  update: signedInMutationProcedure
    .input(UpdateSalaryInput)
    .output(EmployeeView)
    .mutation(({ ctx, input }) => changeSalary(ctx.op, input)),
});
