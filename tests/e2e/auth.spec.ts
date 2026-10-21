import { expect, test } from "@playwright/test";
import { callMutation, signIn } from "./session";

test("signing in opens the employee directory", async ({ page, baseURL }) => {
  await page.goto("/employees");
  await expect(page).toHaveURL(/\/login$/);

  await signIn(page);
  await expect(page).toHaveURL(/\/employees$/);
  await expect(page.getByRole("heading", { level: 1, name: "Employees" })).toBeVisible();
  // The setup project seeded 24 generated employees (global-setup.ts).
  await expect(page.getByText("1–24 of 24 results")).toBeVisible();

  // The browser's session cookie authorises the API call; mutations must come from the app origin.
  await callMutation(page.request, baseURL ?? "", "employees.create", {
    id: "E2E-0001",
    name: "Ada Lovelace",
    department_id: "engineering",
    work_country_code: "GB",
    joining_date: "2024-01-15",
    annual_base_pay: "98000.50",
    salary_currency_code: "GBP",
  });

  await page.reload();
  const overview = page.getByRole("region", { name: "Overview" });
  await expect(overview.getByText("All employees")).toBeVisible();
  const row = page.getByRole("row", { name: /Ada Lovelace/ });
  await expect(row).toContainText("E2E-0001");
  await expect(row).toContainText("United Kingdom");
  await expect(row).toContainText("Active");
  await expect(row).toContainText("GBP 98,000.50");
  await expect(page.getByText("1–25 of 25 results")).toBeVisible();
});

test("a wrong password shows an error and stays on the login page", async ({ page }) => {
  await signIn(page, "not-the-demo-password");

  await expect(page.getByRole("alert").filter({ hasText: "Incorrect email or password." })).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Password", { exact: true })).toHaveValue("not-the-demo-password");
});

test("signing out returns to the login page and closes the workspace", async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/employees$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/employees");
  await expect(page).toHaveURL(/\/login$/);
});

test("the demo credentials copy to the clipboard", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/login");
  await page.getByRole("button", { name: "Copy password" }).click();
  await expect(page.getByRole("button", { name: "Password copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied.length).toBeGreaterThan(0);
  await expect(page.getByText(copied, { exact: true })).toBeVisible();
});
