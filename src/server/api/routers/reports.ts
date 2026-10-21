import "server-only";
import { DepartmentBreakdownInput, DepartmentBreakdownOutput } from "@/contracts/reports/department-breakdown";
import {
  HistoricalSalaryBenchmarkInput,
  HistoricalSalaryBenchmarkOutput,
} from "@/contracts/reports/historical-salary-benchmark";
import { SalaryCommitmentInput, SalaryCommitmentOutput } from "@/contracts/reports/salary-commitment";
import { SalaryGrowthInput, SalaryGrowthOutput } from "@/contracts/reports/salary-growth";
import { router, signedInProcedure } from "@/server/api/trpc";
import { departmentBreakdown } from "@/server/reports/department-breakdown/operations";
import { historicalSalaryBenchmark } from "@/server/reports/historical-salary-benchmark/operations";
import { salaryCommitment } from "@/server/reports/salary-commitment/operations";
import { salaryGrowth } from "@/server/reports/salary-growth/operations";

export const reportsRouter = router({
  salaryCommitment: signedInProcedure
    .input(SalaryCommitmentInput)
    .output(SalaryCommitmentOutput)
    .query(({ ctx, input }) => salaryCommitment(ctx.op, input)),
  departmentBreakdown: signedInProcedure
    .input(DepartmentBreakdownInput)
    .output(DepartmentBreakdownOutput)
    .query(({ ctx, input }) => departmentBreakdown(ctx.op, input)),
  salaryGrowth: signedInProcedure
    .input(SalaryGrowthInput)
    .output(SalaryGrowthOutput)
    .query(({ ctx, input }) => salaryGrowth(ctx.op, input)),
  historicalSalaryBenchmark: signedInProcedure
    .input(HistoricalSalaryBenchmarkInput)
    .output(HistoricalSalaryBenchmarkOutput)
    .query(({ ctx, input }) => historicalSalaryBenchmark(ctx.op, input)),
});
