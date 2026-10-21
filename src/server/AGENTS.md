# Backend guide: `src/server` and `src/contracts`

Read before changing `src/server/`, `src/contracts/`, a migration in `drizzle/` or SQL in `scripts/db/`. The root `AGENTS.md` rules apply as well.

## File structure

### `src/server` (backend)

```text
src/server/
├── env.ts                         # THE env module: lazy `getEnv()` (app, incl. `appOrigin`) + `ownerEnv()` (owner URL only); script-safe
├── db/
│   ├── connect.ts                 # `createDb(url)`: the only file that imports `pg` / creates a Pool; script-safe
│   ├── client.ts                  # server-only: app-role `db` = createDb(getEnv().DATABASE_URL)
│   ├── owner.ts                   # owner-role `ownerDb` = createDb(ownerEnv().DATABASE_OWNER_URL) for migrate, reset, seed, verify, db tests; script-safe
│   └── schema/
│       ├── index.ts               # re-exports all tables (the only barrel file in src/)
│       ├── auth.ts                # Better Auth generated tables (user, account, session, verification)
│       ├── lookups.ts             # countries, currencies, departments
│       ├── employees.ts           # employees table + indexes from data-model.md
│       └── salary-history.ts      # salary_history; unique (employee_id, revision), (changed_at, employee_id) index
├── auth/
│   ├── auth.ts                    # betterAuth(): Drizzle adapter, email/password, signup off, cookie cache off; secret/baseURL from env
│   └── session.ts                 # getSessionUser(headers) → Actor | null
├── api/
│   ├── trpc.ts                    # initTRPC, router, `signedInProcedure`, `signedInMutationProcedure`
│   ├── error-formatter.ts         # generic: field errors from ZodError/ValidationError/ConflictError → data.field_errors; unexpected → generic message
│   ├── context.ts                 # createContext({ headers }) → { db, headers, now }
│   ├── root.ts                    # appRouter + `AppRouter` type
│   ├── middleware/
│   │   ├── map-domain-errors.ts   # the ONE domain-error → TRPCError mapping; logs unexpected errors (no inputs)
│   │   ├── require-same-origin.ts # rejects mutations whose Origin ≠ getEnv().appOrigin as FORBIDDEN
│   │   ├── require-session.ts     # adds ctx.user or throws UNAUTHORIZED
│   │   └── operation-context.ts   # builds ctx.op: OperationContext from db, user, now
│   └── routers/
│       ├── lookups.ts             # lookups.get
│       ├── employees.ts           # employees.list/get/create/update
│       ├── salaries.ts            # salaries.history/update
│       └── reports.ts             # reports.salaryCommitment/departmentBreakdown/salaryGrowth/historicalSalaryBenchmark
├── core/                          # cross-cutting backend code; the only shared server folder
│   ├── errors.ts                  # NotFoundError, ConflictError, ValidationError(field_errors), InvalidCursorError, pg violation guards; script-safe
│   ├── cursor.ts                  # server-only: createCursorCodec(secret) HMAC sign/verify; getCursorCodec() lazy default from getEnv().CURSOR_SECRET
│   ├── pagination.ts              # server-only: paginateKeyset(), the only pagination implementation
│   └── operation-context.ts       # OperationContext type { db, actor: Actor, now, today (UTC YYYY-MM-DD) }; Actor { id, name, email }
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
├── paging.ts                      # Paging input, page(item) → Page<T> (next/prev cursor, total_count, range_start), KeysetFrom<Key> (a fetch's `from`), DEFAULT_LIMIT 50, MAX_LIMIT 100
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

## Backend rules

- **Backend file kinds.** SQL → `queries.ts`; rules and transactions → `operations.ts`; wiring → `api/routers/`. Only `employees/status.ts` and `reports/filters.ts` are extra.

**Layering** (each layer imports only those to its right): `api/routers` → `<module>/operations.ts` → `<module>/queries.ts` → `db/schema`; `contracts` and `core` usable by all.

- Routers are thin: `.input(contract).output(contract)` and one operation call. No SQL, rules or try/catch. Sole exception: `salaries.update` calls `changeSalary` then `getEmployee` to return `EmployeeView`, so `salaries` never imports `employees`.
- Operations take `op: OperationContext` and parsed input, own transactions, throw `core/errors.ts` errors, and never import `@trpc/*` or `api/`.
- Script-safe modules (no `server-only`; importable by scripts and unit tests): `src/contracts/*`, `env.ts`, `db/connect.ts`, `db/owner.ts`, `db/schema/*`, every `queries.ts`, `employees/status.ts`, `reports/filters.ts`, `core/errors.ts`. They and `scripts/` import only each other (`core/cursor.ts` and `core/pagination.ts` are server-only). Queries take the executor as an argument and never import `db/client` or `env`.
- Every other server module starts with `import "server-only"`; no dynamic `await import()` to dodge it. No Server Actions: every read and write is a tRPC procedure.

**Middleware and procedures**
- Chain: `mapDomainErrors` → `requireSameOrigin` (mutations only) → `requireSession` → `operationContext`. Each does one thing; names say what is checked. There are no roles.
- Each middleware file exports a procedure from its own `initTRPC.context<…>().create()` builder; `api/trpc.ts` joins them with `.concat()` (tRPC's replacement for standalone middleware), so middleware never imports `api/trpc.ts`.
- `signedInProcedure` (queries) and `signedInMutationProcedure` (adds same-origin) in `api/trpc.ts`. Every procedure uses one; auth is checked there and nowhere else.
- Middleware and `error-formatter.ts` never branch on procedure paths, router names or feature-specific errors. A feature need is solved in its operation.
- Field errors are keyed by full dotted input path. Every input is flat (including `employees.update`), so paths equal form field names.

**Validation split**
- Zod (contracts): shape, format, static limits — 2 dp positive money, ISO dates, `from ≤ to`, first-of-month, ≤ 180 months, non-empty patch.
- Operations: rules needing the DB or clock — codes exist (`assertKnownCodes` on writes and list/report filters), employment dates against stored dates and salary history, expected revision, salary changes only for employees not departed today (active or upcoming), `to ≤ today` (growth, benchmark) — as `ValidationError` keyed by field, `ConflictError` or `NotFoundError`.
- Duplicate employee ID: no pre-check SELECT; translate the primary-key violation to `ConflictError` with `field_errors.id`. Never leak SQL errors or constraint names.

**Pagination**
- Every list and report uses `paginateKeyset`. No offsets, `LIMIT` paging or cursor code anywhere else.
- The cursor is signed and binds `scope` plus a fingerprint: sha256 of the parsed input minus `cursor`/`limit`, keys sorted, computed inside `paginateKeyset`. Never build a fingerprint or filter list by hand. Tampering, `""`, a wrong payload shape, another scope or fingerprint → `InvalidCursorError` → `BAD_REQUEST`, before any fetch.
- Keys are JSON-safe (strings, numbers) in ORDER BY column order. A `queries.ts` types its fetch's `from` as `KeysetFrom<Key>` from `contracts/paging.ts`, never from `core/`.

```ts
// Cursor (signed by getCursorCodec(), shape checked on decode): { scope, fingerprint, key: Key, before: boolean, range_start: int ≥ 1 }
export async function paginateKeyset<Row, Key extends readonly unknown[]>(args: {
  scope: string; input: Paging & Record<string, unknown>; // "reports.salaryGrowth"; the parsed input, as-is
  keyOf: (row: Row) => Key;                                // same columns as ORDER BY; strings/numbers only
  fetch: (from: KeysetFrom<Key>, take: number) => Promise<Row[]>; // ORDER BY key (reversed when before), LIMIT take
  count: () => Promise<number>;
}): Promise<Page<Row>>; // { items, next_cursor, prev_cursor, total_count, range_start }
// c = input.cursor === undefined ? null : decode + validate; limit = input.limit ?? DEFAULT_LIMIT
// [rows, total_count] = await Promise.all([fetch(c && { key: c.key, before: c.before }, limit + 1), count()])
// more = rows.length > limit; items = rows.slice(0, limit); if (c?.before) items.reverse()
// no items (even with a cursor) → { items: [], next_cursor: null, prev_cursor: null, total_count, range_start: 0 }
// start = !c ? 1 : c.before ? (more ? max(1, c.range_start - items.length) : 1) : c.range_start
// next_cursor if (c?.before || more): { key: keyOf(last item), before: false, range_start: start + items.length }
// prev_cursor if (c?.before ? more : start > 1): { key: keyOf(first item), before: true, range_start: start }
```

**Reports**
- Each report folder has exactly `queries.ts` + `operations.ts`. Operation body: input checks (`assertKnownCodes`; `to ≤ today` for growth/benchmark), then `return { rows: await paginateKeyset({...}), summary: await <summary query> }`; nothing else.
- Output contracts have no unbounded arrays except `Page.items`; every other array uses the `.max(n)` from the array-limits table in `docs/trpc-contracts.md` (constants in `contracts/primitives.ts`). Chart series are bounded `summary` fields defined in that doc and the contract first; never return all rows beside the page.
- SQL does all salary math (`NUMERIC`, exact percentiles, rounding); TypeScript only formats.

```ts
// src/server/reports/salary-growth/operations.ts — every report operation has this shape
export async function salaryGrowth(op: OperationContext, input: SalaryGrowthInput): Promise<SalaryGrowthOutput> {
  await assertKnownCodes(op, input);
  if (input.to > op.today) throw new ValidationError({ to: "Must be today or earlier" });
  const rows = await paginateKeyset({
    scope: "reports.salaryGrowth", input,
    keyOf: (row) => [row.month, row.work_country_code, row.salary_currency_code] as const,
    fetch: (from, take) => selectGrowthRows(op.db, input, from, take),
    count: () => countGrowthRows(op.db, input),
  });
  return { rows, summary: await selectGrowthSummary(op.db, input) };
}
```

**Data access**
- CRUD uses the Drizzle query builder. Raw `sql` is for reports only and interpolates Drizzle tables/columns (`${employees.work_country_code}`); never table or column names in strings, never `sql.raw`.
- Connections come only from `db/client.ts` (app role) and `db/owner.ts` (owner role), both via `connect.ts`.
- Grants ship with each table: the migration that creates a table also GRANTs the app role (`acme_app`) exactly its privileges (appended to the generated SQL): `SELECT` on lookups; `SELECT, INSERT, UPDATE` on `employees`; `SELECT, INSERT` on `salary_history`; `SELECT, INSERT, UPDATE, DELETE` on Better Auth tables. No default privileges; `tests/db/grants.test.ts` checks every table in `public`.

**Module ownership** (imports: `employees` → `salaries` → `lookups`; `reports` read all; never the reverse)
- `lookups` owns countries/departments/currencies.
- `employees` owns the employee row and its details columns. `createEmployee` inserts the row with initial pay and `salary_revision = 1`, then calls `appendSalaryRevision` (revision 1, `Initial salary`) in the same transaction.
- `salaries` owns `salary_history` and, after insert, the current-pay columns (`annual_base_pay`, `salary_currency_code`, `salary_revision`). Only `changeSalary` updates them: it locks the row, checks `expected_revision` and that the employee is not departed today (`employmentStatusOn`; upcoming is allowed), updates current pay and appends history in one transaction.
- `appendSalaryRevision(tx, …)` is the only app code that inserts history; it snapshots the employee's current country/department. The seed bulk-inserts history as owner and is the only other writer.
- Modules may read any table in their own queries; writes follow this ownership.

**Environment and secrets**
- `src/server/env.ts` is the only reader of `process.env` in `src/` and `scripts/`. Importing it parses nothing: `getEnv()` validates the app variables on first call (memoized) and throws naming the bad keys, never values; `ownerEnv()` validates only `DATABASE_OWNER_URL`, so drizzle-kit and owner scripts need nothing else. Pass values to libraries explicitly (`betterAuth({ secret, baseURL })`).
- Origin checks compare the request `Origin` with `getEnv().appOrigin` (`new URL(APP_URL).origin`), never with the raw `APP_URL`.

```ts
const appEnvSchema = z.object({ DATABASE_URL: z.url(), APP_URL: z.url(), BETTER_AUTH_SECRET: z.string().min(32),
  CURSOR_SECRET: z.string().min(32), DEMO_HR_EMAIL: z.email(), DEMO_HR_PASSWORD: z.string().min(12) })
  .refine((e) => e.CURSOR_SECRET !== e.BETTER_AUTH_SECRET, { path: ["CURSOR_SECRET"] })
  .transform((e) => ({ ...e, appOrigin: new URL(e.APP_URL).origin }));
const ownerEnvSchema = z.object({ DATABASE_OWNER_URL: z.url() });
export function getEnv(): AppEnv;     // parseEnv(process.env), memoized; parseEnv/parseOwnerEnv(source) are pure
export function ownerEnv(): OwnerEnv; // parseOwnerEnv(process.env), memoized
```

**Side effects and caching**
- Queries never write app data: no refresh, backfill, audit or "last viewed" writes from a read (Better Auth's own session refresh is the only exception).
- No caches, materialized views or summary tables unless `scripts/bench-reports.ts` shows a report is too slow. If one is added, it is updated inside the write operation's transaction that changes its source — never from a read, middleware or a dedicated procedure.
- Logs never include inputs, cookies, passwords or session tokens. No `proxy.ts` for auth; authorization lives in procedures.
