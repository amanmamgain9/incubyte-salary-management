// `npm run db:migrate`: applies the committed migrations in drizzle/ as the owner role.
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { ownerDb } from "@/server/db/owner";

try {
  await migrate(ownerDb, { migrationsFolder: "drizzle" });
  console.log("Migrations applied.");
} finally {
  await ownerDb.$client.end();
}
