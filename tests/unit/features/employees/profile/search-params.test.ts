import { describe, expect, it } from "vitest";
import { historyInput, profileSearch } from "@/features/employees/profile/search-params";
import { parseSearchParams } from "@/lib/search-params";

describe("profileSearch", () => {
  it("builds the salaries.history input from the employee ID and the URL cursor", () => {
    const search = parseSearchParams(profileSearch, { cursor: "opaque", dialog: "edit" });
    expect(historyInput("E-1", search)).toEqual({ employee_id: "E-1", cursor: "opaque" });
  });

  it("starts at the first history page without a cursor", () => {
    expect(historyInput("E-1", parseSearchParams(profileSearch, {}))).toEqual({ employee_id: "E-1", cursor: undefined });
  });
});
