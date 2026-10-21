import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      "@scripts": fromRoot("./scripts"),
      "@tests": fromRoot("./tests"),
      // `server-only` throws outside React Server Components; tests import server modules directly.
      "server-only": fromRoot("./node_modules/server-only/empty.js"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
          // Placeholder app env for code that calls getEnv(); unit tests never reach a DB or network.
          env: {
            DATABASE_URL: "postgres://unit:unit@127.0.0.1:1/unit",
            APP_URL: "http://localhost:3000",
            BETTER_AUTH_SECRET: "unit-test-better-auth-secret-0000000000",
            CURSOR_SECRET: "unit-test-cursor-secret-000000000000000",
            DEMO_HR_EMAIL: "hr@example.test",
            DEMO_HR_PASSWORD: "unit-test-password",
          },
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: ["tests/db/**/*.test.ts"],
          environment: "node",
          fileParallelism: false,
          // Recreates and migrates `<db>_test`; setup.ts then points each worker's database URLs at it.
          globalSetup: ["tests/db/global-setup.ts"],
          setupFiles: ["tests/db/setup.ts"],
        },
      },
    ],
  },
});
