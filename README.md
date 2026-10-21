# ACME Salary Management

HR salary management app (Next.js + tRPC + PostgreSQL). Scope and design live in [`docs/`](docs/); contributor rules in [`AGENTS.md`](AGENTS.md).

> Status: tooling scaffold. The app currently serves a placeholder `/employees` page (`/` redirects there); no database schema, auth or features yet.

## Prerequisites

- Node.js 24 LTS and npm 11
- Docker with Docker Compose

## Setup

```bash
docker compose up -d      # PostgreSQL 17 on host port 55432 (creates the acme_owner and acme_app roles)
cp .env.example .env      # local-only values; change the secrets for anything shared
npm install
npm run dev               # http://localhost:3000
```

The Compose database listens on `127.0.0.1:55432` (not 5432) to avoid clashing with other local PostgreSQL instances. If you change it, update both URLs in `.env`.

## Checks

```bash
npm test                  # unit tests (tests/unit)
npm run test:db           # database tests (tests/db) against a fresh `acme_test` on the Compose database
npm run lint              # ESLint, including the architecture boundary rules
npm run typecheck         # route types + tsc
npm run build             # production build
```

CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests and build on every push and pull request, and `npm run test:db` against a PostgreSQL 17 service.
