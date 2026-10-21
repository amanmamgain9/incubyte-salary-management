import { defineConfig } from "drizzle-kit";
import { ownerEnv } from "./src/server/env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema",
  out: "./drizzle",
  dbCredentials: { url: ownerEnv().DATABASE_OWNER_URL },
  strict: true,
  verbose: true,
});
