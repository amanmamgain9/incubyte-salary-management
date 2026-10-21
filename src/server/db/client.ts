// App-role database for request handling: no DDL; table privileges come from migrations.
import "server-only";
import { getEnv } from "@/server/env";
import { createDb } from "./connect";

export const db = createDb(getEnv().DATABASE_URL);
