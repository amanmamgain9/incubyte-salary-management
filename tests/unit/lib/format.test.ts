import { describe, expect, it } from "vitest";
import { formatCount, formatDate, formatInitials, formatMoney, formatRange, formatTimestamp } from "@/lib/format";

describe("formatCount", () => {
  it.each([
    [0, "0"],
    [7, "7"],
    [10000, "10,000"],
  ])("formats %d as %j", (count, text) => {
    expect(formatCount(count)).toBe(text);
  });
});

describe("formatMoney", () => {
  it.each([
    ["1234567.5", "INR", "INR 1,234,567.50"],
    ["98000.00", "USD", "USD 98,000.00"],
    ["0.01", "EUR", "EUR 0.01"],
    ["-2500.25", "GBP", "GBP −2,500.25"],
    ["9999999999999999.99", "JPY", "JPY 9,999,999,999,999,999.99"],
  ])("formats %j %s as %j", (amount, currency, text) => {
    expect(formatMoney(amount, currency)).toBe(text);
  });

  it("shows an unreadable amount as given rather than guessing", () => {
    expect(formatMoney("1e5", "USD")).toBe("USD 1e5");
  });
});

describe("formatRange", () => {
  it("shows the first and last position of the page and the total", () => {
    expect(formatRange(51, 50, 10000)).toBe("51–100 of 10,000 results");
  });

  it("handles a short last page and a single result", () => {
    expect(formatRange(9951, 49, 9999)).toBe("9,951–9,999 of 9,999 results");
    expect(formatRange(1, 1, 1)).toBe("1–1 of 1 result");
  });

  it("says there are no results for an empty page", () => {
    expect(formatRange(0, 0, 0)).toBe("No results");
  });
});

describe("formatInitials", () => {
  it.each([
    ["Demo HR Manager", "DH"],
    ["aarav sharma", "AS"],
    ["  Mia   Wong ", "MW"],
    ["Cher", "C"],
    ["", "?"],
    ["   ", "?"],
  ])("formats %j as %j", (name, initials) => {
    expect(formatInitials(name)).toBe(initials);
  });
});

describe("formatDate", () => {
  it.each([
    ["2024-01-15", "15 Jan 2024"],
    ["2024-12-31", "31 Dec 2024"],
    ["2026-10-21T23:59:59.000Z", "21 Oct 2026"],
  ])("formats %j as %j", (date, text) => {
    expect(formatDate(date)).toBe(text);
  });

  it("shows a missing date as a dash", () => {
    expect(formatDate(null)).toBe("—");
  });
});

describe("formatTimestamp", () => {
  it("shows the UTC date and minute", () => {
    expect(formatTimestamp("2024-01-15T10:05:59.999Z")).toBe("15 Jan 2024 · 10:05 UTC");
  });

  it("keeps the UTC date just before midnight", () => {
    expect(formatTimestamp("2024-02-29T23:59:00.000Z")).toBe("29 Feb 2024 · 23:59 UTC");
  });
});
