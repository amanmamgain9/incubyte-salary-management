import "server-only";
import { SalaryCommitmentInput, SalaryCommitmentOutput } from "@/contracts/reports/salary-commitment";
import { router, signedInProcedure } from "@/server/api/trpc";
import { salaryCommitment } from "@/server/reports/salary-commitment/operations";

export const reportsRouter = router({
  salaryCommitment: signedInProcedure
    .input(SalaryCommitmentInput)
    .output(SalaryCommitmentOutput)
    .query(({ ctx, input }) => salaryCommitment(ctx.op, input)),
});
