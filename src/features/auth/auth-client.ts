// The only Better Auth client: same-origin calls to /api/auth (docs/login.md).
import { createAuthClient } from "better-auth/react";

const authClient = createAuthClient();

export type Credentials = { email: string; password: string };

/** Signs in with email and password; rejects with the message the login form shows. */
export async function signInWithEmail(credentials: Credentials): Promise<void> {
  const { error } = await authClient.signIn.email(credentials);
  if (!error) return;
  throw new Error(error.status === 401 ? "Incorrect email or password." : "We couldn’t sign you in. Try again.");
}

/** Revokes the session and clears the cookie. */
export async function signOut(): Promise<void> {
  await authClient.signOut();
}
