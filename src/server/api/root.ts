import "server-only";
import { lookupsRouter } from "@/server/api/routers/lookups";
import { router } from "./trpc";

export const appRouter = router({
  lookups: lookupsRouter,
});

export type AppRouter = typeof appRouter;
