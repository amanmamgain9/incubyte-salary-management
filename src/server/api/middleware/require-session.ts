import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import { getSessionUser } from "@/server/auth/session";

const t = initTRPC.context<{ headers: Headers }>().create();

/** Adds `ctx.user` from the Better Auth session cookie, or rejects the call as UNAUTHORIZED. */
export const requireSession = t.procedure.use(async ({ ctx, next }) => {
  const user = await getSessionUser(ctx.headers);
  if (!user) throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to continue" });
  return next({ ctx: { user } });
});
