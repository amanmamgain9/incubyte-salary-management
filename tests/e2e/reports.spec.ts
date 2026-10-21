import type { Page } from "@playwright/test";
import { expect, test } from "./session";

// The setup project seeds a small generated workforce in GB, DE and SG with salary histories (global-setup.ts).

async function applyFilter(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).selectOption({ label: option });
  await page.getByRole("button", { name: "Apply" }).click();
}

test("salary commitment lists country/currency rows and filters by country", async ({ page }) => {
  await page.goto("/reports/salary-commitment");
  const table = page.getByRole("table", { name: "Salary commitment by country and currency" });
  await expect(table.getByRole("row", { name: /United Kingdom/ })).toContainText("GBP");
  await expect(table.getByRole("row", { name: /Germany/ })).toContainText("EUR");

  await applyFilter(page, "Country", "Germany");
  await expect(page).toHaveURL(/\/reports\/salary-commitment\?work_country_code=DE$/);
  await expect(table.getByRole("row", { name: /United Kingdom/ })).toBeHidden();
  await expect(table.getByRole("row")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Overview" })).toContainText("Germany · All departments");
});

test("department breakdown lists departments and filters by department", async ({ page }) => {
  await page.goto("/reports/department-breakdown");
  const table = page.getByRole("table", { name: "Department breakdown" });
  await expect(table.getByRole("row", { name: /Singapore/ }).first()).toContainText("SGD");

  await applyFilter(page, "Department", "Engineering");
  await expect(page).toHaveURL(/\/reports\/department-breakdown\?department_id=engineering$/);
  const rows = table.getByRole("row");
  await expect(rows.nth(1)).toContainText("Engineering");
  for (const department of ["Sales", "Operations", "Finance", "People"]) {
    await expect(table.getByRole("cell", { name: department, exact: true })).toHaveCount(0);
  }
});

test("salary growth lists monthly changes and filters by country", async ({ page, api }) => {
  // A revision made now falls in the default period (the 12 months ending today), whenever the seed was generated.
  await api.mutate("employees.create", {
    id: "E2E-0302",
    name: "Ada Lovelace",
    department_id: "engineering",
    work_country_code: "GB",
    joining_date: "2024-02-01",
    annual_base_pay: "60000",
    salary_currency_code: "GBP",
  });
  await api.mutate("salaries.update", {
    employee_id: "E2E-0302",
    expected_revision: 1,
    annual_base_pay: "64000",
    salary_currency_code: "GBP",
    reason: "Annual review",
  });
  await page.goto("/reports/salary-growth");
  const table = page.getByRole("table", { name: "Monthly salary changes" });
  await expect(table.getByRole("row").nth(1)).toBeVisible();
  await expect(page.getByRole("region", { name: "Net change trend" })).toBeVisible();

  await applyFilter(page, "Country", "United Kingdom");
  await expect(page).toHaveURL(/\/reports\/salary-growth\?.*work_country_code=GB/);
  await expect(page.getByRole("region", { name: "Overview" })).toContainText("United Kingdom · All departments");
  await expect(table.getByRole("columnheader", { name: "Country" })).toHaveCount(0);
  await expect(table.getByRole("row").nth(1)).toContainText("GBP");
  await expect(table.getByRole("cell", { name: "EUR", exact: true })).toHaveCount(0);
});

test("a reversed growth period shows the error and keeps the URL", async ({ page }) => {
  await page.goto("/reports/salary-growth");
  await page.getByLabel("From date").fill("2026-01-01");
  await page.getByLabel("Through").fill("2025-12-31");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("Must be on or after the start date")).toBeVisible();
  await expect(page).toHaveURL(/\/reports\/salary-growth$/);
});

test("historical benchmark lists month-end rows for 24 months and filters by currency", async ({ page }) => {
  await page.goto("/reports/historical-salary-benchmark");
  const table = page.getByRole("table", { name: "Monthly salary benchmarks" });
  await expect(table.getByRole("row").nth(1)).toBeVisible();
  await expect(page.getByLabel("From month")).not.toHaveValue("");

  await applyFilter(page, "Currency", "SGD · Singapore Dollar");
  await expect(page).toHaveURL(/\/reports\/historical-salary-benchmark\?.*salary_currency_code=SGD/);
  await expect(table.getByRole("columnheader", { name: "Currency" })).toHaveCount(0);
  await expect(table.getByRole("row").nth(1)).toContainText("Singapore");
  await expect(table.getByRole("cell", { name: /Germany|United Kingdom/ })).toHaveCount(0);
});

test("a salary change is reflected in the commitment report", async ({ page, api }) => {
  await api.mutate("employees.create", {
    id: "E2E-0301",
    name: "Marie Curie",
    department_id: "people",
    work_country_code: "FR",
    joining_date: "2024-02-01",
    annual_base_pay: "50000",
    salary_currency_code: "EUR",
  });
  await page.goto("/reports/salary-commitment");
  const france = page.getByRole("row", { name: /France/ });
  await expect(france).toContainText("EUR 50,000.00");

  // Navigate within the app and come back through history: the report renders from the client cache, so only the
  // mutation's invalidation can refresh it.
  await page.getByRole("link", { name: "Employees", exact: true }).click();
  await page.getByRole("link", { name: "Marie Curie", exact: true }).click();
  await page.getByRole("button", { name: "Change salary" }).click();
  const dialog = page.getByRole("dialog", { name: "Change salary" });
  await dialog.getByLabel("New annual base pay").fill("62500");
  await dialog.getByLabel("Reason for change").fill("Promotion");
  await dialog.getByRole("button", { name: "Save salary" }).click();
  await expect(dialog).toBeHidden();

  await page.goBack();
  await page.goBack();
  await expect(page).toHaveURL(/\/reports\/salary-commitment$/);
  await expect(france).toContainText("EUR 62,500.00");
});
