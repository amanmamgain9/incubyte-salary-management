import "server-only";
import type { Database } from "@/server/db/connect";

/** The signed-in HR user acting on a request (Better Auth `user`). */
export type Actor = { id: string; name: string; email: string };

/** What every operation receives: the app database, who is acting, and the request's clock. */
export type OperationContext = {
  db: Database;
  actor: Actor;
  now: Date;
  /** `now` as a UTC calendar date, `YYYY-MM-DD`. */
  today: string;
};
