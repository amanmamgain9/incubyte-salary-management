import { addDays, todayUtc } from "@/lib/dates";
import { formatDate } from "@/lib/format";
import { pickerTrigger, pickMonth } from "./pickers";
import { expect, test } from "./session";

const grace = {
  id: "E2E-0106",
  name: "Grace Hopper",
  department_id: "engineering",
  work_country_code: "US",
  joining_date: "2024-03-01",
  annual_base_pay: "120000",
  salary_currency_code: "USD",
};

test("the date picker works by keyboard inside a dialog, closes alone on Esc and clears", async ({ page, api }) => {
  await api.mutate("employees.create", grace);
  await page.goto(`/employees/${grace.id}?dialog=edit`);
  const dialog = page.getByRole("dialog", { name: "Edit details" });
  const trigger = pickerTrigger(dialog, "Last working day · optional");
  const calendar = page.getByRole("dialog", { name: "Choose date" });
  const save = dialog.getByRole("button", { name: "Save changes" });

  await trigger.click();
  await expect(calendar.getByRole("button", { name: /, today$/ })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(calendar).toBeHidden();
  await expect(trigger).toHaveText(formatDate(addDays(todayUtc(new Date()), 1)));
  await expect(trigger).toBeFocused();
  await expect(save).toBeEnabled();

  await trigger.click();
  await expect(calendar).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(calendar).toBeHidden();
  await expect(dialog).toBeVisible();
  await expect(trigger).toBeFocused();

  await dialog.getByRole("button", { name: "Clear Last working day · optional" }).click();
  await expect(trigger).toHaveText("Select a date");
  await expect(trigger).toBeFocused();
  await expect(save).toBeDisabled();
});

test("the month picker applies a month as its first day and stops at this month", async ({ page }) => {
  await page.goto("/reports/historical-salary-benchmark");
  await pickMonth(page, "From month", "2025-03");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page).toHaveURL(/\/reports\/historical-salary-benchmark\?.*from=2025-03-01/);
  const table = page.getByRole("table", { name: "Monthly salary benchmarks" });
  await expect(table.getByRole("row").nth(1)).toContainText("Mar 2025");

  await pickerTrigger(page, "From month").click();
  const calendar = page.getByRole("dialog", { name: "Choose month" });
  await expect(calendar.getByRole("button", { name: "Mar 2025" })).toBeFocused();
  for (let year = 2025; year <= Number(todayUtc(new Date()).slice(0, 4)); year += 1) await page.keyboard.press("PageDown");
  await expect(calendar.getByRole("button", { name: /, this month$/ })).toBeFocused();
  await expect(calendar.getByRole("button", { name: /^Next year/ })).toHaveAttribute("aria-disabled", "true");
});

test("an open calendar fits a phone screen without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/reports/salary-growth");
  await pickerTrigger(page, "Through").click();
  const box = await page.getByRole("dialog", { name: "Choose date" }).boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(375);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
