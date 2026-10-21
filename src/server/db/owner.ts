// Owner-role database for migrate, reset, seed, verify and test setup. Script-safe: no `server-only`.
import { ownerEnv } from "@/server/env";
import { createDb } from "./connect";

export const ownerDb = createDb(ownerEnv().DATABASE_OWNER_URL);
