import { hashPassword } from "better-auth/crypto";
import { ownerDb } from "@/server/db/owner";
import { account, user } from "@/server/db/schema";

export type HrUserFixture = { id: string; name: string; email: string; password: string };

/** An HR user with a credential account, inserted as owner the way the seed does it. */
export async function insertHrUser(overrides: Partial<HrUserFixture> = {}): Promise<HrUserFixture> {
  const hr = { id: "hr-1", name: "Hannah Reyes", email: "hannah@acme.test", password: "fixture-password-1", ...overrides };
  await ownerDb.insert(user).values({ id: hr.id, name: hr.name, email: hr.email, emailVerified: true });
  await ownerDb.insert(account).values({
    id: `${hr.id}-credential`,
    accountId: hr.id,
    providerId: "credential",
    userId: hr.id,
    password: await hashPassword(hr.password),
  });
  return hr;
}
