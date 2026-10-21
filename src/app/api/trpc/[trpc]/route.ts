import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { createContext } from "@/server/api/context";
import { appRouter } from "@/server/api/root";

function handler(req: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext({ headers: req.headers }),
    // Every response is private, per-user data.
    responseMeta: () => ({ headers: { "Cache-Control": "no-store" } }),
  });
}

export { handler as GET, handler as POST };
