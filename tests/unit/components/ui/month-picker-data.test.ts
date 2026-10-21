import { describe, expect, it } from "vitest";
import { monthAfterKey, monthCells, openingMonth } from "@/components/ui/month-picker-data";

const today = "2026-10-21";

describe("monthCells", () => {
  it("lists the year's twelve months as first days", () => {
    const cells = monthCells(2025, { value: "", today });
    expect(cells.map((cell) => cell.month)).toEqual([
      "2025-01-01",
      "2025-02-01",
      "2025-03-01",
      "2025-04-01",
      "2025-05-01",
      "2025-06-01",
      "2025-07-01",
      "2025-08-01",
      "2025-09-01",
      "2025-10-01",
      "2025-11-01",
      "2025-12-01",
    ]);
  });

  it("disables months after the month of `max`, keeping that month", () => {
    const cells = monthCells(2026, { value: "", max: today, today });
    expect(cells.filter((cell) => cell.disabled).map((cell) => cell.month)).toEqual(["2026-11-01", "2026-12-01"]);
  });

  it("disables months before the month of `min`", () => {
    const cells = monthCells(2020, { value: "", min: "2020-03-15", today });
    expect(cells.filter((cell) => cell.disabled).map((cell) => cell.month)).toEqual(["2020-01-01", "2020-02-01"]);
  });

  it("marks the picked month and today's month", () => {
    const cells = monthCells(2026, { value: "2026-02-01", today });
    expect(cells.filter((cell) => cell.selected).map((cell) => cell.month)).toEqual(["2026-02-01"]);
    expect(cells.filter((cell) => cell.current).map((cell) => cell.month)).toEqual(["2026-10-01"]);
  });
});

describe("openingMonth", () => {
  it("opens on the picked month", () => {
    expect(openingMonth({ value: "2024-11-01", max: today, today })).toBe("2024-11-01");
  });

  it("opens on today's month, moved into the bounds", () => {
    expect(openingMonth({ value: "", today })).toBe("2026-10-01");
    expect(openingMonth({ value: "", max: "2025-06-30", today })).toBe("2025-06-01");
  });
});

describe("monthAfterKey", () => {
  it("moves by a month, a row of three or a year", () => {
    expect(monthAfterKey("2025-05-01", "ArrowLeft", {})).toBe("2025-04-01");
    expect(monthAfterKey("2025-12-01", "ArrowRight", {})).toBe("2026-01-01");
    expect(monthAfterKey("2025-02-01", "ArrowUp", {})).toBe("2024-11-01");
    expect(monthAfterKey("2025-05-01", "ArrowDown", {})).toBe("2025-08-01");
    expect(monthAfterKey("2025-05-01", "PageUp", {})).toBe("2024-05-01");
    expect(monthAfterKey("2025-05-01", "PageDown", {})).toBe("2026-05-01");
  });

  it("jumps to the year's first or last month", () => {
    expect(monthAfterKey("2025-05-01", "Home", {})).toBe("2025-01-01");
    expect(monthAfterKey("2025-05-01", "End", {})).toBe("2025-12-01");
  });

  it("stops at the bounds", () => {
    expect(monthAfterKey("2026-10-01", "ArrowRight", { max: today })).toBe("2026-10-01");
    expect(monthAfterKey("2026-05-01", "PageDown", { max: today })).toBe("2026-10-01");
    expect(monthAfterKey("2020-02-01", "PageUp", { min: "2020-01-31" })).toBe("2020-01-01");
  });

  it("ignores other keys", () => {
    expect(monthAfterKey("2025-05-01", "Enter", {})).toBeNull();
    expect(monthAfterKey("2025-05-01", "a", {})).toBeNull();
  });
});
