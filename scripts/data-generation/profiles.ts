// Synthetic population profiles (docs/data-generation.md). Pure data: no database or env access.
// Salary bands and review patterns are fictional.
import type { Country, Currency, Department } from "@/contracts/lookups";

/** The seeded lookups: 7 work countries, 6 salary currencies and 5 shared departments. */
export const SEED_LOOKUPS: { countries: Country[]; currencies: Currency[]; departments: Department[] } = {
  countries: [
    { code: "IN", name: "India" },
    { code: "US", name: "United States" },
    { code: "GB", name: "United Kingdom" },
    { code: "DE", name: "Germany" },
    { code: "FR", name: "France" },
    { code: "CA", name: "Canada" },
    { code: "SG", name: "Singapore" },
  ],
  currencies: [
    { code: "INR", name: "Indian Rupee" },
    { code: "USD", name: "US Dollar" },
    { code: "GBP", name: "British Pound" },
    { code: "EUR", name: "Euro" },
    { code: "CAD", name: "Canadian Dollar" },
    { code: "SGD", name: "Singapore Dollar" },
  ],
  departments: [
    { id: "engineering", name: "Engineering" },
    { id: "sales", name: "Sales" },
    { id: "operations", name: "Operations" },
    { id: "finance", name: "Finance" },
    { id: "people", name: "People" },
  ],
};

export type CountryCode = "IN" | "US" | "GB" | "DE" | "FR" | "CA" | "SG";
export type CurrencyCode = "INR" | "USD" | "GBP" | "EUR" | "CAD" | "SGD";
export const DEPARTMENT_IDS = ["engineering", "sales", "operations", "finance", "people"] as const;
export type DepartmentId = (typeof DEPARTMENT_IDS)[number];

/** Completed-service bands at `as_of` (or at the last working day for leavers): `[minYears, maxYears)`. */
export const TENURE_BANDS = [
  { minYears: 0, maxYears: 1, entries: [1, 2] },
  { minYears: 1, maxYears: 3, entries: [2, 4] },
  { minYears: 3, maxYears: 5, entries: [3, 6] },
  { minYears: 5, maxYears: 10, entries: [5, 10] },
  { minYears: 10, maxYears: 15, entries: [8, 15] },
] as const;

/** History never reaches further back than this from `as_of`. */
export const HISTORY_YEARS = 15;

export type ReviewProfile = {
  /** Calendar months (1–12) of regular reviews. */
  months: readonly number[];
  /** Each employee is reviewed in one of `months` (staggered cohorts) instead of all of them. */
  cohorts: boolean;
  /** Chance an eligible employee is reviewed at an occurrence; the rest are skipped reviews. */
  chance: number;
  raiseBp: readonly [number, number];
  /** Chance a review is a promotion instead. */
  promotionChance: number;
  promotionBp: readonly [number, number];
  /** Extra months with targeted promotions only (spikes), and their chance per employee. */
  promotionMonths: readonly number[];
  promotionMonthChance: number;
  /** Calendar months with no salary revisions at all (quiet months). */
  quietMonths: readonly number[];
  /** A one-off correction period this many months before `as_of`'s month: decreases for a share of employees. */
  correction: { monthsAgo: number; chance: number; decreaseBp: readonly [number, number] } | null;
};

export type CountryProfile = {
  code: CountryCode;
  currency: CurrencyCode;
  total: number;
  upcoming: number;
  departed: number;
  /** Active employees at `as_of` per TENURE_BANDS entry. */
  activeByTenure: readonly [number, number, number, number, number];
  /** Office opening, in months before `as_of`; nobody joins earlier. Null for offices older than the history. */
  openedMonthsAgo: number | null;
  /** Relative department headcount weights. */
  departmentWeights: Readonly<Record<DepartmentId, number>>;
  /** Yearly pay-band growth in basis points: initial salaries further back start lower. */
  bandGrowthBp: number;
  review: ReviewProfile;
};

const noSpikes = { promotionMonths: [], promotionMonthChance: 0, quietMonths: [], correction: null } as const;

