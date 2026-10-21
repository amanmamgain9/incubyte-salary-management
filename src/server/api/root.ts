import "server-only";
import { router } from "./trpc";

export const appRouter = router({});

export type AppRouter = typeof appRouter;
