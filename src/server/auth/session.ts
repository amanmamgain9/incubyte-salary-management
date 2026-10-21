import "server-only";
import type { Actor } from "@/server/core/operation-context";
import { auth } from "./auth";

/** The signed-in HR user for these request headers, or null when the session cookie is missing, expired or revoked. */
export async function getSessionUser(headers: Headers): Promise<Actor | null> {
  const current = await auth.api.getSession({ headers });
  if (!current) return null;
  const { id, name, email } = current.user;
  return { id, name, email };
}
