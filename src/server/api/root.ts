import "server-only";
import { employeesRouter } from "@/server/api/routers/employees";
import { lookupsRouter } from "@/server/api/routers/lookups";
import { reportsRouter } from "@/server/api/routers/reports";
import { salariesRouter } from "@/server/api/routers/salaries";
import { router } from "./trpc";

export const appRouter = router({
  lookups: lookupsRouter,
  employees: employeesRouter,
  salaries: salariesRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
