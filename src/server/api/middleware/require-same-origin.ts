import "server-only";
import { initTRPC, TRPCError } from "@trpc/server";
import { getEnv } from "@/server/env";

const t = initTRPC.context<{ headers: Headers }>().create();

/** Rejects a mutation unless its `Origin` header is the app's origin (`new URL(APP_URL).origin`). */
export const requireSameOrigin = t.procedure.use(({ ctx, next }) => {
  if (originOf(ctx.headers.get("origin")) !== getEnv().appOrigin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Cross-origin request rejected" });
  }
  return next();
});

// Normalizes the header the way appOrigin is normalized; a missing, opaque ("null") or malformed one never matches.
function originOf(header: string | null): string | null {
  if (header === null || !URL.canParse(header)) return null;
  const origin = new URL(header).origin;
  return origin === "null" ? null : origin;
}
