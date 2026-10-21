import "server-only";
import { DepartmentBreakdownInput, DepartmentBreakdownOutput } from "@/contracts/reports/department-breakdown";
import { SalaryCommitmentInput, SalaryCommitmentOutput } from "@/contracts/reports/salary-commitment";
import { router, signedInProcedure } from "@/server/api/trpc";
import { departmentBreakdown } from "@/server/reports/department-breakdown/operations";
import { salaryCommitment } from "@/server/reports/salary-commitment/operations";

export const reportsRouter = router({
  salaryCommitment: signedInProcedure
    .input(SalaryCommitmentInput)
    .output(SalaryCommitmentOutput)
    .query(({ ctx, input }) => salaryCommitment(ctx.op, input)),
  departmentBreakdown: signedInProcedure
    .input(DepartmentBreakdownInput)
    .output(DepartmentBreakdownOutput)
    .query(({ ctx, input }) => departmentBreakdown(ctx.op, input)),
});
