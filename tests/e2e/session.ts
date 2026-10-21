// Shared e2e steps. Specs that start signed in import `test` from here: one HR session per worker (Better Auth allows
// three sign-ins per 10 s), reused by every test's browser context. Data is arranged through the API with that
// session's cookies and the app Origin (mutations are same-origin only).
import { test as base, expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { getEnv } from "@/server/env";

const { DEMO_HR_EMAIL, DEMO_HR_PASSWORD } = getEnv();
const MAX_SIGN_IN_ATTEMPTS = 3;

type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>;

/** Signs in through the login form (for specs about signing in). */
export async function signIn(page: Page, password = DEMO_HR_PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_HR_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Calls a tRPC mutation as the signed-in user of `request`. */
export async function callMutation(request: APIRequestContext, origin: string, path: string, input: unknown) {
  const response = await request.post(`/api/trpc/${path}`, { headers: { Origin: origin }, data: input });
  expect(response.ok(), await response.text()).toBe(true);
}

// Signs in through Better Auth's endpoint, waiting out its sign-in rate limit when an earlier spec used it up.
async function signInThroughApi(request: APIRequestContext, origin: string) {
  for (let attempt = 1; ; attempt++) {
    const response = await request.post("/api/auth/sign-in/email", {
      headers: { Origin: origin },
      data: { email: DEMO_HR_EMAIL, password: DEMO_HR_PASSWORD },
    });
    if (response.status() !== 429 || attempt === MAX_SIGN_IN_ATTEMPTS) {
      expect(response.ok(), await response.text()).toBe(true);
      return;
    }
    const seconds = Number(response.headers()["x-retry-after"] ?? "10");
    await new Promise((resolve) => setTimeout(resolve, (seconds + 1) * 1000));
  }
}

export const test = base.extend<{ api: { mutate: (path: string, input: unknown) => Promise<void> } }, { hrSession: StorageState }>({
  hrSession: [
    async ({ browser }, provide, workerInfo) => {
      const origin = workerInfo.project.use.baseURL ?? "";
      const context = await browser.newContext({ baseURL: origin });
      await signInThroughApi(context.request, origin);
      await provide(await context.storageState());
      await context.close();
    },
    { scope: "worker" },
  ],
  storageState: async ({ hrSession }, provide) => provide(hrSession),
  api: async ({ page, baseURL }, provide) =>
    provide({ mutate: (path, input) => callMutation(page.request, baseURL ?? "", path, input) }),
});

export { expect };
