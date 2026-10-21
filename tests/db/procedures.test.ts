import { beforeEach, describe, expect, it } from "vitest";
import { createCallerFactory, router, signedInMutationProcedure, signedInProcedure } from "@/server/api/trpc";
import { insertHrUser } from "./fixtures";
import { type CallOptions, contextFor, resetTables } from "./harness";

// Probe procedures exercise the real middleware chain independently of any feature router.
const probeRouter = router({
  whoAmI: signedInProcedure.query(({ ctx }) => ctx.op),
  touch: signedInMutationProcedure.mutation(({ ctx }) => ctx.op.actor.id),
});
const probeCaller = async (...args: Parameters<typeof contextFor>) =>
  createCallerFactory(probeRouter)(await contextFor(...args));

beforeEach(resetTables);

describe("signedInProcedure", () => {
  it("rejects a call without a session as UNAUTHORIZED", async () => {
    const caller = await probeCaller(null);

    await expect(caller.whoAmI()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("gives operations the signed-in user, the request clock and its UTC date", async () => {
    const hr = await insertHrUser();
    const now = new Date("2026-10-21T23:30:00-05:00");
    const caller = await probeCaller(hr, { now });

    await expect(caller.whoAmI()).resolves.toMatchObject({
      actor: { id: hr.id, name: hr.name, email: hr.email },
      now,
      today: "2026-10-22",
    });
  });
});

describe("signedInMutationProcedure", () => {
  const touchWith = async (options: CallOptions) => (await probeCaller(await insertHrUser(), options)).touch();

  it("accepts a mutation from the app origin", async () => {
    await expect(touchWith({})).resolves.toBe("hr-1");
  });

  it.each([
    ["without an Origin header", null],
    ["from another host", "https://evil.example"],
    ["from another port", "http://localhost:3001"],
    ["from an opaque origin", "null"],
  ])("rejects a mutation %s as FORBIDDEN", async (_case, origin) => {
    await expect(touchWith({ origin })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("checks the origin before the session", async () => {
    const caller = await probeCaller(null, { origin: "https://evil.example" });

    await expect(caller.touch()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
