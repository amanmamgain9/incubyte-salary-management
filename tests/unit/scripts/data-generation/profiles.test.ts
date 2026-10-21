import { describe, expect, it } from "vitest";
import { NAME_POOLS } from "@scripts/data-generation/names";
import {
  COUNTRY_PROFILES,
  DEPARTMENT_IDS,
  PAY_MIDPOINTS,
  SEED_LOOKUPS,
  TENURE_BANDS,
} from "@scripts/data-generation/profiles";

const sum = (values: readonly number[]) => values.reduce((a, b) => a + b, 0);
const active = (profile: (typeof COUNTRY_PROFILES)[number]) => sum(profile.activeByTenure);

describe("population profiles", () => {
  it("cover exactly the seeded countries, departments and currencies", () => {
    expect(COUNTRY_PROFILES.map((profile) => profile.code)).toEqual(SEED_LOOKUPS.countries.map((country) => country.code));
    expect([...DEPARTMENT_IDS]).toEqual(SEED_LOOKUPS.departments.map((department) => department.id));
    const currencies = new Set(Object.keys(PAY_MIDPOINTS).map((key) => key.slice(3)));
    expect([...currencies].sort()).toEqual(SEED_LOOKUPS.currencies.map((currency) => currency.code).sort());
  });

  it("add up to 10,000 employees: 9,000 active, 900 departed and 100 upcoming", () => {
    expect(sum(COUNTRY_PROFILES.map((profile) => profile.total))).toBe(10_000);
    expect(sum(COUNTRY_PROFILES.map(active))).toBe(9_000);
    expect(sum(COUNTRY_PROFILES.map((profile) => profile.departed))).toBe(900);
    expect(sum(COUNTRY_PROFILES.map((profile) => profile.upcoming))).toBe(100);
    for (const profile of COUNTRY_PROFILES) {
      expect(active(profile) + profile.departed + profile.upcoming).toBe(profile.total);
    }
  });

  it("split active employees into the tenure quotas 1,800 / 2,250 / 2,250 / 1,800 / 900", () => {
    const byBand = TENURE_BANDS.map((_, band) => sum(COUNTRY_PROFILES.map((profile) => profile.activeByTenure[band] ?? 0)));
    expect(byBand).toEqual([1800, 2250, 2250, 1800, 900]);
  });

  it("keep offices opened within five years free of longer service", () => {
    for (const profile of COUNTRY_PROFILES.filter((p) => p.openedMonthsAgo !== null)) {
      expect(profile.openedMonthsAgo).toBeLessThan(60);
      expect(profile.activeByTenure.slice(3)).toEqual([0, 0]);
    }
  });

  it("give every country a pay band in its main currency and a name pool", () => {
    for (const profile of COUNTRY_PROFILES) {
      expect(PAY_MIDPOINTS[`${profile.code}:${profile.currency}`]).toBeDefined();
      expect(NAME_POOLS[profile.code].first.length).toBeGreaterThan(5);
    }
  });
});
