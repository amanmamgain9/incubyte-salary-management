# AGENTS.md

ACME salary management: one Next.js app (UI + tRPC) on PostgreSQL that lets an HR manager maintain records and salary history for 10,000 employees and run four pay reports.
Scope, contracts and design live in [`docs/`](docs/): requirements, data model, architecture, login, tRPC contracts, data generation, design language and screens.
**Read the doc for the area you are touching before writing code.** `docs/trpc-contracts.md` is the API source of truth; if code and a doc disagree, fix one of them in the same change.
This is Next.js 16: `proxy.ts` replaces `middleware.ts`; `params`, `searchParams`, `cookies()` and `headers()` are async only; `next lint` is gone and `next build` does not lint. Check `node_modules/next/dist/docs/` before using any Next API.

## Top rules

1. Create files only at the planned paths and names; search before adding anything (Top-level structure, area guide trees, Placement & reuse).
2. Shared code has one home; the second copy is extracted in the same change, never forked (Placement & reuse).
3. Backend layers: router → `operations.ts` → `queries.ts` → schema; a router makes one operation call (`src/server/AGENTS.md` › Layering).
4. Every procedure uses `signedInProcedure` or `signedInMutationProcedure`; auth is checked nowhere else (`src/server/AGENTS.md` › Middleware).
5. Static rules live in Zod contracts; DB/clock rules in operations, thrown as `core/errors.ts` errors keyed by field (`src/server/AGENTS.md` › Validation).
6. Every list and report pages through `paginateKeyset`; no offsets or hand-made cursors (`src/server/AGENTS.md` › Pagination).
7. Money math runs in SQL `NUMERIC` or `lib/money.ts`, never `Number`; currencies are never summed or charted together (`src/server/AGENTS.md` › Reports, `src/features/AGENTS.md` › UI).
8. Pay changes only through `changeSalary`; history is append-only via `appendSalaryRevision` (`src/server/AGENTS.md` › Module ownership).
9. The migration that creates a table also grants the app role on it (`src/server/AGENTS.md` › Data access).
10. Config comes only from `getEnv()`/`ownerEnv()` in `src/server/env.ts` (`src/server/AGENTS.md` › Environment).
11. Frontend never imports `@/server`; features import each other only along the allow-list (Lint, `src/features/AGENTS.md` › Boundaries).
12. Screens use `components/ui` and `@theme` tokens; no pasted class strings or color literals (`src/features/AGENTS.md` › UI).
13. URL state via `useUrlState`, forms via `useForm` inside a `<Dialog>` opened by `useDialog`, writes via `use-<feature>-mutations.ts` with keyed invalidation (`src/features/AGENTS.md`).
14. Totals and counts come from the API; never aggregate paginated rows on the client (`src/features/AGENTS.md` › Components).
15. Core rules land red → green; only a red commit may fail `npm test` (Testing essentials).
16. Done means typecheck, lint and tests pass and the docs match the code (Definition of done).

## Area guides

Each area has its own guide. Nested guides load automatically when an agent works inside that folder (the `CLAUDE.md` beside each one imports it). Before touching an area, read its guide.

| Guide | Read before touching |
| --- | --- |
| `src/server/AGENTS.md` | `src/server/`, `src/contracts/`, migrations in `drizzle/`, SQL in `scripts/db/` |
| `src/features/AGENTS.md` | `src/app/`, `src/features/`, `src/components/`, `src/hooks/`, `src/lib/`, `src/trpc/` |
| `tests/AGENTS.md` | `tests/`, `scripts/` |

## Top-level structure

Every folder and file here and in the area guide trees is planned. Create files at these paths with these names; add new files only as Placement & reuse allows.

