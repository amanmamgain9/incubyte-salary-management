import { defineConfig, devices } from "@playwright/test";

// e2e runs against a production build (`next start`) on its own port.
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
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run build && npm run start -- --port ${port}`,
    url: baseURL,
    // The mutation same-origin check and Better Auth must see the URL the browser uses.
    env: { APP_URL: baseURL },
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
