# AGENTS.md

ACME salary management: one Next.js app (UI + tRPC) on PostgreSQL that lets an HR manager maintain records and salary history for 10,000 employees and run four pay reports.
Scope, contracts and design live in [`docs/`](docs/): requirements, data model, architecture, login, tRPC contracts, data generation, design language and screens.
**Read the doc for the area you are touching before writing code.** `docs/trpc-contracts.md` is the API source of truth; if code and a doc disagree, fix one of them in the same change.
This is Next.js 16: `proxy.ts` replaces `middleware.ts`; `params`, `searchParams`, `cookies()` and `headers()` are async only; `next lint` is gone and `next build` does not lint. Check `node_modules/next/dist/docs/` before using any Next API.

## 1. File structure

Every folder and file below is planned. Create files at these paths with these names; add new files only as sections 2–3 allow.

### Root

```text
.
├── AGENTS.md / CLAUDE.md     # agent rules (this file); CLAUDE.md only imports it
├── BRIEF.md                  # assignment brief (read-only)
├── README.md                 # setup, run, test, seed and deploy steps that work today
├── package.json              # scripts: dev, build, start, typecheck, lint, test, test:db, test:e2e, db:generate, db:migrate, db:reset, db:seed, db:verify, bench
├── tsconfig.json             # strict, noUncheckedIndexedAccess; `@/*` → `src/*`
├── next.config.ts            # typedRoutes; `/` → `/employees` redirect (config, not a page)
├── eslint.config.mjs         # flat config: eslint-config-next + the boundary rules in §6
├── postcss.config.mjs        # @tailwindcss/postcss only
├── drizzle.config.ts         # schema = src/server/db/schema, out = drizzle/, owner URL from ownerEnv()
├── vitest.config.ts          # projects `unit` (tests/unit) and `db` (tests/db); aliases `server-only` to a stub
├── playwright.config.ts      # e2e against `next start` + a freshly seeded `<db>_e2e` database
├── docker-compose.yml        # local PostgreSQL; runs scripts/db/init-roles.sql
├── .env.example              # every variable env.ts reads, with safe local values
├── drizzle/                  # generated, committed migrations; each GRANTs the app role on the tables it creates
├── docs/                     # product docs + static screen prototypes (reference only)
├── scripts/                  # seed, migrate, verify, benchmark (tree below)
├── tests/                    # unit, db and e2e tests only (tree below)
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

### `src/server` (backend)

```text
src/server/
├── env.ts                         # THE env module: lazy `getEnv()` (app, incl. `appOrigin`) + `ownerEnv()` (owner URL only); script-safe
├── db/
│   ├── connect.ts                 # `createDb(url)`: the only file that imports `pg` / creates a Pool
│   ├── client.ts                  # server-only app-role `db` from getEnv().DATABASE_URL
│   ├── owner.ts                   # owner-role `db` for migrate, reset, seed, verify, test setup
│   └── schema/
│       ├── index.ts               # re-exports all tables (the only barrel file in src/)
│       ├── auth.ts                # Better Auth generated tables (user, account, session, verification)
│       ├── lookups.ts             # countries, currencies, departments
│       ├── employees.ts           # employees table + indexes from data-model.md
│       └── salary-history.ts      # salary_history; unique (employee_id, revision), (changed_at, employee_id) index
├── auth/
│   ├── auth.ts                    # betterAuth(): Drizzle adapter, email/password, signup off, cookie cache off; secret/baseURL from env
│   └── session.ts                 # getSessionUser(headers) → { id, name, email } | null
├── api/
│   ├── trpc.ts                    # initTRPC, router, `signedInProcedure`, `signedInMutationProcedure`
│   ├── error-formatter.ts         # generic: field errors from ZodError/ValidationError/ConflictError → data.field_errors; unexpected → generic message
│   ├── context.ts                 # createContext({ headers }) → { db, headers, now }
│   ├── root.ts                    # appRouter + `AppRouter` type
│   ├── middleware/
│   │   ├── map-domain-errors.ts   # the ONE domain-error → TRPCError mapping; logs unexpected errors (no inputs)
│   │   ├── require-same-origin.ts # rejects mutations whose Origin ≠ getEnv().appOrigin
│   │   ├── require-session.ts     # adds ctx.user or throws UNAUTHORIZED
│   │   └── operation-context.ts   # builds ctx.op: OperationContext from db, user, now
│   └── routers/
│       ├── lookups.ts             # lookups.get
│       ├── employees.ts           # employees.list/get/create/update
│       ├── salaries.ts            # salaries.history/update
│       └── reports.ts             # reports.salaryCommitment/departmentBreakdown/salaryGrowth/historicalSalaryBenchmark
├── core/                          # cross-cutting backend code; the only shared server folder
│   ├── errors.ts                  # NotFoundError, ConflictError, ValidationError(field_errors), InvalidCursorError, pg violation guards
│   ├── cursor.ts                  # createCursorCodec(secret): HMAC sign/verify; default codec uses getEnv().CURSOR_SECRET
│   ├── pagination.ts              # paginateKeyset(): the only pagination implementation
│   └── operation-context.ts       # OperationContext type { db, actor, now, today }
├── lookups/
│   ├── queries.ts                 # select countries/departments/currencies
│   └── operations.ts              # getLookups, assertKnownCodes (field-keyed ValidationError)
├── employees/
│   ├── status.ts                  # isActiveOn(date), employmentStatusOn(date) SQL expressions
│   ├── queries.ts                 # directory page/count/summary, EmployeeView select (incl. salary_revision), insert, details update
│   └── operations.ts              # listEmployees, getEmployee, createEmployee, updateEmployeeDetails
├── salaries/
│   ├── queries.ts                 # lock employee row, insert history, update current pay + salary_revision, history page/count
│   └── operations.ts              # appendSalaryRevision, changeSalary, listSalaryHistory
└── reports/
    ├── filters.ts                 # SQL predicates for country/department/currency report filters
    ├── salary-commitment/
    │   ├── queries.ts             # active-today rows by country/currency + headcount summary
    │   └── operations.ts          # salaryCommitment(op, input)
    ├── department-breakdown/
    │   ├── queries.ts             # active-today rows by country/department/currency + by-country/by-department summary
    │   └── operations.ts          # departmentBreakdown(op, input)
    ├── salary-growth/
    │   ├── queries.ts             # predecessor-aware monthly increases/decreases/switches, summary, 12-month trend
    │   └── operations.ts          # salaryGrowth(op, input)
    └── historical-salary-benchmark/
        ├── queries.ts             # month-end snapshots, percentiles, country median, YoY, final-snapshot summary, monthly trend
        └── operations.ts          # historicalSalaryBenchmark(op, input)
```

### `src/contracts` (shared Zod)

```text
src/contracts/
├── primitives.ts                  # IsoDate, Month (YYYY-MM), Timestamp, Money (input: positive, ≤2 dp), Decimal (output: signed, 2 dp), codes, EmployeeId, array caps (MAX_COUNTRIES …)
├── paging.ts                      # Paging input, page(item) output factory (next/prev cursor, total_count, range_start), DEFAULT_LIMIT 50, MAX_LIMIT 100
├── errors.ts                      # FieldErrors shape of error.data.field_errors
├── lookups.ts                     # Country, Department, Currency, lookups.get output
├── employees.ts                   # EmploymentStatus (only definition), EmployeeInput, DetailsPatch, EmployeeFilters, EmployeeView, DirectorySummary, get/list/update inputs and outputs
├── salaries.ts                    # HistoryView, history input, salary update input
└── reports/
    ├── filters.ts                 # shared country/department/currency filter fields
    ├── salary-commitment.ts       # input, Row, CountryCount, Summary, output
    ├── department-breakdown.ts    # input, Row, CountrySummary, DepartmentPoint, output
    ├── salary-growth.ts           # input (from ≤ to), Row, GrowthTotal, GrowthPoint, output
    └── historical-salary-benchmark.ts  # input (first-of-month from, ≤ 180 months), Row, SnapshotTotal, BenchmarkPoint, output
```

### `src/app` (routes)

```text
src/app/
├── layout.tsx                     # <html>, Inter via next/font/local, globals.css, <TRPCReactProvider>
├── globals.css                    # Tailwind v4 import + the single @theme token set (colors, radius, shadow, font)
├── fonts/                         # inter-latin.woff2 + Inter-LICENSE.txt
├── not-found.tsx                  # 404 via <EmptyState>
├── login/page.tsx                 # signed in → redirect('/employees'); else <LoginScreen demo={env demo credentials}>
├── (workspace)/
│   ├── layout.tsx                 # getSessionUser once → redirect('/login') if absent; <WorkspaceShell user>
│   ├── loading.tsx / error.tsx    # <LoadingState> / <ErrorState retry> for every workspace page
│   ├── employees/page.tsx                     # prefetch employees.list + lookups → <EmployeeDirectory>
│   ├── employees/new/page.tsx                 # prefetch lookups → <CreateEmployeeForm>
│   ├── employees/[id]/page.tsx                # employees.get (404 → notFound()) + salaries.history → <EmployeeProfile>
│   ├── employees/[id]/edit/page.tsx           # employees.get + lookups → <EditEmployeeForm>
│   ├── employees/[id]/salary/page.tsx         # employees.get + lookups → <ChangeSalaryForm>
│   └── reports/<report>/page.tsx              # one per report folder name; prefetch report + lookups → <…Report>
└── api/
    ├── trpc/[trpc]/route.ts       # fetchRequestHandler(appRouter, createContext); Cache-Control: no-store
    └── auth/[...all]/route.ts     # Better Auth handler (login/logout/session)
```

### `src/features`, `src/components`, `src/hooks`, `src/lib`, `src/trpc` (frontend)

```text
src/features/
├── auth/
│   ├── auth-client.ts             # Better Auth React client (only auth uses it)
│   ├── login-screen.tsx           # centered brand panel + demo credentials + <LoginForm>
│   ├── login-form.tsx             # client: email/password, show password, inline error
│   └── sign-out-button.tsx        # client: signOut → queryClient.clear() → /login
├── workspace/
│   ├── workspace-shell.tsx        # nav rail + content column
│   ├── nav-items.ts               # ordered links: Employees + 4 reports, with icon names
│   ├── mobile-nav.tsx             # client: labelled collapsible menu
│   └── account-footer.tsx         # signed-in user + <SignOutButton>
├── employees/
│   ├── use-employee-mutations.ts  # employees.create/update + their invalidation
│   ├── employee-fields.tsx        # field group shared by create and edit forms
│   ├── employment-status-badge.tsx  # EmploymentStatus → <Badge> label/tone (only mapping)
│   ├── create-employee-form.tsx   # employees.create form (ID, details, initial pay + currency)
│   ├── edit-employee-form.tsx     # employees.update form ({ id, ...changes }; submit disabled until a change); ID locked; set/clear last working day
│   ├── directory/
│   │   ├── employee-directory.tsx # title/action → filters → overview → table
│   │   ├── directory-filters.tsx  # search, country, department, status
│   │   ├── directory-overview.tsx # 2–4 measures from API data, never from the current page
│   │   ├── employee-table.tsx     # rows + <Pagination>
│   │   └── search-params.ts       # directory input schema from EmployeeFilters + Paging, with .catch defaults
│   └── profile/
│       ├── employee-profile.tsx   # name/status/actions → details + current pay → history; saved notice
│       ├── employee-details.tsx   # details list
│       └── current-pay.tsx        # amount, currency, revision
├── salaries/
│   ├── use-salary-mutations.ts    # salaries.update + its invalidation
│   ├── change-salary-form.tsx     # current pay/revision, new amount/currency, reason, conflict reload
│   ├── salary-delta.ts            # pure: change and % vs current; null across currencies
│   └── salary-history-table.tsx   # read-only paginated history (rendered by employees/profile)
└── reports/
    ├── report-page.tsx            # shell: header → filters → overview/trends → table; owns query + cursor wiring
    ├── report-filters.tsx         # country/department/currency/date/month controls, configured per report
    ├── country-totals.tsx         # by-country/currency summary groups used by all four reports
    ├── search-params.ts           # build a report's input from URL params + defaults(today)
    └── <report>/                  # salary-commitment | department-breakdown | salary-growth | historical-salary-benchmark
        ├── <report>-report.tsx    # composes <ReportPage> with this report's parts
        ├── <report>-summary.tsx   # overview measures for this report
        ├── <report>-table.tsx     # column definitions for <Table>
        ├── <report>-chart.tsx     # not for salary-commitment; renders a bounded contract field
        └── <report>-data.ts       # pure reshaping for summary/chart (only if there is logic) + unit test

src/components/
├── ui/                            # primitives, built before any feature screen
│   ├── button.tsx                 # variants: primary | secondary | ghost | danger; size; `pending`
│   ├── alert.tsx                  # info | success | error notices (role="alert" for errors, "status" otherwise)
│   ├── page-header.tsx            # title + optional back link + one primary action
│   ├── card.tsx                   # white data surface (no nesting)
│   ├── overview.tsx / stat.tsx    # overview block: scope line + 2–4 measures + optional visual slot
│   ├── table.tsx                  # Table/Head/Row/Cell, local horizontal scroller, numeric alignment, sticky first column
│   ├── pagination.tsx             # Previous/Next over opaque cursors + "x–y of total"
│   ├── empty-state.tsx / loading-state.tsx / error-state.tsx  # standard states (error has retry)
│   ├── form-field.tsx             # label + control slot + hint + error, wires aria-describedby
│   ├── input.tsx / select.tsx / textarea.tsx  # 38px controls; select takes `options`
│   ├── date-picker.tsx            # the one DayPicker + Radix popover (dates and months, clearable)
│   ├── amount.tsx                 # tabular right-aligned money with visible currency
│   ├── badge.tsx                  # neutral/semantic tones; no domain knowledge
│   └── icon.tsx                   # 18px icon wrapper; the only icon-library import site
└── charts/                        # the only chart-library import site
    ├── bar-chart.tsx              # horizontal/vertical bars, negative values
    ├── line-chart.tsx             # lines with optional range band (P10–P90) and reference line
    └── chart-legend.tsx           # legend keyed to token colors

src/hooks/
├── use-url-state.ts               # useUrlState(schema): read/patch search params; patching any key except `cursor` drops `cursor`
├── use-form.ts                    # values, `changes` vs initial, field errors, submit via onSubmit promise, toFieldErrors, focus first error, inputProps(name)
└── use-lookups.ts                 # lookups.get + countryName/departmentName/currencyName + select options

src/lib/
├── format.ts                      # formatMoney, formatCount, formatDate, formatMonth, formatPercent (the only Intl use)
├── money.ts                       # decimal string ↔ integer minor units, exact compare/diff
├── dates.ts                       # todayUtc, month start/end, addMonths, monthsBetween (UTC)
├── search-params.ts               # parseSearchParams(schema, raw) used by pages and useUrlState
├── mutation-errors.ts             # toFieldErrors(error) → { fields, message }
├── product-defaults.ts            # default report ranges (benchmark: 24 months ending this month) and form selections, from `today`
└── cn.ts                          # className merge

src/trpc/
├── query-client.ts                # makeQueryClient: the only QueryClient factory; defaults, dehydrate, global UNAUTHORIZED handler
├── client.tsx                     # client: TRPCReactProvider, useTRPC
├── server.tsx                     # server-only: options proxy, cached getQueryClient, prefetch, HydrateClient
└── router-types.ts                # RouterInputs / RouterOutputs (the only place they are derived)
```

### `tests/` and `scripts/`

```text
tests/                             # tests only: no benchmarks, seeders or one-off scripts
├── unit/                          # mirrors src/ and scripts/ paths; pure code; no DB, network or real clock
│   ├── server/core/{cursor,pagination,errors}.test.ts
│   ├── server/api/{error-formatter,map-domain-errors}.test.ts
│   ├── contracts/*.test.ts        # money/decimal, dates, first-of-month, 180 months, non-empty DetailsPatch
│   ├── lib/*.test.ts              # format, money, dates, search-params, mutation-errors, product-defaults
│   ├── features/**/*.test.ts      # every *-data.ts, salary-delta, search-params builders
│   └── scripts/data-generation/*.test.ts  # determinism, quotas, tenure, history rules, manifest arithmetic
├── db/                            # integration against a disposable PostgreSQL database
│   ├── global-setup.ts            # drop/create `<db>_test`, migrate once as owner
│   ├── harness.ts                 # resetTables(), callerFor(user) (see §6)
│   ├── fixtures.ts                # minimal builders: lookups, HR user, employee + history
│   ├── constraints.test.ts / grants.test.ts  # FKs, checks, unique revision; app role cannot UPDATE/DELETE history
│   ├── employees.test.ts          # list filters/search/status boundaries, create (+ revision 1), duplicate ID, details edit
│   ├── salaries.test.ts           # change, stale revision, non-active employee, rollback, history paging
│   ├── procedures.test.ts         # createCaller: auth, same-origin, error codes, field_errors, invalid cursor
│   └── reports/<report>.test.ts   # report numbers on small fixtures (known cases in docs/data-generation.md)
└── e2e/
    ├── global-setup.ts            # drop/create, migrate and seed `<db>_e2e`
    ├── auth.spec.ts               # login error, login, sign out
    ├── employees.spec.ts          # directory search/filter/paging, create, edit, departure
    ├── salaries.spec.ts           # salary change incl. conflict reload
    └── reports.spec.ts            # each report renders and filters

scripts/
├── db/
│   ├── init-roles.sql             # local/CI only: owner and app roles
│   ├── migrate.ts                 # apply drizzle/ as owner
│   ├── reset.ts                   # explicit wipe before reseeding
│   ├── seed.ts                    # HR account first (better-auth/crypto hashPassword), then employees + history in bulk (--seed, --as-of)
│   └── verify.ts                  # run report queries and compare with the manifest (CI, after seeding)
├── data-generation/
│   ├── generate.ts                # pure deterministic generator (seed, as_of) → rows
│   ├── random.ts                  # seeded PRNG
│   ├── profiles.ts                # population, tenure, pay bands, review profiles from the doc
│   └── manifest.ts                # independent exact-arithmetic expected totals/percentiles
└── bench-reports.ts               # time each report on the seeded DB
```

## 2. How to reuse properly

- **Search first.** Before creating a component, hook, helper, schema, query or type: check the trees above, then `rg -n "<concept>" src scripts`. If it exists, use it.
- **Shared things go in exactly one place by kind:**

  | Kind (used by 2+ features) | Home |
  | --- | --- |
  | UI primitive / chart | `src/components/ui`, `src/components/charts` |
  | Client hook | `src/hooks` |
  | Pure helper (format, money, dates, parsing) | `src/lib` |
  | Schema or type crossing the API | `src/contracts` |
  | Backend cross-cutting (errors, cursor, pagination) | `src/server/core` |
  | Shared by 2+ reports (UI) | `src/features/reports/` root |
  | Shared by 2+ report queries (SQL) | `src/server/reports/filters.ts` |

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

## 3. Keeping the file structure good

- **Place by usage.** Used by one screen/report → its subfolder. Used by one feature → the feature root. Used by 2+ → the shared home in §2.
- **Folders earn their place.** A screen gets its own subfolder only at 3+ files; until then its files sit in the feature root. No `utils.ts`, `helpers.ts`, `shared.ts`, `common/`, `domain/`, `types.ts` dumping grounds.
- **Backend file kinds.** SQL → `queries.ts`; rules and transactions → `operations.ts`; wiring → `api/routers/`. Only `employees/status.ts` and `reports/filters.ts` are extra.
- **`src/app` is routing only:** page/layout/loading/error/not-found/route. A page parses params, prefetches and renders one feature component.
- **Split a file when** a `.tsx` passes 200 lines or a `.ts` passes 300; it mixes data shaping with JSX (move shaping to `*-data.ts`); it has two unrelated exports; or a part needs its own unit test.
- **Naming.** kebab-case files named after their main export (`employee-table.tsx` → `EmployeeTable`). One name per concept across contract, router key, server folder, frontend folder and route: `lookups` (never "reference data"); `salaryGrowth` ↔ `salary-growth`; `historicalSalaryBenchmark` ↔ `historical-salary-benchmark`. No generic exported names (`data`, `count`, `month`).
- **Fields** use the contract's snake_case names end-to-end: DB columns, Drizzle keys, Zod schemas, form field names. Locals are camelCase. Better Auth tables keep their generated names.
- **Imports.** `./x` for same-folder siblings; everything else `@/…`. No `../`. Named exports only, except Next route files and config files. No barrel files except `db/schema/index.ts`.
- **No dead code.** Delete unused files, exports and commented-out code in the change that orphans them. App code never imports from `docs/`.

## 4. Backend rules

**Layering** (each layer imports only those to its right): `api/routers` → `<module>/operations.ts` → `<module>/queries.ts` → `db/schema`; `contracts` and `core` usable by all.

- Routers are thin: `.input(contract).output(contract)` and one operation call. No SQL, rules or try/catch. Sole exception: `salaries.update` calls `changeSalary` then `getEmployee` to return `EmployeeView`, so `salaries` never imports `employees`.
- Operations take `op: OperationContext` and parsed input, own transactions, throw `core/errors.ts` errors, and never import `@trpc/*` or `api/`.
- Script-safe modules (no `server-only`; importable by scripts and unit tests): `env.ts`, `db/connect.ts`, `db/owner.ts`, `db/schema/*`, every `queries.ts`, `employees/status.ts`, `reports/filters.ts`, `core/errors.ts`. They and `scripts/` import only each other. Queries take the executor as an argument and never import `db/client` or `env`.
- Every other server module starts with `import "server-only"`; no dynamic `await import()` to dodge it. No Server Actions: every read and write is a tRPC procedure.

**Middleware and procedures**
- Chain: `mapDomainErrors` → `requireSameOrigin` (mutations only) → `requireSession` → `operationContext`. Each does one thing; names say what is checked. There are no roles.
- `signedInProcedure` (queries) and `signedInMutationProcedure` (adds same-origin) in `api/trpc.ts`. Every procedure uses one; auth is checked there and nowhere else.
- Middleware and `error-formatter.ts` never branch on procedure paths, router names or feature-specific errors. A feature need is solved in its operation.
- Field errors are keyed by full dotted input path. Every input is flat (including `employees.update`), so paths equal form field names.

**Validation split**
- Zod (contracts): shape, format, static limits — 2 dp positive money, ISO dates, `from ≤ to`, first-of-month, ≤ 180 months, non-empty patch.
- Operations: rules needing the DB or clock — codes exist (`assertKnownCodes` on writes and list/report filters), employment dates against stored dates and salary history, expected revision, salary changes only for employees active today, `to ≤ today` (growth, benchmark) — as `ValidationError` keyed by field, `ConflictError` or `NotFoundError`.
- Duplicate employee ID: no pre-check SELECT; translate the primary-key violation to `ConflictError` with `field_errors.id`. Never leak SQL errors or constraint names.

**Pagination**
- Every list and report uses `paginateKeyset`. No offsets, `LIMIT` paging or cursor code anywhere else.
- The cursor is signed and binds `scope` plus a fingerprint of the parsed input minus `cursor`/`limit`, computed inside `paginateKeyset` from all input keys (sorted). Never build a fingerprint or filter list by hand. Mismatch or tampering → `InvalidCursorError` → `BAD_REQUEST`.

```ts
export async function paginateKeyset<Row, Key extends readonly unknown[]>(args: {
  scope: string;                                     // "reports.salaryGrowth"
  input: Paging & Record<string, unknown>;           // the parsed procedure input, as-is
  keyOf: (row: Row) => Key;                          // same columns as ORDER BY
  fetch: (from: { key: Key; before: boolean } | null, take: number) => Promise<Row[]>; // ORDER BY key (reversed when before), LIMIT take
  count: () => Promise<number>;
}): Promise<Page<Row>>;                              // { items, next_cursor, prev_cursor, total_count, range_start }
```

**Reports**
- Each report folder has exactly `queries.ts` + `operations.ts`. Operation body: input checks (`assertKnownCodes`; `to ≤ today` for growth/benchmark), then `return { rows: await paginateKeyset({...}), summary: await <summary query> }`; nothing else.
- Output contracts have no unbounded arrays except `Page.items`; every other array uses the `.max(n)` from the array-limits table in `docs/trpc-contracts.md` (constants in `contracts/primitives.ts`). Chart series are bounded `summary` fields defined in that doc and the contract first; never return all rows beside the page.
- SQL does all salary math (`NUMERIC`, exact percentiles, rounding); TypeScript only formats.

**Data access**
- CRUD uses the Drizzle query builder. Raw `sql` is for reports only and interpolates Drizzle tables/columns (`${employees.work_country_code}`); never table or column names in strings, never `sql.raw`.
- Connections come only from `db/client.ts` (app role) and `db/owner.ts` (owner role), both via `connect.ts`.
- Grants ship with each table: the migration that creates a table also GRANTs the app role (`acme_app`) exactly its privileges (appended to the generated SQL): `SELECT` on lookups; `SELECT, INSERT, UPDATE` on `employees`; `SELECT, INSERT` on `salary_history`; `SELECT, INSERT, UPDATE, DELETE` on Better Auth tables. No default privileges; `tests/db/grants.test.ts` checks every table in `public`.

**Module ownership** (imports: `employees` → `salaries` → `lookups`; `reports` read all; never the reverse)
- `lookups` owns countries/departments/currencies.
- `employees` owns the employee row and its details columns. `createEmployee` inserts the row with initial pay and `salary_revision = 1`, then calls `appendSalaryRevision` (revision 1, `Initial salary`) in the same transaction.
- `salaries` owns `salary_history` and, after insert, the current-pay columns (`annual_base_pay`, `salary_currency_code`, `salary_revision`). Only `changeSalary` updates them: it locks the row, checks `expected_revision` and that the employee is active today, updates current pay and appends history in one transaction.
- `appendSalaryRevision(tx, …)` is the only app code that inserts history; it snapshots the employee's current country/department. The seed bulk-inserts history as owner and is the only other writer.
- Modules may read any table in their own queries; writes follow this ownership.

**Environment and secrets**
- `src/server/env.ts` is the only reader of `process.env` in `src/` and `scripts/`. Importing it parses nothing: `getEnv()` validates the app variables on first call (memoized) and throws naming the bad keys, never values; `ownerEnv()` validates only `DATABASE_OWNER_URL`, so drizzle-kit and owner scripts need nothing else. Pass values to libraries explicitly (`betterAuth({ secret, baseURL })`).
- Origin checks compare the request `Origin` with `getEnv().appOrigin` (`new URL(APP_URL).origin`), never with the raw `APP_URL`.

```ts
const appEnvSchema = z.object({
  DATABASE_URL: z.url(), APP_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32), CURSOR_SECRET: z.string().min(32),
  DEMO_HR_EMAIL: z.email(), DEMO_HR_PASSWORD: z.string().min(12),
}).refine((e) => e.CURSOR_SECRET !== e.BETTER_AUTH_SECRET, { path: ["CURSOR_SECRET"] })
  .transform((e) => ({ ...e, appOrigin: new URL(e.APP_URL).origin }));
const ownerEnvSchema = z.object({ DATABASE_OWNER_URL: z.url() });
export function parseEnv(source): AppEnv; export function parseOwnerEnv(source): OwnerEnv; // pure, unit-tested
export function getEnv(): AppEnv;     // parseEnv(process.env), memoized
export function ownerEnv(): OwnerEnv; // parseOwnerEnv(process.env), memoized
```

**Side effects and caching**
- Queries never write app data: no refresh, backfill, audit or "last viewed" writes from a read (Better Auth's own session refresh is the only exception).
- No caches, materialized views or summary tables unless `scripts/bench-reports.ts` shows a report is too slow. If one is added, it is updated inside the write operation's transaction that changes its source — never from a read, middleware or a dedicated procedure.
- Logs never include inputs, cookies, passwords or session tokens. No `proxy.ts` for auth; authorization lives in procedures.

## 5. Frontend rules

**Boundaries**
- `features` → `components`, `hooks`, `lib`, `contracts`, `trpc`. Never `@/server`. Only `src/trpc` touches the server: `import type { AppRouter }`, plus `trpc/server.tsx` wiring `@/server/api`.
- Cross-feature imports are for rendering only: `employees` → `salaries` (`<SalaryHistoryTable>`) and `workspace` → `auth` (`<SignOutButton>`). Shared logic moves to `hooks`/`lib` instead.
- `components/*` import only `lib` and other components. `hooks` and `trpc` never import features; `lib` and `contracts` never import features, components, hooks or `trpc`.
- One import site per UI library: `recharts` → `components/charts/*`; `lucide-react` → `components/ui/icon.tsx`; DayPicker/Radix → `components/ui/date-picker.tsx`; `better-auth/react` → `features/auth/auth-client.ts`.

**App Router and data**
- `(workspace)/layout.tsx` and `login/page.tsx` are the only callers of `getSessionUser`. The layout redirect is UX only; procedures are the security boundary.
- Server pages: `await props.searchParams` (`PageProps<'/route'>`), build the input with the feature's `search-params.ts`, `prefetch(trpc.x.queryOptions(input))`, render `<HydrateClient><Feature /></HydrateClient>`.
- The client component builds its query input with the same `search-params.ts` function and the same `today` (passed from the page as a prop), so it hits the prefetched cache.
- Data-reading components use `useSuspenseQuery(trpc.x.queryOptions(input))`. `"use client"` goes on the component that needs hooks; keep its children presentational.
- Every route renders real content; no redirect-only or placeholder pages (redirects go in `next.config.ts`).
- UNAUTHORIZED is handled once in `trpc/query-client.ts` (clear cache, go to `/login`); pages and components never check for it.

**UI and styling**
- Build screens from `src/components/ui`. Never paste Tailwind class strings for buttons, alerts, headers, cards, tables or fields; add a variant instead.
- Colors, radii and shadows come only from `@theme` tokens in `src/app/globals.css`, ported once from `docs/screens/styles.input.css`. No hex/rgb/hsl values or arbitrary color classes (`bg-[#…]`) in components.
- Every amount renders through `<Amount>` with its currency. Currencies are never summed or charted together.
- No modals are planned. If one becomes necessary, build `components/ui/dialog.tsx` once (native `<dialog>`) with its open state in `useUrlState`; never per-screen `showModal`/backdrop/focus code.

**URL state**
- All search-param state goes through `useUrlState(schema)`. No direct `URLSearchParams`, `router.replace` with hand-built strings, `history.replaceState` or `as` casts.
- URL schemas derive from contract inputs (`.pick()`, coercion, `.catch(default)`), so bad params fall back to defaults.
- Defaults (report ranges, form selections) come from `lib/product-defaults.ts` as functions of `today`. Never hardcode dates or codes in components.

**Forms and mutations** (one pattern for every form)
- `useForm({ initial, onSubmit })` + `<FormField>` + `inputProps(name)`. `onSubmit` returns `mutation.mutateAsync(...)`; `useForm` maps errors through `toFieldErrors`, keeps values and focuses the first error. Forms never write their own try/catch, `onError` or pending flags; pending is `mutation.isPending`.
- The edit form sends `{ id, ...changes }`: only fields that differ from `initial` (a cleared date is `null`). Its submit is disabled while `changes` is empty, so an empty patch is never sent.
- Each feature's `use-<feature>-mutations.ts` owns its mutations and invalidation by path key: employee writes invalidate `trpc.employees.pathKey()` and `trpc.reports.pathKey()`; salary writes also invalidate `trpc.salaries.pathKey()`. Never `invalidateQueries()` without a key.
- On success, navigate to the profile with `?saved=created|details|salary`; the profile shows one `<Alert tone="success">`.
- Salary `CONFLICT`: keep form values, show the error with a reload action that refetches `employees.get` and adopts the new revision; the user resubmits.

**Components render; data files shape**
- Components contain JSX and event wiring only. Grouping, sorting, chart points and deltas live in tested `*-data.ts` (or `salary-delta.ts`) files beside them.
- Totals and counts come from the API. Never sum or count paginated rows on the client.
- Report screens differ only in summary, chart and table columns; URL parsing, query/cursor wiring and pagination live in `report-page.tsx` and are never rewritten per report.

## 6. Testing rules

- TDD for business logic: failing test, pass, refactor. Test behavior, not markup: no unit tests for JSX, layout, Tailwind, routers or `page.tsx`; e2e covers them.
- Core rules land as a red → green pair. Red: `test(scope): <behavior>` with the failing test (unit or db) plus a stub that throws `new Error("not implemented")`, so typecheck and lint pass and only the new test fails. Green: `feat(scope): …` replaces the stub. Red commits are the only ones where `npm test`/`test:db` may fail. Core rules: cursor codec, `paginateKeyset`, domain-error mapping, salary revision (expected revision, conflict, history append, active only), employment-date validation, salary delta, each report's numbers. All other changes commit tests with the implementation.
- `npm test` runs `tests/unit` only: fast, deterministic, no DB, network or real clock (pass `today`/`now` in).
- Required unit coverage: cursor codec, `paginateKeyset` (next/previous pages, range_start, fingerprint mismatch, tampering), error formatter and domain-error mapping, contract edge cases, every `lib/*` module, every `*-data.ts`, `salary-delta.ts`, data generator determinism/quotas and manifest arithmetic.
- Report numbers are tested in `tests/db/reports/<report>.test.ts` on small hand-built fixtures. Only `npm run db:verify` uses the 10,000-row seed (report queries vs the generator manifest); CI runs it after `db:seed`.
- One behavior per test, named as a sentence. Assert through public functions or procedures. Fixtures are minimal and built in the test.

**Database and e2e harness**
- `npm run test:db`: the vitest `db` project points both URLs at `<db>_test` (dev database name + `_test`); `tests/db/global-setup.ts` drops and recreates it as owner and migrates once per run.
- `tests/db/harness.ts`: `resetTables()` truncates app and auth tables (`TRUNCATE … RESTART IDENTITY CASCADE`) in each file's `beforeEach`; `callerFor(user | null, { now?, origin? })` signs the fixture user in through Better Auth and returns `appRouter.createCaller({ ...(await createContext({ headers })), now })` with cookie and Origin headers.
- `npm run test:e2e`: `tests/e2e/global-setup.ts` drops/recreates, migrates and seeds `<db>_e2e`; the web server's `DATABASE_URL` points at it. Neither suite ever touches the dev database.
- Benchmarks, verifiers and seed tools live in `scripts/`, never in `tests/`.

**Enforced at scaffold time** (`eslint.config.mjs`, all errors; run `eslint .`):
- `no-restricted-properties`: `process.env` outside `src/server/env.ts`.
- `import/no-cycle`; `import/no-default-export` outside Next route/config files.
- `boundaries/*` (one `no-restricted-imports` alias per boundary, so zones never override each other):
  - Everywhere: `../*`; `docs/`; `pg` outside `db/connect.ts`; each UI library outside its one import site (§5).
  - Backend: script-safe modules and `scripts/**` import no `server-only` and only script-safe server modules; operations/queries no `@trpc/*` or `@/server/api`; queries no `@/server/env` or operations; routers no `drizzle-orm`, `@/server/db` or queries; `core` no modules; `employees` → `salaries` → `lookups`, no module imports `reports`.
  - Frontend: every §5 boundary — `@/server`, shared-home direction, cross-feature allow-list.
- `no-restricted-syntax`: hex/rgb/hsl literals and `[#` values in `className`, `style`, `fill`, `stroke`, `stopColor`, `color`; `invalidateQueries()` with no arguments; `sql.raw`.
- `max-lines`: 200 for `*.tsx`, 300 for `*.ts`. `@typescript-eslint/no-floating-promises`.

## 7. Definition of done (every change)

- [ ] Relevant doc read; searched for an existing helper/component/schema before adding one.
- [ ] Code at the planned path and name; no second copy of a type, rule, primitive or class string.
- [ ] Failing test written first for business logic; unit tests added/updated.
- [ ] `npm run typecheck`, `npm run lint` and `npm test` pass (red commit: only its new test fails); `npm run test:db` if server/db changed; `npm run test:e2e` if a user flow changed.
- [ ] Migrations generated (`npm run db:generate`) with their grants and committed for schema changes; `.env.example` updated for new env vars.
- [ ] Docs updated in the same change when behavior, contracts or setup change. README describes only what works today.
- [ ] One small, focused change → one Conventional Commit (a core rule → its red → green pair): `type(scope): summary`. Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`. Scopes: `auth`, `employees`, `salaries`, `lookups`, `reports`, `ui`, `api`, `db`, `scripts`, `e2e`, `docs`.
