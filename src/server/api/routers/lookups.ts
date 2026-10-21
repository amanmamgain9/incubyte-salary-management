import "server-only";
import { LookupsOutput } from "@/contracts/lookups";
import { router, signedInProcedure } from "@/server/api/trpc";
import { getLookups } from "@/server/lookups/operations";

export const lookupsRouter = router({
  get: signedInProcedure.output(LookupsOutput).query(({ ctx }) => getLookups(ctx.op)),
});
