import { describe, expect, it } from "vitest";
import { detailsValues, toDetailsPatch } from "@/features/employees/details-patch";

const employee = {
  name: "Ada Lovelace",
  department_id: "engineering",
  work_country_code: "GB",
  joining_date: "2024-01-15",
  last_working_day: null,
};

describe("detailsValues", () => {
  it("shows no last working day as an empty input", () => {
    expect(detailsValues(employee).last_working_day).toBe("");
  });

  it("keeps a recorded last working day", () => {
    expect(detailsValues({ ...employee, last_working_day: "2026-03-31" }).last_working_day).toBe("2026-03-31");
  });
});

describe("toDetailsPatch", () => {
  it("sends only the changed fields", () => {
    expect(toDetailsPatch({ name: "Ada King" })).toEqual({ name: "Ada King" });
  });

  it("sends a cleared last working day as null", () => {
    expect(toDetailsPatch({ last_working_day: "" })).toEqual({ last_working_day: null });
  });

  it("sends a new last working day as the date", () => {
    expect(toDetailsPatch({ joining_date: "2024-02-01", last_working_day: "2026-03-31" })).toEqual({
      joining_date: "2024-02-01",
      last_working_day: "2026-03-31",
    });
  });

  it("sends nothing when nothing changed", () => {
    expect(toDetailsPatch({})).toEqual({});
  });
});
