// Pure deterministic generator (docs/data-generation.md): (seed, as_of) → employees + salary history rows.
// No database, env or clock access; identical inputs give identical rows, IDs included.
import { addDays, addMonths, daysBetween } from "@/lib/dates";
import { fromMinorUnits } from "@/lib/money";
import type { employees, salaryHistory } from "@/server/db/schema";
import { buildHistory, type HistoryCases } from "./history";
import { NAME_POOLS } from "./names";
import {
  COUNTRY_PROFILES,
  type CountryProfile,
  type CurrencyCode,
  DEPARTED_TENURE_WEIGHTS,
  DEPARTMENT_IDS,
  type DepartmentId,
  HISTORY_YEARS,
  INDIA_USD_EMPLOYEES,
  TENURE_BANDS,
} from "./profiles";
import { createRandom, type Random } from "./random";

export type GeneratedEmployee = typeof employees.$inferSelect;
export type GeneratedHistoryEntry = typeof salaryHistory.$inferSelect;

const KNOWN_CASES = [
  "currency-switch",
  "relocation",
  "transfer",
  "edited-department",
  "same-day-correction",
  "revised-offer",
  "month-end",
  "month-start",
  "eur-review-correction",
] as const;
export type KnownCase = (typeof KNOWN_CASES)[number];

export type Dataset = {
  seed: string;
  as_of: string;
  employees: GeneratedEmployee[];
  /** Ordered by employee ID, then revision. */
  history: GeneratedHistoryEntry[];
  /** Employee IDs carrying each deliberate known case. */
  known_cases: Record<KnownCase, string[]>;
};

export type GenerateOptions = { seed: string; as_of: string; /** HR user ID stamped on every entry. */ changed_by: string };

type Status = "active" | "departed" | "upcoming";
type Person = {
  profile: CountryProfile;
  status: Status;
  band: number;
  department: DepartmentId;
  currency: CurrencyCode;
  joining_date: string;
  last_working_day: string | null;
  cases: HistoryCases;
  known: KnownCase[];
};