```text
.
├── AGENTS.md / CLAUDE.md     # root agent rules (this file); CLAUDE.md only imports it
├── BRIEF.md                  # assignment brief (read-only)
├── README.md                 # setup, run, test, seed and deploy steps that work today
├── package.json              # scripts: dev, build, start, typecheck, lint, test, test:db, test:e2e, db:generate, db:migrate, db:reset, db:seed, db:verify, bench
├── tsconfig.json             # strict, noUncheckedIndexedAccess; `@/*` → `src/*`, `@scripts/*` → `scripts/*`
├── next.config.ts            # typedRoutes; `/` → `/employees` redirect (config, not a page)
├── eslint.config.mjs         # flat config: eslint-config-next + the boundary rules (see Lint)
├── postcss.config.mjs        # @tailwindcss/postcss only
├── drizzle.config.ts         # schema = src/server/db/schema, out = drizzle/, owner URL from ownerEnv()
├── vitest.config.ts          # projects `unit` (tests/unit) and `db` (tests/db); aliases `server-only` to a stub
├── playwright.config.ts      # e2e against `next start` + a freshly seeded `<db>_e2e` database
├── docker-compose.yml        # local PostgreSQL; runs scripts/db/init-roles.sql
├── .env.example              # every variable env.ts reads, with safe local values
├── .github/workflows/ci.yml  # CI: typecheck, lint, unit tests, build; db tests on a postgres:17 service; Node from package.json engines
├── drizzle/                  # generated, committed migrations; each GRANTs the app role on the tables it creates
├── docs/                     # product docs + static screen prototypes (reference only)
├── scripts/                  # seed, migrate, verify, benchmark (tree in tests/AGENTS.md)
├── tests/                    # unit, db and e2e tests only (tree in tests/AGENTS.md)
└── src/
    ├── app/                  # routing files only
    ├── features/             # screen-level UI per feature
    ├── components/           # UI primitives and charts; no feature or API knowledge
    ├── hooks/                # client hooks shared by 2+ features
    ├── lib/                  # pure helpers usable on server, client and scripts
    ├── trpc/                 # tRPC client/server wiring, the one QueryClient factory, router types
    ├── contracts/            # Zod schemas for every procedure input/output
    └── server/               # backend: env, db, auth, api, core and feature modules
```

## Placement & reuse

- **Search first.** Before creating a component, hook, helper, schema, query or type: check the trees here and in the area guides, then `rg -n "<concept>" src scripts`. If it exists, use it.
- **Shared things (used by 2+ features) have one home by kind:** UI primitive/chart → `src/components/{ui,charts}`; client hook → `src/hooks`; pure helper (format, money, dates, parsing) → `src/lib`; schema or type crossing the API → `src/contracts`; backend cross-cutting (errors, cursor, pagination) → `src/server/core`; shared by 2+ reports → `src/features/reports/` root (UI) or `src/server/reports/filters.ts` (SQL).
- **Rule of two.** The second copy of logic, markup or a class string is extracted to its home in the same change, and both call sites use it. Never leave two versions.
- **Extend, don't fork.** Add a variant, prop or option to the existing helper. If it then needs more than ~4 options or branches on the caller, split it by purpose and name both clearly.
- **Defined once:**
  - Types come from Zod via `z.infer` in `src/contracts`; no parallel interfaces. Frontend imports named contract types; `RouterOutputs[...]` only where no contract type exists, and never re-aliased in more than one file (export a named type from the contract instead).
  - `EmploymentStatus`: `contracts/employees.ts`. Its label/tone: `features/employees/employment-status-badge.tsx`.
  - "Active on date X": `isActiveOn` in `server/employees/status.ts`, used by the directory status filter and the commitment, department and benchmark reports. The data generator's manifest is deliberately independent.
  - Money arithmetic: `lib/money.ts` (client, scripts) and SQL `NUMERIC` (server). Never `Number` math on amounts.
  - Formatting: `lib/format.ts`. Lookup names and options: `hooks/use-lookups.ts`.
  - The QueryClient: `trpc/query-client.ts`. Pools: `server/db/connect.ts`. Env: `server/env.ts`.
- **Promote, then delete.** Moving code to a shared home deletes the original and updates every import in the same change. No re-export shims.
- **Place by usage.** Used by one screen/report → its subfolder. Used by one feature → the feature root. Used by 2+ → the shared home above.
- **Folders earn their place.** A screen gets its own subfolder only at 3+ files; until then its files sit in the feature root. No `utils.ts`, `helpers.ts`, `shared.ts`, `common/`, `domain/`, `types.ts` dumping grounds.
- **Split a file when** a `.tsx` passes 200 lines or a `.ts` passes 300; it mixes data shaping with JSX (move shaping to `*-data.ts`); it has two unrelated exports; or a part needs its own unit test.
- **Naming.** kebab-case files named after their main export (`employee-table.tsx` → `EmployeeTable`). One name per concept across contract, router key, server folder, frontend folder and route: `lookups` (never "reference data"); `salaryGrowth` ↔ `salary-growth`; `historicalSalaryBenchmark` ↔ `historical-salary-benchmark`. No generic exported names (`data`, `count`, `month`).
- **Fields** use the contract's snake_case names end-to-end: DB columns, Drizzle keys, Zod schemas, form field names. Locals are camelCase. Better Auth tables keep their generated names.
- **Imports.** `./x` for same-folder siblings; everything else `@/…` (or `@scripts/…` for `scripts/`, from scripts and tests only). No `../`. Named exports only, except Next route files and config files. No barrel files except `db/schema/index.ts`.
- **No dead code.** Delete unused files, exports and commented-out code in the change that orphans them.

## Lint

`npm run lint` (`eslint.config.mjs`, all errors) enforces import boundaries, single import sites per library, `process.env` access, color tokens, `sql.raw`, keyless `invalidateQueries()`, file size caps, named exports, import cycles and floating promises.
Fix the code to satisfy it; never disable a rule or add an `eslint-disable` comment.

## Testing essentials

- TDD for business logic: failing test, pass, refactor. Test behavior, not markup.
- Core rules land as a red → green pair. Red: `test(scope): <behavior>` with the failing test (unit or db) plus a stub that throws `new Error("not implemented")`, so typecheck and lint pass and only the new test fails. Green: `feat(scope): …` replaces the stub. Red commits are the only ones where `npm test`/`test:db` may fail. Core rules: cursor codec, `paginateKeyset`, domain-error mapping, salary revision (expected revision, conflict, history append, departed rejected), employment-date validation, salary delta, each report's numbers. All other changes commit tests with the implementation.
- Test layout, harness, fixtures and required coverage: `tests/AGENTS.md`.

## Definition of done (every change)

- [ ] Relevant doc read; searched for an existing helper/component/schema before adding one.
- [ ] Code at the planned path and name; no second copy of a type, rule, primitive or class string.
- [ ] Failing test written first for business logic; unit tests added/updated.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass (red commit: only its new test fails); `npm run test:db` if server/db changed; `npm run test:e2e` if a user flow changed.
- [ ] Migrations generated (`npm run db:generate`) with their grants and committed for schema changes; `.env.example` updated for new env vars.
- [ ] Docs updated in the same change when behavior, contracts or setup change. README describes only what works today.
- [ ] One small, focused change → one Conventional Commit (a core rule → its red → green pair): `type(scope): summary`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `ci`, `chore`. Scopes: `auth`, `employees`, `salaries`, `lookups`, `reports`, `ui`, `api`, `core` (`src/server/core`), `db`, `scripts`, `e2e`, `docs`; `ci` commits need none.
