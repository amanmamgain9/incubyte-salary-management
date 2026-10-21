// One employee's salary history from the review profiles (docs/data-generation.md › History). Pure and seeded.
import { addDays, addMonths, daysBetween, monthEnd, monthStart } from "@/lib/dates";
import { divideRounded } from "@/lib/money";
import {
  COUNTRY_PROFILES,
  type CountryCode,
  type CountryProfile,
  type CurrencyCode,
  DEPARTMENT_PAY_BP,
  type DepartmentId,
  PAY_MIDPOINTS,
  ROUNDING_UNIT,
  SWITCH_RATES,
  TENURE_BANDS,
} from "./profiles";
import type { Random } from "./random";

/** Deliberate known cases (docs/data-generation.md › Known cases); none for most employees. */
export type HistoryCases = {
  /** The salary switched from this currency to the latest one. */
  switchFrom?: CurrencyCode;
  /** With `switchFrom`: the switch is a relocation from this work country. */
  relocatedFrom?: CountryCode;
  /** A pay-neutral transfer revision moved the employee from this department. */
  transferFrom?: DepartmentId;
  /** Every snapshot has this department: the current one was edited after the latest revision. */
  editedFrom?: DepartmentId;
  /** The latest raise is corrected downwards later the same day. */
  sameDayCorrection?: true;
  /** An offer and a revised offer, both before joining. */
  revisedOffer?: true;
  /** The first regular revision sits on a month boundary: 23:59:59 on the last day, or 00:00:00 on the first. */
  boundary?: "month-end" | "month-start";
  /** EUR 100,000 → 110,000 → 108,000: increases 10,000, decreases 2,000, net 8,000. */
  knownEur?: true;
};

export type HistoryPlan = {
  joining_date: string;
  /** The last working day, or `as_of` when there is none. */
  end: string;
  upcoming: boolean;
  /** TENURE_BANDS index of completed service at `end`. */
  band: number;
  country: CountryCode;
  department: DepartmentId;
  currency: CurrencyCode;
  cases: HistoryCases;
};

export type HistoryStep = {
  date: string;
  time: string;
  amount: bigint;
  currency: CurrencyCode;
  country: CountryCode;
  department: DepartmentId;
  reason: string;
};

type EventKind = "review" | "promotion" | "adjustment" | "early-raise" | "correction" | "switch" | "transfer" | "revised-offer";
type SalaryEvent = { date: string; kind: EventKind; time?: string; keep: boolean };

const REASONS: Record<EventKind, string> = {
  review: "Annual review",
  promotion: "Promotion",
  adjustment: "Market adjustment",
  "early-raise": "Early raise",
  correction: "Correction",
  switch: "Currency change",
  transfer: "Transfer",
  "revised-offer": "Revised offer",
};
const RAISES = new Set<EventKind>(["review", "promotion", "adjustment", "early-raise"]);

function countryProfile(code: CountryCode): CountryProfile {
  const profile = COUNTRY_PROFILES.find((candidate) => candidate.code === code);
  if (!profile) throw new Error(`No profile for ${code}`);
  return profile;
}

const pad = (value: number) => String(value).padStart(2, "0");
const monthOf = (date: string) => Number(date.slice(5, 7));
const scale = (amount: bigint, bp: number) => divideRounded(amount * BigInt(10_000 + bp), 10_000n);

/** The month of a country's correction period: `monthsAgo` before `as_of`'s month, moved off review months. */
function correctionMonthStart(profile: CountryProfile, asOf: string): string | null {
  if (!profile.review.correction) return null;
  let offset = profile.review.correction.monthsAgo;
  while (profile.review.months.includes(monthOf(addMonths(asOf, -offset)))) offset++;
  return monthStart(addMonths(asOf, -offset));
}

/** Initial pay: the band midpoint by country/currency and department, lower further back, mostly near the middle. */
function initialAmount(
  random: Random,
  at: { country: CountryCode; department: DepartmentId; currency: CurrencyCode },
  date: string,
  asOf: string,
): bigint {
  const midpoint = PAY_MIDPOINTS[`${at.country}:${at.currency}`];
  if (midpoint === undefined) throw new Error(`No pay band for ${at.country}:${at.currency}`);
  const years = Math.max(0, Math.floor(daysBetween(date, asOf) / 365));
  const growthBp = Math.max(4_000, 10_000 - countryProfile(at.country).bandGrowthBp * years);
  const roll = random.next();
  const spreadBp =
    roll < 0.7
      ? 10_000 + Math.round((random.int(-1_000, 1_000) + random.int(-1_000, 1_000) + random.int(-1_000, 1_000)) / 3)
      : roll < 0.85
        ? random.int(7_500, 9_000)
        : random.int(11_000, 13_000);
  const exact = divideRounded(
    midpoint * 100n * BigInt(DEPARTMENT_PAY_BP[at.department]) * BigInt(spreadBp) * BigInt(growthBp),
    10n ** 12n,
  );
  if (random.chance(0.15)) return exact; // fractional amounts for precision checks
  const unit = ROUNDING_UNIT[at.currency] * 100n;
  const rounded = divideRounded(exact, unit) * unit;
  return rounded > 0n ? rounded : unit;
}

