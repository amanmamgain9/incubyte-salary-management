import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/server/auth/auth";
import { getSessionUser } from "@/server/auth/session";
import { ownerDb } from "@/server/db/owner";
import { session } from "@/server/db/schema";
import { insertHrUser } from "./fixtures";
import { resetTables, signIn } from "./harness";

beforeEach(resetTables);

describe("getSessionUser", () => {
  it("returns null without a session cookie", async () => {
    await expect(getSessionUser(new Headers())).resolves.toBeNull();
  });

  it("returns the signed-in HR user for a valid session cookie", async () => {
    const hr = await insertHrUser();
    const headers = new Headers({ cookie: await signIn(hr) });

    await expect(getSessionUser(headers)).resolves.toEqual({ id: hr.id, name: hr.name, email: hr.email });
  });

  it("returns null once the session is signed out", async () => {
    const headers = new Headers({ cookie: await signIn(await insertHrUser()) });
    await auth.api.signOut({ headers });

    await expect(getSessionUser(headers)).resolves.toBeNull();
  });

  it("returns null when the session has expired", async () => {
    const headers = new Headers({ cookie: await signIn(await insertHrUser()) });
    await ownerDb.update(session).set({ expiresAt: new Date(Date.now() - 1000) });

    await expect(getSessionUser(headers)).resolves.toBeNull();
  });
});

describe("sign-up", () => {
  it("is disabled", async () => {
    const response = await auth.api.signUpEmail({
      body: { name: "New Person", email: "new@acme.test", password: "new-person-password" },
      asResponse: true,
    });

    expect(response.ok).toBe(false);
  });
});
