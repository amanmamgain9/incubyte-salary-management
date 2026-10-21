// Steps for the shared <DatePicker>: open the field by its label, jump to the month with the dropdowns and pick the
// day by its accessible name (the app's date format, e.g. "2 May 2024").
import { expect, type Locator, type Page } from "@playwright/test";
import { formatDate } from "@/lib/format";

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The picker's trigger: a button named by its field label, then the picked value. */
export function pickerTrigger(scope: Page | Locator, label: string): Locator {
  return scope.getByRole("button", { name: new RegExp(`^${escape(label)} `) });
}

function pageOf(scope: Page | Locator): Page {
  return "goto" in scope ? scope : scope.page();
}

/** Picks `date` (`YYYY-MM-DD`) in the date picker labelled `label`. */
export async function pickDate(scope: Page | Locator, label: string, date: string): Promise<void> {
  await pickerTrigger(scope, label).click();
  const calendar = pageOf(scope).getByRole("dialog", { name: "Choose date" });
  await calendar.getByRole("combobox", { name: "Choose the Year" }).selectOption(date.slice(0, 4));
  await calendar.getByRole("combobox", { name: "Choose the Month" }).selectOption(String(Number(date.slice(5, 7)) - 1));
  await calendar.getByRole("button", { name: new RegExp(`^${escape(formatDate(date))}(,|$)`) }).click();
  await expect(calendar).toBeHidden();
}
