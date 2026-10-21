import { pickDate, pickerTrigger } from "./pickers";
import { expect, test } from "./session";

const grace = {
  id: "E2E-0101",
  name: "Grace Hopper",
  department_id: "engineering",
  work_country_code: "US",
  joining_date: "2024-03-01",
  annual_base_pay: "120000",
  salary_currency_code: "USD",
};

test("adding an employee from the dialog lists them and opens their profile", async ({ page }) => {
  await page.goto("/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  await expect(page).toHaveURL(/\?dialog=create$/);
  const dialog = page.getByRole("dialog", { name: "Add employee" });
  await dialog.getByLabel("Employee ID").fill("E2E-0102");
  await dialog.getByLabel("Full name").fill("Katherine Johnson");
  await dialog.getByLabel("Department").selectOption({ label: "Engineering" });
  await dialog.getByLabel("Work country").selectOption({ label: "Canada" });
  await pickDate(dialog, "Joining date", "2024-05-02");
  await dialog.getByLabel("Annual base pay").fill("101500.25");
  await dialog.getByLabel("Salary currency").selectOption("CAD");
  await dialog.getByRole("button", { name: "Create employee" }).click();

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/employees\?saved=created$/);
  await expect(page.getByRole("status").filter({ hasText: "Employee created." })).toBeVisible();
  const row = page.getByRole("row", { name: /Katherine Johnson/ });
  await expect(row).toContainText("E2E-0102");
  await expect(row).toContainText("CAD 101,500.25");

  await row.getByRole("link", { name: "Katherine Johnson", exact: true }).click();
  await expect(page).toHaveURL(/\/employees\/E2E-0102$/);
  await expect(page.getByRole("heading", { level: 1, name: "Katherine Johnson" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Employees", exact: true })).toHaveAttribute("aria-current", "page");
  const history = page.getByRole("table", { name: "Salary history" });
  await expect(history.getByRole("row", { name: /Initial salary/ })).toContainText("CAD 101,500.25");
});

test("a duplicate employee ID shows the error beside the ID and keeps the entries", async ({ page, api }) => {
  await api.mutate("employees.create", grace);
  await page.goto("/employees");
  await page.getByRole("button", { name: "Add employee" }).click();
  const dialog = page.getByRole("dialog", { name: "Add employee" });
  await dialog.getByLabel("Employee ID").fill(grace.id);
  await dialog.getByLabel("Full name").fill("Someone Else");
  await dialog.getByLabel("Department").selectOption({ label: "Sales" });
  await dialog.getByLabel("Work country").selectOption({ label: "India" });
  await dialog.getByLabel("Annual base pay").fill("900000");
  await dialog.getByLabel("Salary currency").selectOption("INR");
  await dialog.getByRole("button", { name: "Create employee" }).click();

  await expect(dialog.getByText("Employee ID already exists")).toBeVisible();
  await expect(dialog.getByLabel("Employee ID")).toBeFocused();
  await expect(dialog.getByLabel("Full name")).toHaveValue("Someone Else");
  await expect(page).toHaveURL(/\?dialog=create$/);
});

test("editing details sends changes, shows date errors per field and records a departure", async ({ page, api }) => {
  await api.mutate("employees.create", { ...grace, id: "E2E-0103" });
  await page.goto("/employees/E2E-0103");
  await page.getByRole("button", { name: "Edit details" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit details" });
  const save = dialog.getByRole("button", { name: "Save changes" });
  await expect(dialog.getByLabel("Employee ID")).toHaveValue("E2E-0103");
  await expect(save).toBeDisabled();

  await pickDate(dialog, "Last working day · optional", "2024-01-31");
  await save.click();
  await expect(dialog.getByText("Must be on or after the joining date")).toBeVisible();
  await expect(pickerTrigger(dialog, "Last working day · optional")).toBeFocused();

  await pickDate(dialog, "Last working day · optional", "2025-06-30");
  await dialog.getByLabel("Department").selectOption({ label: "Finance" });
  await save.click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status").filter({ hasText: "Employee details saved." })).toBeVisible();
  const details = page.getByRole("region", { name: "Employee details and current pay" });
  await expect(details).toContainText("Finance");
  await expect(details).toContainText("30 Jun 2025");
  await expect(page.getByText("Departed", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Change salary" })).toBeHidden();
});

test("a dialog deep link reopens on reload, Esc closes it and focus returns to the opener", async ({ page, api }) => {
  await api.mutate("employees.create", { ...grace, id: "E2E-0104" });
  await page.goto("/employees/E2E-0104?dialog=edit");
  const dialog = page.getByRole("dialog", { name: "Edit details" });
  await expect(dialog).toBeVisible();
  await page.reload();
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(/\/employees\/E2E-0104$/);

  const opener = page.getByRole("button", { name: "Edit details" });
  await opener.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Full name")).toBeFocused();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test("an unknown employee ID shows the not-found page", async ({ page }) => {
  await page.goto("/employees/E2E-9999");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("a stale directory cursor falls back to the first page", async ({ page, api }) => {
  await api.mutate("employees.create", { ...grace, id: "E2E-0105" });
  await page.goto("/employees?cursor=not-a-real-cursor&employment_status=active");
  await expect(page).toHaveURL(/\/employees\?employment_status=active$/);
  await expect(page.getByRole("row", { name: /E2E-0105/ })).toBeVisible();
  await expect(page.getByText("We couldn’t load these records")).toBeHidden();
});
