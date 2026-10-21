import "server-only";
import { initTRPC } from "@trpc/server";
import type { Actor, OperationContext } from "@/server/core/operation-context";
import type { Database } from "@/server/db/connect";

const t = initTRPC.context<{ db: Database; now: Date; user: Actor }>().create();

/** Builds `ctx.op`, the only context operations receive. */
export const operationContext = t.procedure.use(({ ctx, next }) => {
  const op: OperationContext = { db: ctx.db, actor: ctx.user, now: ctx.now, today: ctx.now.toISOString().slice(0, 10) };
  return next({ ctx: { op } });
});