/** Splits `total` by `weights` exactly (largest remainder; ties to the earlier weight). */
function apportion(weights: readonly number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  const counts = weights.map((weight) => Math.floor((weight * total) / sum));
  const order = weights
    .map((weight, index) => ({ index, remainder: (weight * total) % sum }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < total - counts.reduce((a, b) => a + b, 0); i++) {
    const slot = order[i % order.length];
    if (slot) counts[slot.index] = (counts[slot.index] ?? 0) + 1;
  }
  return counts;
}

/** TENURE_BANDS index of service completed by `end`: whole years n with joining ≤ end − n years. */
export function tenureBand(joining: string, end: string): number {
  return TENURE_BANDS.findLastIndex((band) => joining <= addMonths(end, -12 * band.minYears));
}

/** A uniformly random date in the half-open range (after, through]. */
function dateIn(random: Random, after: string, through: string): string {
  const days = daysBetween(after, through);
  if (days < 1) throw new Error(`Empty date range (${after}, ${through}]`);
  return addDays(after, random.int(1, days));
}

/** Joining date for a band of service completed by `end`, after the history start and the office opening. */
function joiningFor(random: Random, profile: CountryProfile, band: number, end: string, asOf: string): string {
  const { minYears, maxYears } = TENURE_BANDS[band] ?? TENURE_BANDS[0];
  const floors = [addMonths(end, -12 * maxYears), addMonths(asOf, -12 * HISTORY_YEARS)];
  if (profile.openedMonthsAgo !== null) floors.push(addMonths(asOf, -profile.openedMonthsAgo));
  const after = floors.reduce((a, b) => (a > b ? a : b));
  return dateIn(random, after, addMonths(end, -12 * minYears));
}

/** Everyone in one country with status, service band, department and dates; currencies and cases come later. */
function countryPeople(random: Random, profile: CountryProfile, asOf: string): Person[] {
  const departedBands = apportion(
    DEPARTED_TENURE_WEIGHTS.map((weight, band) => {
      const minMonths = 12 * (TENURE_BANDS[band]?.minYears ?? 0);
      return profile.openedMonthsAgo === null || minMonths < profile.openedMonthsAgo - 12 ? weight : 0;
    }),
    profile.departed,
  );
  const groups: { status: Status; bands: number[] }[] = [
    { status: "active", bands: profile.activeByTenure.flatMap((count, band) => Array<number>(count).fill(band)) },
    { status: "departed", bands: departedBands.flatMap((count, band) => Array<number>(count).fill(band)) },
    { status: "upcoming", bands: Array<number>(profile.upcoming).fill(0) },
  ];
  const weights = DEPARTMENT_IDS.map((id) => profile.departmentWeights[id]);
  return groups.flatMap(({ status, bands }) => {
    const departments = random.shuffle(
      apportion(weights, bands.length).flatMap((count, index) => Array<DepartmentId>(count).fill(DEPARTMENT_IDS[index] ?? "engineering")),
    );
    return bands.map((band, index): Person => {
      const last_working_day = status === "departed" ? dateIn(random, addDays(addMonths(asOf, -12), -1), addDays(asOf, -1)) : null;
      const joining_date =
        status === "upcoming"
          ? dateIn(random, asOf, addMonths(asOf, 1))
          : joiningFor(random, profile, band, last_working_day ?? asOf, asOf);
      const department = departments[index] ?? "engineering";
      return { profile, status, band, department, currency: profile.currency, joining_date, last_working_day, cases: {}, known: [] };
    });
  });
}

/** Marks up to `count` people matching `eligible` (and no earlier case) with a known case. */
function mark(random: Random, people: Person[], count: number, eligible: (person: Person) => boolean, apply: (person: Person) => void) {
  const candidates = random.shuffle(people.filter((person) => person.known.length === 0 && eligible(person)));
  for (const person of candidates.slice(0, count)) apply(person);
}

function assignKnownCases(random: Random, people: Person[], asOf: string): void {
  const employed = (person: Person) => person.status !== "upcoming" && person.band >= 1;
  const india = (person: Person) => person.profile.code === "IN" && employed(person);
  const otherDepartment = (person: Person) => random.pick(DEPARTMENT_IDS.filter((id) => id !== person.department));
  const tag = (person: Person, known: KnownCase, cases: HistoryCases) => {
    person.known.push(known);
    Object.assign(person.cases, cases);
  };
  mark(random, people, 15, (p) => india(p) && p.currency === "USD", (p) => tag(p, "currency-switch", { switchFrom: "INR" }));
  mark(random, people, 5, (p) => india(p) && p.currency === "INR", (p) => tag(p, "currency-switch", { switchFrom: "USD" }));
  mark(
    random,
    people,
    4,
    (p) => p.profile.code === "GB" && p.status === "active" && p.band >= 2,
    (p) => tag(p, "relocation", { switchFrom: "USD", relocatedFrom: "US" }),
  );
  mark(random, people, 1, (p) => p.profile.code === "DE" && p.status === "active" && p.band === 2, (p) => tag(p, "eur-review-correction", { knownEur: true }));
  mark(random, people, 60, employed, (p) => tag(p, "transfer", { transferFrom: otherDepartment(p) }));
  mark(random, people, 20, (p) => employed(p) && p.status === "active", (p) => tag(p, "edited-department", { editedFrom: otherDepartment(p) }));
  mark(random, people, 25, (p) => p.status === "active" && p.band >= 2, (p) => tag(p, "same-day-correction", { sameDayCorrection: true }));
  const offerCutoff = addDays(asOf, -45);
  mark(
    random,
    people,
    5,
    (p) => p.status === "active" && p.band === 0 && p.joining_date <= offerCutoff,
    (p) => tag(p, "revised-offer", { revisedOffer: true }),
  );
  mark(random, people, 30, (p) => p.status !== "upcoming" && p.band >= 2, (p) => tag(p, "month-end", { boundary: "month-end" }));
  mark(random, people, 30, (p) => p.status !== "upcoming" && p.band >= 2, (p) => tag(p, "month-start", { boundary: "month-start" }));
}

/** Generates the full 10,000-employee dataset for `seed` and `as_of` (docs/data-generation.md). */
export function generateDataset({ seed, as_of, changed_by }: GenerateOptions): Dataset {
  const random = createRandom(seed);
  const people = COUNTRY_PROFILES.flatMap((profile) => countryPeople(random.fork(`people/${profile.code}`), profile, as_of));

  const casesRandom = random.fork("cases");
  const indians = casesRandom.shuffle(people.filter((person) => person.profile.code === "IN"));
  for (const person of indians.slice(0, INDIA_USD_EMPLOYEES)) person.currency = "USD";
  assignKnownCases(casesRandom, people, as_of);

  // Stable IDs: earlier joiners get lower numbers.
  const ordered = people
    .map((person, index) => ({ person, index }))
    .sort((a, b) => a.person.joining_date.localeCompare(b.person.joining_date) || a.index - b.index);

  const namesRandom = random.fork("names");
  const historyRandom = random.fork("history");
  const known_cases = Object.fromEntries(KNOWN_CASES.map((name) => [name, [] as string[]])) as Record<KnownCase, string[]>;
  const generatedEmployees: GeneratedEmployee[] = [];
  const history: GeneratedHistoryEntry[] = [];
  ordered.forEach(({ person }, position) => {
    const id = `E-${String(position + 1).padStart(5, "0")}`;
    const pool = NAME_POOLS[person.profile.code];
    const name = `${namesRandom.pick(pool.first)} ${namesRandom.pick(pool.last)}`;
    const steps = buildHistory(
      {
        joining_date: person.joining_date,
        end: person.last_working_day ?? as_of,
        upcoming: person.status === "upcoming",
        band: person.band,
        country: person.profile.code,
        department: person.department,
        currency: person.currency,
        cases: person.cases,
      },
      historyRandom,
      as_of,
    );
    steps.forEach((step, index) =>
      history.push({
        id: `${id}-${index + 1}`,
        employee_id: id,
        revision: index + 1,
        annual_base_pay: fromMinorUnits(step.amount),
        currency_code: step.currency,
        work_country_code_at_change: step.country,
        department_id_at_change: step.department,
        changed_by,
        changed_at: new Date(`${step.date}T${step.time}.000Z`),
        reason: step.reason,
      }),
    );
    const latest = steps[steps.length - 1];
    if (!latest) throw new Error(`No salary history for ${id}`);
    generatedEmployees.push({
      id,
      name,
      department_id: person.department,
      work_country_code: person.profile.code,
      joining_date: person.joining_date,
      last_working_day: person.last_working_day,
      annual_base_pay: fromMinorUnits(latest.amount),
      salary_currency_code: latest.currency,
      salary_revision: steps.length,
    });
    for (const known of person.known) known_cases[known].push(id);
  });
  return { seed, as_of, employees: generatedEmployees, history, known_cases };
}
