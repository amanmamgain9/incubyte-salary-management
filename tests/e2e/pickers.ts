// Steps for the shared <DatePicker> and <MonthPicker>: open the field by its label, jump to the month or year, and
// pick the day or month by its accessible name (the app's date format, e.g. "2 May 2024" / "May 2024").
import { expect, type Locator, type Page } from "@playwright/test";
import { formatDate, formatMonth } from "@/lib/format";

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

/** Picks `month` (`YYYY-MM`) in the month picker labelled `label`. */
export async function pickMonth(scope: Page | Locator, label: string, month: string): Promise<void> {
  await pickerTrigger(scope, label).click();
  const calendar = pageOf(scope).getByRole("dialog", { name: "Choose month" });
  const target = Number(month.slice(0, 4));
  const months = calendar.getByRole("group");
  for (let shown = Number((await months.getAttribute("aria-label"))?.slice(-4)); shown !== target; ) {
    await calendar.getByRole("button", { name: shown > target ? /^Previous year/ : /^Next year/ }).click();
    shown += shown > target ? -1 : 1;
    await expect(months).toHaveAttribute("aria-label", `Months of ${shown}`);
  }
  await calendar.getByRole("button", { name: new RegExp(`^${escape(formatMonth(month))}(,|$)`) }).click();
  await expect(calendar).toBeHidden();
}
