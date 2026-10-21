import { describe, expect, it } from "vitest";
import { directorySearch } from "@/features/employees/directory/search-params";
import { parseSearchParams } from "@/lib/search-params";

describe("directorySearch", () => {
  it("builds the employees.list input from the URL", () => {
    expect(
      parseSearchParams(directorySearch, {
        search: "  sha ",
        department_id: "engineering",
        work_country_code: "IN",
        employment_status: "active",
        cursor: "opaque",
      }),
    ).toEqual({
      search: "sha",
      department_id: "engineering",
      work_country_code: "IN",
      employment_status: "active",
      cursor: "opaque",
    });
  });

  it("treats a blank search as no search", () => {
    expect(parseSearchParams(directorySearch, { search: "   " }).search).toBeUndefined();
  });

  it("drops invalid params instead of failing", () => {
    expect(
      parseSearchParams(directorySearch, {
        work_country_code: "india",
        employment_status: "retired",
        search: "x".repeat(101),
      }),
    ).toEqual({});
  });

  it("is empty when the URL has no params", () => {
    expect(parseSearchParams(directorySearch, {})).toEqual({});
  });
});
