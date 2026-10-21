import "server-only";
import { auth } from "./auth";

export type SessionUser = { id: string; name: string; email: string };

/** The signed-in HR user for these request headers, or null when the session cookie is missing, expired or revoked. */
export async function getSessionUser(headers: Headers): Promise<SessionUser | null> {
  const current = await auth.api.getSession({ headers });
  if (!current) return null;
  const { id, name, email } = current.user;
  return { id, name, email };
}
