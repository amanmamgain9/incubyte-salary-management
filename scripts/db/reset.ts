// `npm run db:reset`: the explicit wipe before reseeding. Empties every app and auth table as owner;
// the schema and applied migrations stay, so `npm run db:seed` can run straight after.
import { ownerDb, truncatePublicTables } from "@/server/db/owner";

try {
  await truncatePublicTables();
  console.log("All app and auth tables emptied.");
} finally {
  await ownerDb.$client.end();
}
