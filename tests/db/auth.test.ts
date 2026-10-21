import { beforeEach, describe, expect, it } from "vitest";
import { auth } from "@/server/auth/auth";
import { getSessionUser } from "@/server/auth/session";
import { ownerDb } from "@/server/db/owner";
import { session, user } from "@/server/db/schema";
import { getEnv } from "@/server/env";
import { DEMO_HR_ID, seedDemoHrAccount } from "@scripts/db/seed";
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

describe("seeded demo HR account", () => {
  const signInAsDemo = () =>
    auth.api.signInEmail({ body: { email: getEnv().DEMO_HR_EMAIL, password: getEnv().DEMO_HR_PASSWORD } });

  it("signs in with DEMO_HR_EMAIL and DEMO_HR_PASSWORD", async () => {
    await seedDemoHrAccount(ownerDb);

    await expect(signInAsDemo()).resolves.toMatchObject({ user: { id: DEMO_HR_ID } });
  });

  it("stays a single account that signs in when the seed runs again", async () => {
    await seedDemoHrAccount(ownerDb);
    await seedDemoHrAccount(ownerDb);

    await expect(ownerDb.select({ id: user.id }).from(user)).resolves.toEqual([{ id: DEMO_HR_ID }]);
    await expect(signInAsDemo()).resolves.toMatchObject({ user: { id: DEMO_HR_ID } });
  });
});
