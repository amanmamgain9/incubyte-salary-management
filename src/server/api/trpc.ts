import "server-only";
import { initTRPC } from "@trpc/server";
import type { Context } from "@/server/api/context";
import { formatError } from "@/server/api/error-formatter";
import { mapDomainErrors } from "@/server/api/middleware/map-domain-errors";
import { operationContext } from "@/server/api/middleware/operation-context";
import { requireSameOrigin } from "@/server/api/middleware/require-same-origin";
import { requireSession } from "@/server/api/middleware/require-session";

const t = initTRPC.context<Context>().create({ errorFormatter: formatError });

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;

/** Every query: domain errors mapped, session required, `ctx.op` built. */
export const signedInProcedure = t.procedure.concat(mapDomainErrors).concat(requireSession).concat(operationContext);

/** Every mutation: as `signedInProcedure`, plus the same-origin check before the session is read. */
export const signedInMutationProcedure = t.procedure
  .concat(mapDomainErrors)
  .concat(requireSameOrigin)
  .concat(requireSession)
  .concat(operationContext);
