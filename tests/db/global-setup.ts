// Runs once per `npm run test:db`, in the main process: drop and recreate `<db>_test` as owner, migrate it,
// then hand both `_test` URLs to the workers (tests/db/setup.ts). The dev database is never written.
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import type { TestProject } from "vitest/node";
import { createDb } from "@/server/db/connect";
import { getEnv, ownerEnv } from "@/server/env";

type TestDatabaseEnv = { DATABASE_URL: string; DATABASE_OWNER_URL: string };

declare module "vitest" {
  export interface ProvidedContext {
    testDatabaseEnv: TestDatabaseEnv;
  }
}

export async function setup(project: TestProject): Promise<void> {
  const devOwnerUrl = ownerEnv().DATABASE_OWNER_URL;
  const name = `${decodeURIComponent(new URL(devOwnerUrl).pathname.slice(1))}_test`;
  const pointAtTestDatabase = (url: string) => {
    const testUrl = new URL(url);
    testUrl.pathname = `/${encodeURIComponent(name)}`;
    return testUrl.href;
  };
  const testEnv: TestDatabaseEnv = {
    DATABASE_URL: pointAtTestDatabase(getEnv().DATABASE_URL),
    DATABASE_OWNER_URL: pointAtTestDatabase(devOwnerUrl),
  };

  const server = createDb(devOwnerUrl);
  try {
    await server.execute(sql`DROP DATABASE IF EXISTS ${sql.identifier(name)} WITH (FORCE)`);
    await server.execute(sql`CREATE DATABASE ${sql.identifier(name)}`);
  } finally {
    await server.$client.end();
  }

  const testDb = createDb(testEnv.DATABASE_OWNER_URL);
  try {
    await migrate(testDb, { migrationsFolder: "drizzle" });
  } finally {
    await testDb.$client.end();
  }

  project.provide("testDatabaseEnv", testEnv);
}
