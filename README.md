# ACME Salary Management

HR salary management app for 10,000 employees: one Next.js app (UI + tRPC) on PostgreSQL. Scope and design live in [`docs/`](docs/); contributor rules in [`AGENTS.md`](AGENTS.md).

- Live demo: https://incubyte-salary-management-cyan.vercel.app (the demo login is shown on the sign-in page)
- Video: TBD

## What works today

- **Sign in** (`/login`): email/password for the seeded HR account, whose credentials the page shows; sign-up is disabled and every API call needs the session.
- **Employee directory** (`/employees`, `/` redirects there): name/ID search, country, department and status filters, a workforce overview and Previous/Next pagination, all kept in the URL.
- **Employee profile** (`/employees/<id>`): details, current pay and revision, and the paginated read-only salary history (amount, currency, country and department at change, HR user, time, reason).
- **Dialogs**, deep-linked by `?dialog=`: Add employee (initial salary saved as revision 1), Edit details (only changed fields; set or clear the last working day) and Change salary (active and upcoming employees; a stale revision offers a reload and keeps the entered values).
- **Four reports** under `/reports/`, each with filters in the URL, overview measures from the API, a paginated table and charts:
  - Salary commitment: annual commitment per country and currency for employees active today.
  - Department breakdown: headcount, total and average pay per country, department and currency, with a department comparison chart.
  - Salary growth: monthly increases, decreases, net change and currency switches, with a 12-month net trend.
  - Historical salary benchmark: month-end P10/median/P90, country median gap and year-over-year change, with a pay-range trend.
- **Seed and verify**: `db:seed` generates 10,000 employees with up to 15 years of history; `db:verify` checks the database and all four reports against an independently computed manifest.
- **Benchmark**: `npm run bench` times each report on the seeded data ([results](docs/architecture.md#report-performance)).

## Setup

Needs Node.js 24 (npm 11) and Docker with Compose.

```bash
docker compose up -d      # PostgreSQL 17 on 127.0.0.1:55432 with the acme_owner and acme_app roles
cp .env.example .env      # local-only values; change the secrets for anything shared
npm ci
npm run db:migrate        # apply drizzle/ migrations as the owner role
npm run db:seed           # demo HR account, lookups, 10,000 employees + salary history
npm run dev               # http://localhost:3000
```

Sign in with the demo account from `.env` (`DEMO_HR_EMAIL` / `DEMO_HR_PASSWORD`, `hr@acme.test` by default); the login page shows them.

The Compose database listens on port 55432 (not 5432) to avoid clashing with other local PostgreSQL instances. If you change it, update both URLs in `.env`.

### Seed date

The seed generates its data as of a UTC date, `as_of`, which defaults to the day you run it; reports use today's UTC date, so an old seed drifts (upcoming joiners become active, no recent revisions). To reseed:

```bash
npm run db:reset && npm run db:seed    # db:reset empties every app and auth table; schema and migrations stay
```

`npm run db:seed -- --seed <text> --as-of YYYY-MM-DD` reproduces a specific dataset. `db:verify` reads `as_of` from the seeded history unless you pass `--as-of`.

## Deployment

- Vercel runs the app and deploys `main` on every push; Neon hosts PostgreSQL (free tier, us-east). Variables: [architecture › Delivery](docs/architecture.md#delivery).
- The production database was prepared from a workstation with the owner URL: `db:migrate`, then `db:seed` (seed `acme`, `as_of` 2026-10-21: 10,000 employees, 41,826 salary entries), then `db:verify` (22/22 checks passed). The app connects as the restricted app role.
- Production timings: [report performance](docs/architecture.md#production-vercel-iad1--neon-free-tier).

## Checks

| Command | Covers |
| --- | --- |
| `npm run typecheck` | Route types (`next typegen`) and `tsc` in strict mode |
| `npm run lint` | ESLint, including import boundaries, single library import sites, color tokens and file size caps |
| `npm test` | Unit tests (`tests/unit`): cursor codec, pagination, error mapping, contracts, `lib/`, report data shaping, data generator and manifest |
| `npm run test:db` | Database tests (`tests/db`) against a fresh `acme_test`: auth, procedures, constraints and grants, employee and salary writes, history, report numbers on small fixtures |
| `npm run test:e2e` | Playwright against a production build on port 3100 and a fresh `acme_e2e`: sign-in, directory, dialogs, salary conflict, each report and its filters (first run `npx playwright install chromium`) |
| `npm run db:verify` | The seeded database and all four reports' queries against the generator's manifest |
| `npm run bench` | Report timings on the seeded database (`-- --explain` adds the benchmark snapshot plan) |

`npm run build` makes the production build (it needs the app variables from `.env`). CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests and build; `test:db`, then migrate, seed and `db:verify` on a PostgreSQL 17 service; and `test:e2e` (Chromium) on another.

## Docs

- [Requirements](docs/requirements.md): goal, user, features, report questions and exclusions
- [Design decisions](docs/decisions.md): the key decisions, why they were made and their trade-offs
- [Architecture](docs/architecture.md): stack, structure, runtime rules, delivery and report performance
- [tRPC contracts](docs/trpc-contracts.md): every procedure's input, output, errors and report calculations
- [Data model](docs/data-model.md): tables, constraints and indexes
- [Data generation](docs/data-generation.md): the seeded population, salary histories and known cases
- [Screens](docs/screens.md): screen list, navigation and the static prototypes
- [Login and security](docs/login.md) and [design language](docs/design-language.md)
- [AGENTS.md](AGENTS.md): contributor rules, with area guides in `src/server`, `src/features` and `tests`
