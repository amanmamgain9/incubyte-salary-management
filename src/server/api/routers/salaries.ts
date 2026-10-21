import "server-only";
import { EmployeeView } from "@/contracts/employees";
import { UpdateSalaryInput } from "@/contracts/salaries";
import { router, signedInMutationProcedure } from "@/server/api/trpc";
import { getEmployee } from "@/server/employees/operations";
import { changeSalary } from "@/server/salaries/operations";

export const salariesRouter = router({
  // The one two-call resolver (src/server/AGENTS.md › Layering): read the view after the change commits,
  // so the salaries module never imports employees.
  update: signedInMutationProcedure
    .input(UpdateSalaryInput)
    .output(EmployeeView)
    .mutation(async ({ ctx, input }) => {
      await changeSalary(ctx.op, input);
      return getEmployee(ctx.op, { id: input.employee_id });
    }),
});
