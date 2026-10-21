import { describe, expect, it } from "vitest";
import { UpdateEmployeeInput } from "@/contracts/employees";

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
