# ACME Salary Management

HR salary management app (Next.js + tRPC + PostgreSQL). Scope and design live in [`docs/`](docs/); contributor rules in [`AGENTS.md`](AGENTS.md).

> Status: backend foundation. Migrations create the lookup and Better Auth tables; `npm run db:seed` adds the lookups (7 countries, 6 currencies, 5 departments) and the demo HR account. Better Auth serves `/api/auth/*` (email/password sign-in, sign-up disabled) and tRPC serves `/api/trpc` with session-guarded `lookups.get`, `employees.list/get/create/update` (creation saves the initial salary as history revision 1) and `salaries.update/history` (salary changes checked against the expected revision; history newest first). The UI has the sign-in page (`/login`, showing the demo credentials) and the signed-in workspace shell with sign-out; `/employees` is still a placeholder (`/` redirects there). There are no employees in the seed.

## Prerequisites

- Node.js 24 LTS and npm 11
- Docker with Docker Compose

## Setup

```bash
docker compose up -d      # PostgreSQL 17 on host port 55432 (creates the acme_owner and acme_app roles)
cp .env.example .env      # local-only values; change the secrets for anything shared
npm install
npm run db:migrate        # apply drizzle/ migrations as the owner role
npm run db:seed           # demo HR account + lookups; safe to re-run
npm run dev               # http://localhost:3000
```

The demo HR account signs in with `DEMO_HR_EMAIL` / `DEMO_HR_PASSWORD` from `.env` (`POST /api/auth/sign-in/email`). `npm run db:reset` empties every app and auth table (schema and migrations stay) before a fresh `npm run db:seed`.

The Compose database listens on `127.0.0.1:55432` (not 5432) to avoid clashing with other local PostgreSQL instances. If you change it, update both URLs in `.env`.

## Checks

```bash
npm test                  # unit tests (tests/unit)
npm run test:db           # database tests (tests/db) against a fresh `acme_test` on the Compose database
npm run lint              # ESLint, including the architecture boundary rules
npm run typecheck         # route types + tsc
npm run build             # production build (needs the app variables from .env)
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests and build on every push and pull request, and `npm run test:db`, `db:migrate` and `db:seed` against a PostgreSQL 17 service.
