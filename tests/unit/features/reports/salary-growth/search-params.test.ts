import { describe, expect, it } from "vitest";
import { salaryGrowthSearch } from "@/features/reports/salary-growth/search-params";
import { parseSearchParams } from "@/lib/search-params";

const today = "2026-10-21";

describe("salaryGrowthSearch", () => {
  it("defaults to the 12 months ending today", () => {
    expect(parseSearchParams(salaryGrowthSearch(today), {})).toMatchObject({ from: "2025-11-01", to: today });
  });

  it("keeps a valid period and the filters", () => {
    expect(
      parseSearchParams(salaryGrowthSearch(today), { from: "2026-01-15", to: "2026-03-31", work_country_code: "DE" }),
    ).toMatchObject({ from: "2026-01-15", to: "2026-03-31", work_country_code: "DE" });
  });

  it("falls back to the default period when it is reversed or ends after today", () => {
    expect(parseSearchParams(salaryGrowthSearch(today), { from: "2026-05-01", to: "2026-04-01" })).toMatchObject({
      from: "2025-11-01",
      to: today,
    });
    expect(parseSearchParams(salaryGrowthSearch(today), { from: "2026-05-01", to: "2026-10-22" })).toMatchObject({
      from: "2025-11-01",
      to: today,
    });
  });

  it("replaces an impossible date with its default", () => {
    expect(parseSearchParams(salaryGrowthSearch(today), { from: "2026-02-30", to: "2026-09-30" })).toMatchObject({
      from: "2025-11-01",
      to: "2026-09-30",
    });
  });
});
