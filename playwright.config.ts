import { defineConfig, devices } from "@playwright/test";
import { siblingDatabaseUrl } from "./src/server/db/connect";
import { getEnv } from "./src/server/env";

// e2e runs against a production build (`next start`) on its own port and its own `<db>_e2e` database, recreated and
// seeded by the `setup` project (tests/e2e/global-setup.ts). `npm run test:e2e` loads .env first.
const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /global-setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["setup"] },
  ],
  webServer: {
    command: `npm run build && npm run start -- --port ${port}`,
    url: `${baseURL}/login`,
    env: {
      // The mutation same-origin check and Better Auth must see the URL the browser uses.
      APP_URL: baseURL,
      DATABASE_URL: siblingDatabaseUrl(getEnv().DATABASE_URL, "_e2e"),
    },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
