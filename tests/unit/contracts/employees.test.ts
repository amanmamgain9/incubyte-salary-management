import { describe, expect, it } from "vitest";
import { employmentStatusFor, UpdateEmployeeInput } from "@/contracts/employees";

const issuesOf = (input: unknown) =>
  UpdateEmployeeInput.safeParse(input).error?.issues.map(({ path, message }) => ({ path, message }));

describe("UpdateEmployeeInput", () => {
  it("accepts one changed field beside the ID", () => {
    expect(UpdateEmployeeInput.parse({ id: "E-0001", name: "Asha Rao" })).toEqual({ id: "E-0001", name: "Asha Rao" });
  });

  it("accepts null to clear the last working day", () => {
    expect(UpdateEmployeeInput.parse({ id: "E-0001", last_working_day: null })).toEqual({
      id: "E-0001",
      last_working_day: null,
    });
  });

  it("rejects an ID without any changed field as an input-level issue", () => {
    expect(issuesOf({ id: "E-0001" })).toEqual([{ path: [], message: "Change at least one field" }]);
  });

  it("rejects details nested under a patch object", () => {
    expect(issuesOf({ id: "E-0001", patch: { name: "Asha Rao" } })).toEqual([
      { path: [], message: "Change at least one field" },
    ]);
  });

  it("rejects an impossible date, keyed by its field", () => {
    expect(issuesOf({ id: "E-0001", joining_date: "2025-02-30" })).toEqual([
      { path: ["joining_date"], message: "Use a valid date (YYYY-MM-DD)" },
    ]);
  });

  it("rejects a blank name", () => {
    expect(issuesOf({ id: "E-0001", name: "   " })).toEqual([{ path: ["name"], message: "Enter a name" }]);
  });

  it("rejects salary fields, which change only through salaries.update", () => {
    expect(issuesOf({ id: "E-0001", annual_base_pay: "1.00" })).toEqual([
      { path: [], message: "Change at least one field" },
    ]);
  });
});

describe("employmentStatusFor", () => {
  const today = "2026-10-21";

  it.each([
    ["joins tomorrow", { joining_date: "2026-10-22", last_working_day: null }, "upcoming"],
    ["joins today", { joining_date: "2026-10-21", last_working_day: null }, "active"],
    ["leaves today", { joining_date: "2024-01-15", last_working_day: "2026-10-21" }, "active"],
    ["left yesterday", { joining_date: "2024-01-15", last_working_day: "2026-10-20" }, "departed"],
    ["joins and leaves in the future", { joining_date: "2026-11-01", last_working_day: "2026-12-31" }, "upcoming"],
  ] as const)("is %s → %s", (_case, dates, status) => {
    expect(employmentStatusFor(dates, today)).toBe(status);
  });
});
