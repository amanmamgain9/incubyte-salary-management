// The only module that imports `pg` or creates a Pool. Script-safe: no `server-only`.
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

/** A Drizzle database on its own pool; scripts and test setup close it with `db.$client.end()`. */
export function createDb(url: string) {
  return drizzle({ client: new Pool({ connectionString: url }) });
}
