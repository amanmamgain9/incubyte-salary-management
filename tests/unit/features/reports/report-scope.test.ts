import { describe, expect, it } from "vitest";
import { reportScope } from "@/features/reports/report-scope";

const names = {
  countryName: (code: string) => ({ IN: "India" })[code] ?? code,
  departmentName: (id: string) => ({ engineering: "Engineering" })[id] ?? id,
};

describe("reportScope", () => {
  it("names every dimension as all when no filter is set", () => {
    expect(reportScope({}, names)).toBe("All countries · All departments");
  });

  it("names the filtered country, department and currency", () => {
    expect(
      reportScope({ work_country_code: "IN", department_id: "engineering", salary_currency_code: "USD" }, names),
    ).toBe("India · Engineering · USD");
  });
});
