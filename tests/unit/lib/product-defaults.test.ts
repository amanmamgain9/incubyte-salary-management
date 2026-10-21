import { describe, expect, it } from "vitest";
import { defaultBenchmarkPeriod, defaultGrowthPeriod } from "@/lib/product-defaults";

describe("defaultGrowthPeriod", () => {
  it("covers the 12 months ending this month, through today", () => {
    expect(defaultGrowthPeriod("2026-10-21")).toEqual({ from: "2025-11-01", to: "2026-10-21" });
  });

  it("starts in the same month a year earlier when today is a month end", () => {
    expect(defaultGrowthPeriod("2024-03-31")).toEqual({ from: "2023-04-01", to: "2024-03-31" });
  });
});

describe("defaultBenchmarkPeriod", () => {
  it("covers the 24 months ending this month, with today as the final snapshot", () => {
    expect(defaultBenchmarkPeriod("2026-10-21")).toEqual({ from: "2024-11-01", to: "2026-10-21" });
  });

  it("crosses year boundaries from January", () => {
    expect(defaultBenchmarkPeriod("2026-01-01")).toEqual({ from: "2024-02-01", to: "2026-01-01" });
  });
});
