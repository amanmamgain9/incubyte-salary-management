# ACME Salary Management

HR salary management app (Next.js + tRPC + PostgreSQL). Scope and design live in [`docs/`](docs/); contributor rules in [`AGENTS.md`](AGENTS.md).

> Status: backend foundation. Migrations create the lookup, employee, salary history and Better Auth tables; `npm run db:seed` adds the lookups (7 countries, 6 currencies, 5 departments), the demo HR account and 10,000 generated employees with up to 15 years of salary history. Better Auth serves `/api/auth/*` (email/password sign-in, sign-up disabled) and tRPC serves `/api/trpc` with session-guarded `lookups.get`, `employees.list/get/create/update` (creation saves the initial salary as history revision 1) and `salaries.update/history` (salary changes checked against the expected revision; history newest first). The UI has the sign-in page (`/login`, showing the demo credentials), the signed-in workspace shell with sign-out, and the employee directory (`/employees`, `/` redirects there): search, country/department/status filters, workforce overview and Previous/Next pagination, all in the URL. Directory rows open the employee profile (`/employees/<id>`: details, current pay and the paginated read-only salary history). Forms are modal dialogs deep-linked by `?dialog=`: Add employee over the directory (`create`), Edit details (`edit`) and Change salary (`salary`, active and upcoming employees, with a reload on a stale revision) over the profile; a save closes the dialog and shows a success notice. Reports are not built yet.

## Prerequisites

- Node.js 24 LTS and npm 11
- Docker with Docker Compose

## Setup

```bash
docker compose up -d      # PostgreSQL 17 on host port 55432 (creates the acme_owner and acme_app roles)
cp .env.example .env      # local-only values; change the secrets for anything shared
npm install
npm run db:migrate        # apply drizzle/ migrations as the owner role
npm run db:seed           # demo HR account, lookups, 10,000 employees + history (as_of = today UTC)
npm run db:verify         # compare the seeded data with the generator's expected numbers
npm run dev               # http://localhost:3000
```

The demo HR account signs in with `DEMO_HR_EMAIL` / `DEMO_HR_PASSWORD` from `.env` (`POST /api/auth/sign-in/email`). `npm run db:reset` empties every app and auth table (schema and migrations stay); the seed refuses to add employees on top of existing ones, so reseed with `npm run db:reset && npm run db:seed`. Pass `-- --seed <text> --as-of YYYY-MM-DD` to `db:seed` (and `db:verify`) to reproduce a dataset; reports use today's UTC date, so reseed (or record the `as_of`) when deploying.

`npm run bench` times each report request on the seeded database (`-- --explain` adds the benchmark snapshot plan); results are in [architecture](docs/architecture.md#report-performance).

The Compose database listens on `127.0.0.1:55432` (not 5432) to avoid clashing with other local PostgreSQL instances. If you change it, update both URLs in `.env`.

## Checks

```bash
npm test                  # unit tests (tests/unit)
npm run test:db           # database tests (tests/db) against a fresh `acme_test` on the Compose database
npm run test:e2e          # Playwright: builds, serves on :3100 against a fresh `acme_e2e`; sign-in, directory, create/edit/salary dialogs (first: npx playwright install chromium)
npm run lint              # ESLint, including the architecture boundary rules
npm run typecheck         # route types + tsc
npm run build             # production build (needs the app variables from .env)
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests and build on every push and pull request, `npm run test:db`, `db:migrate`, `db:seed` and `db:verify` against a PostgreSQL 17 service, and `npm run test:e2e` (Chromium) against another.