export const COUNTRY_PROFILES: readonly CountryProfile[] = [
  {
    code: "IN", currency: "INR", total: 3500, upcoming: 40, departed: 330,
    activeByTenure: [720, 960, 780, 450, 220], openedMonthsAgo: null,
    departmentWeights: { engineering: 50, sales: 12, operations: 22, finance: 8, people: 8 }, bandGrowthBp: 500,
    // Broad April review spike with large raises.
    review: { months: [4], cohorts: false, chance: 0.9, raiseBp: [600, 1200], promotionChance: 0.08, promotionBp: [1200, 2000], ...noSpikes },
  },
  {
    code: "US", currency: "USD", total: 2200, upcoming: 18, departed: 200,
    activeByTenure: [300, 360, 470, 532, 320], openedMonthsAgo: null,
    departmentWeights: { engineering: 38, sales: 28, operations: 14, finance: 12, people: 8 }, bandGrowthBp: 300,
    // Staggered quarterly cohorts.
    review: { months: [1, 4, 7, 10], cohorts: true, chance: 0.85, raiseBp: [300, 500], promotionChance: 0.06, promotionBp: [1000, 1500], ...noSpikes },
  },
  {
    code: "GB", currency: "GBP", total: 1300, upcoming: 10, departed: 120,
    activeByTenure: [190, 210, 300, 330, 140], openedMonthsAgo: null,
    departmentWeights: { engineering: 30, sales: 25, operations: 20, finance: 17, people: 8 }, bandGrowthBp: 250,
    // Modest annual April reviews; August and December stay quiet.
    review: {
      months: [4], cohorts: false, chance: 0.85, raiseBp: [200, 400], promotionChance: 0.04, promotionBp: [800, 1200],
      ...noSpikes, quietMonths: [8, 12],
    },
  },
  {
    code: "DE", currency: "EUR", total: 1200, upcoming: 8, departed: 100,
    activeByTenure: [180, 200, 300, 300, 112], openedMonthsAgo: null,
    departmentWeights: { engineering: 45, sales: 15, operations: 25, finance: 9, people: 6 }, bandGrowthBp: 250,
    // Two review periods: January and July cohorts.
    review: { months: [1, 7], cohorts: true, chance: 0.85, raiseBp: [200, 350], promotionChance: 0.05, promotionBp: [800, 1200], ...noSpikes },
  },
  {
    code: "FR", currency: "EUR", total: 800, upcoming: 6, departed: 70,
    activeByTenure: [130, 133, 165, 188, 108], openedMonthsAgo: null,
    departmentWeights: { engineering: 32, sales: 22, operations: 26, finance: 12, people: 8 }, bandGrowthBp: 200,
    // Small March raises and a correction period of decreases.
    review: {
      months: [3], cohorts: false, chance: 0.8, raiseBp: [100, 300], promotionChance: 0.04, promotionBp: [600, 1000],
      ...noSpikes, correction: { monthsAgo: 5, chance: 0.35, decreaseBp: [200, 500] },
    },
  },
  {
    code: "CA", currency: "CAD", total: 600, upcoming: 10, departed: 45,
    activeByTenure: [160, 235, 150, 0, 0], openedMonthsAgo: 58,
    departmentWeights: { engineering: 40, sales: 30, operations: 15, finance: 7, people: 8 }, bandGrowthBp: 300,
    // Midyear (June) reviews.
    review: { months: [6], cohorts: false, chance: 0.85, raiseBp: [300, 500], promotionChance: 0.05, promotionBp: [1000, 1500], ...noSpikes },
  },
  {
    code: "SG", currency: "SGD", total: 400, upcoming: 8, departed: 35,
    activeByTenure: [120, 152, 85, 0, 0], openedMonthsAgo: 50,
    departmentWeights: { engineering: 30, sales: 22, operations: 18, finance: 20, people: 10 }, bandGrowthBp: 300,
    // Light January reviews plus targeted promotion spikes in March and September.
    review: {
      months: [1], cohorts: false, chance: 0.7, raiseBp: [200, 400], promotionChance: 0, promotionBp: [1200, 2000],
      ...noSpikes, promotionMonths: [3, 9], promotionMonthChance: 0.1,
    },
  },
];

/** India employees whose latest salary is in USD (part of India's total). */
export const INDIA_USD_EMPLOYEES = 200;

/** Departed employees' completed service at their last working day, weighted per TENURE_BANDS entry. */
export const DEPARTED_TENURE_WEIGHTS = [25, 30, 20, 15, 10] as const;

/** Band midpoints (major units) for the Sales department at `as_of`, per work country and salary currency. */
export const PAY_MIDPOINTS: Readonly<Record<string, bigint>> = {
  "IN:INR": 1_800_000n,
  "IN:USD": 60_000n,
  "US:USD": 110_000n,
  "GB:GBP": 65_000n,
  "DE:EUR": 70_000n,
  "FR:EUR": 58_000n,
  "CA:CAD": 90_000n,
  "SG:SGD": 95_000n,
};

/** Department pay relative to the midpoint, in basis points: Finance highest average, Operations lowest. */
export const DEPARTMENT_PAY_BP: Readonly<Record<DepartmentId, number>> = {
  engineering: 12_000,
  sales: 10_000,
  operations: 7_500,
  finance: 13_500,
  people: 9_000,
};

/** Rounding unit (major units) for whole-number salaries, per currency. */
export const ROUNDING_UNIT: Readonly<Record<CurrencyCode, bigint>> = {
  INR: 1000n, USD: 100n, GBP: 100n, EUR: 100n, CAD: 100n, SGD: 100n,
};

/** Fixed conversion used by currency switches: `to = from × numerator / denominator`, rounded to the unit. */
export const SWITCH_RATES: Readonly<Record<string, readonly [bigint, bigint]>> = {
  "INR>USD": [1n, 83n],
  "USD>INR": [83n, 1n],
  "USD>GBP": [79n, 100n],
};
