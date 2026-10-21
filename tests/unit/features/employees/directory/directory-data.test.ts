import { describe, expect, it } from "vitest";
import { directoryScope, employmentMix, hasDirectoryFilters } from "@/features/employees/directory/directory-data";

const names = {
  countryName: (code: string) => ({ IN: "India" })[code] ?? code,
  departmentName: (id: string) => ({ engineering: "Engineering" })[id] ?? id,
};

describe("employmentMix", () => {
  it("splits matching employees into active, departed and upcoming shares", () => {
    const summary = { employee_count: 8, active_count: 6, departed_count: 1, upcoming_count: 1, country_count: 2 };
    expect(employmentMix(summary)).toEqual([
      { status: "active", label: "Active", count: 6, percent: 75 },
      { status: "departed", label: "Departed", count: 1, percent: 12.5 },
      { status: "upcoming", label: "Upcoming", count: 1, percent: 12.5 },
    ]);
  });

  it("is all zeros when nobody matches", () => {
    const summary = { employee_count: 0, active_count: 0, departed_count: 0, upcoming_count: 0, country_count: 0 };
    expect(employmentMix(summary).map(({ count, percent }) => [count, percent])).toEqual([
      [0, 0],
      [0, 0],
      [0, 0],
    ]);
  });
});

describe("hasDirectoryFilters", () => {
  it("ignores the cursor", () => {
    expect(hasDirectoryFilters({ cursor: "abc" })).toBe(false);
    expect(hasDirectoryFilters({ employment_status: "departed" })).toBe(true);
  });
});

describe("directoryScope", () => {
  it("says all employees without filters", () => {
    expect(directoryScope({ cursor: "abc" }, names)).toBe("All employees");
  });

  it("names every active filter by its display name", () => {
    expect(
      directoryScope(
        { work_country_code: "IN", department_id: "engineering", employment_status: "active", search: "sha" },
        names,
      ),
    ).toBe("India · Engineering · Active · “sha”");
  });
});
