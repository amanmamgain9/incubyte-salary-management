import "server-only";
import { db } from "@/server/db/client";

/** Per-request tRPC context; `now` is read once so a request sees one clock. */
export async function createContext({ headers }: { headers: Headers }) {
  return { db, headers, now: new Date() };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
