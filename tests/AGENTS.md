# Testing guide: `tests/` and `scripts/`

Read before changing `tests/` or `scripts/`. TDD and the red → green rule are in the root `AGENTS.md` (Testing essentials).

## File structure

### `tests/` and `scripts/`

```text
tests/                             # tests only: no benchmarks, seeders or one-off scripts
├── unit/                          # mirrors src/ and scripts/ paths; pure code; no DB, network or real clock
│   ├── server/core/{cursor,pagination,errors}.test.ts
│   ├── server/employees/status.test.ts  # employmentDateErrors: last working day vs joining date and latest revision
│   ├── server/api/{error-formatter,map-domain-errors}.test.ts
│   ├── server/db/connect.test.ts  # siblingDatabaseUrl / databaseName
│   ├── trpc/query-client.test.ts  # retry predicate, global UNAUTHORIZED handling
│   ├── contracts/*.test.ts        # money/decimal, dates, first-of-month, 180 months, non-empty DetailsPatch
│   ├── lib/*.test.ts              # format, money, dates, search-params, mutation-errors, product-defaults
│   ├── features/**/*.test.ts      # every *-data.ts, salary-delta, search-params builders
│   └── scripts/data-generation/*.test.ts  # determinism, quotas, tenure, history rules, manifest arithmetic
├── db/                            # integration against a disposable PostgreSQL database
│   ├── global-setup.ts            # drop/create `<db>_test`, migrate once as owner, provide its URLs
│   ├── setup.ts                   # per worker: stub DATABASE_URL/DATABASE_OWNER_URL with the `_test` URLs
│   ├── harness.ts                 # resetTables() (refuses non-`_test` databases); signIn(user) → Cookie header; contextFor/callerFor(user | null, { now?, origin? })
│   ├── auth.test.ts               # getSessionUser: no cookie, signed in, signed out, expired; sign-up disabled; seeded demo HR signs in
│   ├── harness.test.ts            # app role reaches `<db>_test`; resetTables empties public tables and restarts identities
│   ├── fixtures.ts                # minimal builders: lookups, HR user, employee + history
│   ├── constraints.test.ts / grants.test.ts  # FKs, checks, unique revision; app role cannot UPDATE/DELETE history
│   ├── employees.test.ts          # list filters/search/status boundaries/paging/summary, get
│   ├── employee-writes.test.ts    # create (+ revision 1 history), duplicate ID, unknown codes, details edit and date rules
│   ├── salaries.test.ts           # change, stale revision, concurrent changes, upcoming allowed, departed rejected, rollback
│   ├── salary-history.test.ts     # history order, actor name, snapshots, paging, cursor scope, departed still readable
│   ├── lookups.test.ts            # lookups.get: name order, seeded lookups, empty lists, session required; assertKnownCodes
│   ├── procedures.test.ts         # createCaller: auth, same-origin, error codes, field_errors, invalid cursor
│   └── reports/<report>.test.ts   # report numbers on small fixtures (known cases in docs/data-generation.md)
└── e2e/
    ├── global-setup.ts            # `setup` project (runs before the specs): drop/create, migrate and seed `<db>_e2e`
    ├── auth.spec.ts               # login error, login, sign out
    ├── employees.spec.ts          # directory search/filter/paging, create, edit, departure
    ├── salaries.spec.ts           # salary change incl. conflict reload
    └── reports.spec.ts            # each report renders and filters

scripts/
├── db/
│   ├── init-roles.sql             # local/CI only: owner and app roles
│   ├── migrate.ts                 # apply drizzle/ as owner
│   ├── reset.ts                   # explicit wipe before reseeding
│   ├── seed.ts                    # HR account first (better-auth/crypto hashPassword, upserted), lookups, then employees + history in bulk (--seed, --as-of); exports its steps for db tests (main runs only under `import.meta.main`)
│   └── verify.ts                  # run report queries and compare with the manifest (CI, after seeding)
├── data-generation/
│   ├── generate.ts                # pure deterministic generator (seed, as_of) → rows: population, IDs, known cases
│   ├── history.ts                 # one employee's salary history from the review profiles
│   ├── random.ts                  # seeded PRNG
│   ├── profiles.ts                # seeded lookups (SEED_LOOKUPS), population, tenure, pay bands, review profiles from the doc
│   ├── names.ts                   # small per-country name pools (repeated names)
│   └── manifest.ts                # independent exact-arithmetic expected totals/percentiles
└── bench-reports.ts               # time each report on the seeded DB
```

## Testing rules

- No unit tests for JSX, layout, Tailwind, routers or `page.tsx`; e2e covers them.
- `npm test` runs `tests/unit` only: fast, deterministic, no DB, network or real clock (pass `today`/`now` in).
- Required unit coverage: cursor codec, `paginateKeyset` (next/previous pages, range_start, fingerprint mismatch, tampering), error formatter and domain-error mapping, contract edge cases, every `lib/*` module, every `*-data.ts`, `salary-delta.ts`, data generator determinism/quotas and manifest arithmetic.
- Report numbers are tested in `tests/db/reports/<report>.test.ts` on small hand-built fixtures. Only `npm run db:verify` uses the 10,000-row seed (report queries vs the generator manifest); CI runs it after `db:seed`.
- One behavior per test, named as a sentence. Assert through public functions or procedures. Fixtures are minimal and built in the test.

**Database and e2e harness**
- `npm run test:db` loads `.env` (`node --env-file-if-exists`) and runs the vitest `db` project, which points both URLs at `<db>_test` (dev database name + `_test`): `tests/db/global-setup.ts` drops and recreates it as owner, migrates once per run and provides the `_test` URLs; `tests/db/setup.ts` stubs them into each worker before any test file reads env.
- `tests/db/harness.ts`: `resetTables()` truncates every `public` table, app and auth (`TRUNCATE … RESTART IDENTITY CASCADE`) in each file's `beforeEach` and refuses any database not named `*_test`; `callerFor(user | null, { now?, origin? })` signs the fixture user in through Better Auth and returns `createCallerFactory(appRouter)({ ...(await createContext({ headers })), now })` with cookie and Origin (default: the app origin; `null` omits it) headers. `contextFor` builds the same context for test-local routers, e.g. `procedures.test.ts`'s probes of the middleware chain.
- If `test:db` prints only `TypeError: code.charCodeAt is not a function` / `No test files found`, global setup threw (vitest 5.0.5 hides the error): check `.env` exists and Postgres is up (`docker compose up -d`).
- `npm run test:e2e` loads `.env` and runs Playwright: the web server (`next build` + `next start` on port 3100, `APP_URL` set to it) gets `DATABASE_URL` pointed at `<db>_e2e`; the `setup` project (`tests/e2e/global-setup.ts`, a setup test so it needs no default export) drops/recreates, migrates and seeds it (demo HR + lookups, as `db:seed`) before the specs. Specs arrange data through the API with the signed-in page's cookies and an `Origin` header. Both suites recreate their database with `recreateMigratedDatabase` (`server/db/owner.ts`); neither ever touches the dev database. Browsers are not installed by the scripts: run `npx playwright install chromium` once.
- Benchmarks, verifiers and seed tools live in `scripts/`, never in `tests/`.
