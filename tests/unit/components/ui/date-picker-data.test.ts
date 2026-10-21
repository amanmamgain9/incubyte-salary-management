import { describe, expect, it } from "vitest";
import { calendarRange, openingDate } from "@/components/ui/date-picker-data";

const today = "2026-10-21";

describe("calendarRange", () => {
  it("spans the bounds when both are set", () => {
    expect(calendarRange({ value: "", min: "2020-01-01", max: today, today })).toEqual({
      start: "2020-01-01",
      end: today,
    });
  });

  it("reaches whole years around today when unbounded", () => {
    expect(calendarRange({ value: "", today })).toEqual({ start: "1966-01-01", end: "2036-12-31" });
  });

  it("widens to include a picked date far from today", () => {
    expect(calendarRange({ value: "1950-04-02", today })).toEqual({ start: "1890-01-01", end: "2036-12-31" });
  });

  it("ignores a value that is not a date", () => {
    expect(calendarRange({ value: "soon", max: today, today })).toEqual({ start: "1966-01-01", end: today });
  });
});

describe("openingDate", () => {
  it("opens on the picked date", () => {
    expect(openingDate({ value: "2024-05-02", max: today, today })).toBe("2024-05-02");
  });

  it("opens on today without a picked date", () => {
    expect(openingDate({ value: "", today })).toBe(today);
  });

  it("moves today into the bounds", () => {
    expect(openingDate({ value: "", max: "2025-12-31", today })).toBe("2025-12-31");
    expect(openingDate({ value: "", min: "2027-01-01", today })).toBe("2027-01-01");
  });
});
