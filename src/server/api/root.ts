import "server-only";
import { employeesRouter } from "@/server/api/routers/employees";
import { lookupsRouter } from "@/server/api/routers/lookups";
import { router } from "./trpc";

export const appRouter = router({
  lookups: lookupsRouter,
  employees: employeesRouter,
});

export type AppRouter = typeof appRouter;
