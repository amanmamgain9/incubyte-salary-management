import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  clampDate,
  daysBetween,
  fromCalendarDate,
  isIsoDate,
  monthEnd,
  monthsBetween,
  monthStart,
  toCalendarDate,
  todayUtc,
} from "@/lib/dates";

describe("todayUtc", () => {
  it("returns the UTC calendar date, not the local one", () => {
    expect(todayUtc(new Date("2026-03-31T23:30:00-05:00"))).toBe("2026-04-01");
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
  });
});

describe("daysBetween", () => {
  it("counts whole days, negative when the end is earlier", () => {
    expect(daysBetween("2024-02-28", "2024-03-01")).toBe(2);
    expect(daysBetween("2026-01-10", "2026-01-01")).toBe(-9);
  });
});

describe("addMonths", () => {
  it("clamps to the last day of a shorter month", () => {
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2025-01-31", 1)).toBe("2025-02-28");
  });

  it("moves across years in both directions", () => {
    expect(addMonths("2026-10-21", -180)).toBe("2011-10-21");
    expect(addMonths("2025-11-15", 3)).toBe("2026-02-15");
  });
});

describe("month bounds", () => {
  it("returns the first and last day of the month", () => {
    expect(monthStart("2024-02-17")).toBe("2024-02-01");
    expect(monthEnd("2024-02-17")).toBe("2024-02-29");
    expect(monthEnd("2025-12-03")).toBe("2025-12-31");
  });
});

describe("monthsBetween", () => {
  it("counts calendar months between the two dates' months", () => {
    expect(monthsBetween("2026-01-31", "2026-02-01")).toBe(1);
    expect(monthsBetween("2011-10-01", "2026-09-30")).toBe(179);
    expect(monthsBetween("2026-03-01", "2025-03-31")).toBe(-12);
  });
});

describe("isIsoDate", () => {
  it("accepts real calendar dates", () => {
    expect(isIsoDate("2024-02-29")).toBe(true);
    expect(isIsoDate("2026-12-31")).toBe(true);
  });

  it("rejects impossible dates, other formats and blanks", () => {
    expect(isIsoDate("2025-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("2026-10")).toBe(false);
    expect(isIsoDate("21/10/2026")).toBe(false);
    expect(isIsoDate("")).toBe(false);
  });
});

describe("clampDate", () => {
  it("moves a date into the bounds", () => {
    expect(clampDate("2026-11-01", { max: "2026-10-21" })).toBe("2026-10-21");
    expect(clampDate("2019-01-01", { min: "2020-01-01", max: "2026-10-21" })).toBe("2020-01-01");
  });

  it("keeps a date inside the bounds or without them", () => {
    expect(clampDate("2025-06-30", { min: "2020-01-01", max: "2026-10-21" })).toBe("2025-06-30");
    expect(clampDate("2025-06-30", {})).toBe("2025-06-30");
  });
});

describe("toCalendarDate / fromCalendarDate", () => {
  it("maps an ISO date to that local day and back", () => {
    const date = toCalendarDate("2024-02-29");
    expect([date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()]).toEqual([2024, 1, 29, 0]);
    expect(fromCalendarDate(date)).toBe("2024-02-29");
  });

  it("round-trips year ends and single-digit days", () => {
    for (const day of ["2025-12-31", "2026-01-01", "2026-03-05"]) expect(fromCalendarDate(toCalendarDate(day))).toBe(day);
  });
});
