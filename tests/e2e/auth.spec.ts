import { expect, test, type Page } from "@playwright/test";
import { getEnv } from "@/server/env";

const { DEMO_HR_EMAIL, DEMO_HR_PASSWORD } = getEnv();

async function signIn(page: Page, password: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_HR_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

test("signing in opens the employee directory", async ({ page, baseURL }) => {
  await page.goto("/employees");
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page, DEMO_HR_PASSWORD);
  await expect(page).toHaveURL(/\/employees$/);
  await expect(page.getByRole("heading", { level: 1, name: "Employees" })).toBeVisible();
  await expect(page.getByText("No employees yet")).toBeVisible();

  // The browser's session cookie authorises the API call; mutations must come from the app origin.
  const created = await page.request.post("/api/trpc/employees.create", {
    headers: { Origin: baseURL ?? "" },
    data: {
      id: "E2E-0001",
      name: "Ada Lovelace",
      department_id: "engineering",
      work_country_code: "GB",
      joining_date: "2024-01-15",
      annual_base_pay: "98000.50",
      salary_currency_code: "GBP",
    },
  });
  expect(created.ok()).toBe(true);

  await page.reload();
  const overview = page.getByRole("region", { name: "Overview" });
  await expect(overview.getByText("All employees")).toBeVisible();
  const row = page.getByRole("row", { name: /Ada Lovelace/ });
  await expect(row).toContainText("E2E-0001");
  await expect(row).toContainText("United Kingdom");
  await expect(row).toContainText("Active");
  await expect(row).toContainText("GBP 98,000.50");
  await expect(page.getByText("1–1 of 1 result")).toBeVisible();
});

test("a wrong password shows an error and stays on the login page", async ({ page }) => {
  await signIn(page, "not-the-demo-password");

  await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password." })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("not-the-demo-password");
});

test("signing out returns to the login page and closes the workspace", async ({ page }) => {
  await signIn(page, DEMO_HR_PASSWORD);
  await expect(page).toHaveURL(/\/employees$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/employees");
  await expect(page).toHaveURL(/\/login$/);
});
