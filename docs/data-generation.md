# Data generation

Synthetic demonstration data; salary bands and review patterns are fictional.

## Reproducibility

- Generate from a `seed` and UTC `as_of` date (default: the run's UTC date): `npm run db:seed -- --seed <text> --as-of YYYY-MM-DD` (seed default `acme`). Identical `seed` + `as_of` reproduce employees and salary histories. Tests freeze both.
- Use stable employee/history IDs: `E-00001`… in joining-date order; history `<employee ID>-<revision>`. Seed a fresh database; reseeding requires an explicit reset. Reports use today's UTC date, so a deploy reseeds when its data should be current; the README's Seed date section shows how.
- Seed the demo HR account (`DEMO_HR_EMAIL`, `DEMO_HR_PASSWORD`) first as owner: a `user` row plus a credential `account` row whose password is hashed with Better Auth's `hashPassword` (`better-auth/crypto`), so normal sign-in verifies it; signup stays disabled. All history entries reference it. Each employee's `salary_revision` equals its latest entry.
- Lookups have no migration data: the seed inserts the 7 countries, 6 currencies and 5 departments below as owner before employees (the app role only reads them). Department IDs are lowercase names (`engineering`, `sales`, `operations`, `finance`, `people`).
- The HR account and lookups are upserted, so re-running the seed is safe for them; employees go only into an empty `employees` table, so a reseed needs `npm run db:reset` first.

## Population

Exactly 10,000 employee records:

| Work country | Employees | Main salary currency |
| --- | ---: | --- |
| India | 3,500 | INR |
| United States | 2,200 | USD |
| United Kingdom | 1,300 | GBP |
| Germany | 1,200 | EUR |
| France | 800 | EUR |
| Canada | 600 | CAD |
| Singapore | 400 | SGD |

- Within India's total, 200 employees have USD salaries. These quotas describe latest salaries.
- At `as_of`: 9,000 active, 900 departed, 100 upcoming. Departures span the previous year; upcoming joins fall within the next month.
- Shared departments: Engineering, Sales, Operations, Finance and People. Populate every country/department combination with active employees; use different department proportions per country.
- Include repeated names with different IDs and fractional salary amounts for search and precision checks.

## Tenure

At `as_of`, distribute the 9,000 active employees by completed service:

| Tenure | Share | Employees |
| --- | ---: | ---: |
| Under 1 year | 20% | 1,800 |
| 1–under 3 years | 25% | 2,250 |
| 3–under 5 years | 25% | 2,250 |
| 5–under 10 years | 20% | 1,800 |
| 10–15 years | 10% | 900 |

- Established offices: US, UK, Germany and France have more employees with 5+ years of service and steady recent hiring.
- Growing offices: India has an established core plus accelerated hiring in the last three years; Canada and Singapore opened within the last five years and skew toward recent joiners.
- Preserve the overall tenure quotas while varying country mixes. Spread joining dates within each band; departed employees also span short and long service.

## Salaries

- Configure initial pay bands per country, currency and department. Concentrate values around band midpoints, with smaller low/high groups.
- Engineering has large headcount and total pay; Finance has smaller headcount with higher average pay; Operations has a lower average. Ensure these patterns within comparable country/currency groups.
- Generate amounts in integer minor units; apply changes with exact arithmetic and round to two decimals. Keep salaries positive.
- Current amount/currency must equal the latest salary snapshot.

## History

- Every employee has an initial salary entry (revision 1). Upcoming joiners have one entry; most employees under one year have one, with a few early raises.
- Salary entry counts generally grow with tenure: 1–3 years → 2–4 entries; 3–5 → 3–6; 5–10 → 5–10; 10+ → 8–15. Vary review frequency and include skipped reviews and promotions.
- Retain salary history from joining, spanning up to 15 years. Include distinct monthly patterns throughout the latest 24 months. Revision numbers increase per employee; timestamps follow that order.
- Subsequent revisions occur on/after joining (except the revised-offer known case) and no later than the last working day or `as_of`. Upcoming joiners have an initial entry recorded at `as_of`, with no future history events.
- Include raises, reductions/corrections, unchanged-pay employees and a few currency switches. Give each revision a matching reason.
- Capture country/department at each revision; include a few employees whose current assignment differs from earlier snapshots.

## Report patterns

| Report | Deliberate data pattern |
| --- | --- |
| Salary commitment | Uneven headcount/pay bands; Germany and France stay separate despite EUR; India's INR/USD totals stay separate. Only 9,000 active employees contribute. |
| Department breakdown | Large teams lead total pay; smaller teams can lead average pay. Country-specific department mixes make filtering useful. |
| Salary growth | Country-specific review months, promotion spikes, quiet months and correction periods produce distinct monthly increases/decreases. |
| Historical salary benchmarking | Fifteen years of staggered joins, departures and salary revisions produce changing monthly headcounts, pay percentiles and department/country comparisons. Keep currencies separate. |

Salary review profiles: India has a broad review spike; the US has staggered quarterly changes; the UK has modest annual reviews; Germany has two review periods; France has smaller changes and a correction period; Canada has midyear reviews; Singapore has targeted promotion spikes. Hiring growth does not itself contribute to salary-growth totals. Ensure at least one negative-net and one quiet month in a country.

## Known cases and checks

- Include known cases within the 10,000: multiple revisions in one day, month-boundary changes, a predecessor outside the selected period, a later leaver with earlier raises, a revised offer before joining, assignment changes and currency switches.
- Example arithmetic: EUR 100,000 → 110,000 → 108,000 gives increases 10,000, decreases 2,000 and net 8,000. Initial salaries and currency switches contribute no growth amount.
- Preserve valid empty filters, such as France + INR; unknown codes are rejected, not empty. Compare paginated results with summaries over the full matching population.
- Generate a manifest of expected headcounts, country/department/currency totals and monthly deltas using independent exact arithmetic. `npm run db:verify` validates report results against it; CI runs it after seeding. It regenerates the dataset (same `--seed`; `--as-of` defaults to the latest history date, where upcoming joiners' entries sit). It checks status counts, history consistency and every report's queries (rows, counts and summaries) for representative filter sets and periods. DB tests check report numbers on small fixtures of these cases.
- The manifest rounds like PostgreSQL `round(numeric)` (half away from zero) and derives percentages from exact, unrounded medians. Growth is kept per month and snapshot country/department/currency so filters can be summed from it.
- For historical benchmarking, independently reconstruct monthly salaries and exact percentiles from the dataset. Check month boundaries, partial months, later leavers, snapshot assignments and prior-year data outside the visible range.