/** Builds the salary entries (revision order) for one employee. Revisions fall on/before `end` and before `asOf`. */
export function buildHistory(plan: HistoryPlan, random: Random, asOf: string): HistoryStep[] {
  const { cases } = plan;
  const timeOn = (date: string) =>
    date === asOf
      ? `00:${pad(random.int(0, 59))}:${pad(random.int(0, 59))}`
      : `${pad(random.int(9, 17))}:${pad(random.int(0, 59))}:${pad(random.int(0, 59))}`;
  const start = addMonths(plan.joining_date, 3);
  const last = plan.end < asOf ? plan.end : addDays(asOf, -1);
  const randomDate = (from: string, to: string) => addDays(from, random.int(0, daysBetween(from, to)));

  const events: SalaryEvent[] = [];
  const used = new Set<string>();
  let switchDate: string | null = null;
  let transferDate: string | null = null;
  const countryAt = (date: string) =>
    cases.relocatedFrom && switchDate !== null && date < switchDate ? cases.relocatedFrom : plan.country;
  const departmentAt = (date: string) =>
    cases.editedFrom ??
    (cases.transferFrom && transferDate !== null && date < transferDate ? cases.transferFrom : plan.department);
  const free = (date: string) =>
    date >= start &&
    date <= last &&
    !used.has(date) &&
    !countryProfile(countryAt(date)).review.quietMonths.includes(monthOf(date));

  /** Places an event on a free, non-quiet date in [start, last], nudging it by a month or a few days; null if impossible. */
  const place = (date: string, kind: EventKind, keep: boolean): string | null => {
    const candidate = [date, addMonths(date, -1), addMonths(date, 1), addDays(date, 1), addDays(date, 2)].find(free);
    if (candidate === undefined) return null;
    used.add(candidate);
    events.push({ date: candidate, kind, keep });
    return candidate;
  };

  const firstDate = plan.upcoming
    ? asOf
    : cases.revisedOffer
      ? addDays(plan.joining_date, -random.int(20, 30))
      : plan.joining_date;
  if (!plan.upcoming && !cases.knownEur && start <= last) {
    if (cases.switchFrom) switchDate = place(randomDate(start, last), "switch", true);
    if (cases.transferFrom) transferDate = place(randomDate(start, last), "transfer", true);
    addProfileEvents(plan, random, { start: addMonths(plan.joining_date, 9), last, asOf, countryAt, place });
    if (plan.band === 0 && random.chance(0.06)) place(randomDate(start, last), "early-raise", false);
    if (cases.sameDayCorrection) addSameDayCorrection(events);
    fitEntryCount(plan, random, events, () => place(randomDate(start, last), "adjustment", false));
    if (cases.boundary) moveToBoundary(events, cases.boundary, free);
  }
  if (cases.revisedOffer) {
    events.push({ date: addDays(plan.joining_date, -random.int(3, 10)), kind: "revised-offer", keep: true });
  }
  const timed = events
    .map((event) => ({ ...event, time: event.time ?? timeOn(event.date) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const at = (date: string) => ({ country: countryAt(date), department: departmentAt(date) });
  let currency: CurrencyCode = cases.switchFrom ?? plan.currency;
  let amount = cases.knownEur ? 10_000_000n : initialAmount(random, { ...at(firstDate), currency }, firstDate, asOf);
  const initial = { date: firstDate, time: timeOn(firstDate), amount, currency, ...at(firstDate), reason: "Initial salary" };
  if (cases.knownEur) return [initial, ...knownEurSteps(initial, asOf)];

  const steps: HistoryStep[] = [initial];
  for (const event of timed) {
    const review = countryProfile(countryAt(event.date)).review;
    let reason = REASONS[event.kind];
    if (event.kind === "review") amount = scale(amount, random.int(...review.raiseBp));
    else if (event.kind === "promotion") amount = scale(amount, random.int(...review.promotionBp));
    else if (event.kind === "adjustment") amount = scale(amount, random.int(200, 600));
    else if (event.kind === "early-raise" || event.kind === "revised-offer") amount = scale(amount, random.int(300, 800));
    else if (event.kind === "correction") {
      const decrease = review.correction && !cases.sameDayCorrection ? review.correction.decreaseBp : ([100, 300] as const);
      amount = scale(amount, -random.int(...decrease));
    } else if (event.kind === "switch") {
      const rate = SWITCH_RATES[`${currency}>${plan.currency}`];
      if (!rate) throw new Error(`No switch rate ${currency}>${plan.currency}`);
      const unit = ROUNDING_UNIT[plan.currency] * 100n;
      amount = divideRounded(amount * rate[0], rate[1] * unit) * unit;
      currency = plan.currency;
      if (cases.relocatedFrom) reason = "Relocation";
    }
    steps.push({ date: event.date, time: event.time, amount, currency, ...at(event.date), reason });
  }
  return steps;
}

type ProfileWindow = {
  start: string;
  last: string;
  asOf: string;
  countryAt: (date: string) => CountryCode;
  place: (date: string, kind: EventKind, keep: boolean) => string | null;
};

/** Review-calendar events: regular (or cohort) reviews with skips and promotions, promotion spikes, correction periods. */
function addProfileEvents(plan: HistoryPlan, random: Random, window: ProfileWindow): void {
  const review = countryProfile(plan.country).review;
  const cohort = review.cohorts ? [random.pick(review.months)] : review.months;
  const firstYear = Number(window.start.slice(0, 4));
  const lastYear = Number(window.last.slice(0, 4));
  const inWindow = (date: string) => date >= window.start && date <= window.last;
  for (let year = firstYear; year <= lastYear; year++) {
    for (const month of cohort) {
      const date = `${year}-${pad(month)}-${pad(random.int(1, 28))}`;
      if (!inWindow(date) || !random.chance(review.chance)) continue;
      window.place(date, random.chance(review.promotionChance) ? "promotion" : "review", false);
    }
    for (const month of review.promotionMonths) {
      const date = `${year}-${pad(month)}-${pad(random.int(1, 28))}`;
      if (inWindow(date) && random.chance(review.promotionMonthChance)) window.place(date, "promotion", false);
    }
  }
  const correction = correctionMonthStart(countryProfile(plan.country), window.asOf);
  if (correction && review.correction && random.chance(review.correction.chance)) {
    const date = addDays(correction, random.int(0, 27));
    if (date >= addMonths(plan.joining_date, 3) && date <= window.last && window.countryAt(date) === plan.country) {
      window.place(date, "correction", true);
    }
  }
}

/** Drops skippable events above the band's entry range, or pads with market adjustments below it. */
function fitEntryCount(plan: HistoryPlan, random: Random, events: SalaryEvent[], pad: () => string | null): void {
  const [minEntries, maxEntries] = TENURE_BANDS[plan.band]?.entries ?? [1, 1];
  const extra = plan.cases.revisedOffer ? 1 : 0;
  while (events.length + 1 + extra > maxEntries) {
    const droppable = events.flatMap((event, index) => (event.keep ? [] : [index]));
    if (droppable.length === 0) break;
    events.splice(random.pick(droppable), 1);
  }
  for (let attempt = 0; attempt < 20 && events.length + 1 + extra < minEntries; attempt++) pad();
}

/** Corrects the latest raise downwards later the same day (multiple revisions in one day). */
function addSameDayCorrection(events: SalaryEvent[]): void {
  const raise = events.filter((event) => RAISES.has(event.kind)).sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!raise) return;
  raise.keep = true;
  raise.time = "10:30:00";
  events.push({ date: raise.date, kind: "correction", time: "16:45:00", keep: true });
}

/** Moves the first regular event to 23:59:59 on its month's last day, or 00:00:00 on its first day. */
function moveToBoundary(events: SalaryEvent[], boundary: "month-end" | "month-start", free: (date: string) => boolean) {
  const event = events.filter((candidate) => !candidate.keep).sort((a, b) => a.date.localeCompare(b.date))[0];
  if (!event) return;
  const date = boundary === "month-end" ? monthEnd(event.date) : monthStart(event.date);
  if (!free(date)) return;
  event.date = date;
  event.time = boundary === "month-end" ? "23:59:59" : "00:00:00";
  event.keep = true;
}

/** The documented EUR example: a review to 110,000.00 fourteen months before `as_of`, corrected to 108,000.00. */
function knownEurSteps(initial: HistoryStep, asOf: string): HistoryStep[] {
  const reviewDate = addDays(monthStart(addMonths(asOf, -14)), 14);
  return [
    { ...initial, date: reviewDate, time: "11:00:00", amount: 11_000_000n, reason: "Annual review" },
    { ...initial, date: addMonths(reviewDate, 2), time: "11:00:00", amount: 10_800_000n, reason: "Correction" },
  ];
}
