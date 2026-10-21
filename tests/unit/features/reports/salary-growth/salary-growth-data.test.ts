import { describe, expect, it } from "vitest";
import { trendGroups } from "@/features/reports/salary-growth/salary-growth-data";

describe("trendGroups", () => {
  it("splits the trend into one series per country and currency, keeping month order", () => {
    const groups = trendGroups([
      { month: "2026-09", work_country_code: "IN", salary_currency_code: "INR", net_change: "1500.00" },
      { month: "2026-10", work_country_code: "IN", salary_currency_code: "INR", net_change: "-250.50" },
      { month: "2026-09", work_country_code: "IN", salary_currency_code: "USD", net_change: "0.00" },
      { month: "2026-10", work_country_code: "IN", salary_currency_code: "USD", net_change: "100.00" },
    ]);
    expect(groups.map((group) => [group.work_country_code, group.salary_currency_code, group.bars.length])).toEqual([
      ["IN", "INR", 2],
      ["IN", "USD", 2],
    ]);
    expect(groups[0]?.bars).toEqual([
      { label: "Sep ’26", value: 1500, display: "Sep 2026: INR 1,500.00", tone: "increase" },
      { label: "Oct ’26", value: -250.5, display: "Oct 2026: INR −250.50", tone: "decrease" },
    ]);
  });

  it("returns no series for an empty trend", () => {
    expect(trendGroups([])).toEqual([]);
  });
});
