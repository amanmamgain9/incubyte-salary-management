import "server-only";
import { initTRPC } from "@trpc/server";

// A standalone builder so api/trpc.ts can `.concat()` this middleware without an import cycle.
const t = initTRPC.create();

/** The one domain-error → tRPC code mapping; logs unexpected errors without inputs. */
export const mapDomainErrors = t.procedure.use(async () => {
  throw new Error("not implemented");
});
