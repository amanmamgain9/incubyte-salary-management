import { expect, test } from "./session";

const employee = (id: string) => ({
  id,
  name: "Mary Jackson",
  department_id: "operations",
  work_country_code: "IN",
  joining_date: "2023-07-10",
  annual_base_pay: "1200000.00",
  salary_currency_code: "INR",
});

test("changing salary shows the delta and adds a revision to the history", async ({ page, api }) => {
  await api.mutate("employees.create", employee("E2E-0201"));
  await page.goto("/employees/E2E-0201");
  await page.getByRole("button", { name: "Change salary" }).click();
  await expect(page).toHaveURL(/\?dialog=salary$/);
  const dialog = page.getByRole("dialog", { name: "Change salary" });
  await expect(dialog.getByText("Revision 1")).toBeVisible();
  await dialog.getByLabel("New annual base pay").fill("1350000.50");
  await expect(dialog.getByText("+12.50% · INR 150,000.50 increase")).toBeVisible();
  await dialog.getByLabel("Reason for change").fill("Annual salary review");
  await dialog.getByRole("button", { name: "Save salary" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Salary updated." })).toBeVisible();
  const pay = page.getByRole("region", { name: "Employee details and current pay" });
  await expect(pay).toContainText("INR 1,350,000.50");
  await expect(pay).toContainText("Revision 2");
  const rows = page.getByRole("table", { name: "Salary history" }).getByRole("row");
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(1)).toContainText("Annual salary review");
  await expect(rows.nth(1)).toContainText("INR 1,350,000.50");
  await expect(rows.nth(2)).toContainText("Initial salary");
});

test("a stale revision keeps the entries and saves after reloading the current salary", async ({ page, api }) => {
  await api.mutate("employees.create", employee("E2E-0202"));
  await page.goto("/employees/E2E-0202?dialog=salary");
  const dialog = page.getByRole("dialog", { name: "Change salary" });
  await dialog.getByLabel("New annual base pay").fill("1300000");
  await dialog.getByLabel("Reason for change").fill("Promotion");
  // Someone else changes the salary while the form is open.
  await api.mutate("salaries.update", {
    employee_id: "E2E-0202",
    expected_revision: 1,
    annual_base_pay: "1250000.00",
    salary_currency_code: "INR",
    reason: "Correction",
  });
  await dialog.getByRole("button", { name: "Save salary" }).click();

  await expect(dialog.getByRole("alert")).toContainText("The salary changed since this form opened");
  await expect(dialog.getByLabel("New annual base pay")).toHaveValue("1300000");
  await dialog.getByRole("button", { name: "Reload current salary" }).click();
  await expect(dialog.getByText("Revision 2")).toBeVisible();
  await expect(dialog.getByText("INR 1,250,000.00")).toBeVisible();
  await expect(dialog.getByRole("alert")).toBeHidden();
  await expect(dialog.getByLabel("Reason for change")).toHaveValue("Promotion");

  await dialog.getByRole("button", { name: "Save salary" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("region", { name: "Employee details and current pay" })).toContainText("Revision 3");
});
