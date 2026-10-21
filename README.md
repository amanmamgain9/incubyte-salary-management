# ACME Salary Management

HR salary management app (Next.js + tRPC + PostgreSQL). Scope and design live in [`docs/`](docs/); contributor rules in [`AGENTS.md`](AGENTS.md).

> Status: tooling scaffold. The app currently serves a placeholder `/employees` page (`/` redirects there); no database schema, auth or features yet.

## Prerequisites

- Node.js 24 LTS and npm 11

## Setup

```bash
npm install
npm run dev               # http://localhost:3000
```

## Checks

```bash
npm run typecheck         # route types + tsc
npm run build             # production build
```
