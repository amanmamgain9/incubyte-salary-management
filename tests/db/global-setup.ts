// Runs once per `npm run test:db`, in the main process: drop and recreate `<db>_test` as owner, migrate it,
// then hand both `_test` URLs to the workers (tests/db/setup.ts). The dev database is never written.
import type { TestProject } from "vitest/node";
import { siblingDatabaseUrl } from "@/server/db/connect";
import { recreateMigratedDatabase } from "@/server/db/owner";
import { getEnv } from "@/server/env";

type TestDatabaseEnv = { DATABASE_URL: string; DATABASE_OWNER_URL: string };

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseEnv: TestDatabaseEnv;
  }
}

export async function setup(project: TestProject): Promise<void> {
  const testEnv: TestDatabaseEnv = {
    DATABASE_URL: siblingDatabaseUrl(getEnv().DATABASE_URL, "_test"),
    DATABASE_OWNER_URL: await recreateMigratedDatabase("_test"),
  };
  project.provide("testDatabaseEnv", testEnv);
}
