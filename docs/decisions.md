# Design decisions

The decisions that shape the code, why they were made and what they cost. Detail lives in the linked docs.

### 1. Reports are computed live

- **Decision:** Every report runs its SQL per request on current tables; no triggers, caches, materialized views or summary tables.
- **Why:** Always fresh after a save, nothing to invalidate, writes stay simple. The benchmark builds its month-end snapshot once per request in a transaction-scoped temporary table (`ON COMMIT DROP`) with `SET LOCAL jit = off` and `work_mem`.
- **Trade-off:** The benchmark is the slowest report ([performance](architecture.md#report-performance)). If it must get faster: a month-end snapshot table updated inside the salary and details write transactions, never by triggers or background jobs.

### 2. Exact money

- **Decision:** `NUMERIC(18,2)` in PostgreSQL, decimal strings in JSON, `bigint` minor units in TypeScript (`lib/money.ts`); `Number` only positions chart marks.
- **Why:** Salaries must add up to the cent; floats do not.
- **Trade-off:** Currencies are never summed or charted together and nothing is converted, so totals are per currency ([exclusions](requirements.md#exclusions)).

### 3. Salary integrity

- **Decision:** A salary change locks the employee row, checks `expected_revision`, updates current pay and `salary_revision` and appends history in one transaction. Migrations and seed run as an owner role; the app role may only `SELECT`/`INSERT` history (`tests/db/grants.test.ts`).
- **Why:** Two HR edits cannot silently overwrite each other, and history cannot be edited or deleted even by a bug in the app.
- **Trade-off:** A stale form gets `CONFLICT` and must reload; two database roles to provision.

### 4. Keyset pagination with signed cursors

- **Decision:** Every list and report pages through `paginateKeyset`: HMAC-signed cursors bound to the procedure and a hash of its filters, `next`/`prev` cursors and `range_start`.
- **Why:** Stable, index-friendly paging over 10,000 rows without offsets; a tampered cursor or one reused with other filters is `BAD_REQUEST`, not wrong data.
- **Trade-off:** No jump to page N; the UI offers Previous/Next and drops a stale cursor back to page one.

### 5. Assignment snapshot on each salary entry

- **Decision:** Each history entry stores the employee's country and department at the time of change.
- **Why:** Growth and benchmark reports attribute past pay to where the employee worked then, not where they work now.
- **Trade-off:** Transfer dates between revisions are not recorded; a move shows up from the next revision.

### 6. tRPC with shared Zod contracts

- **Decision:** `src/contracts` defines every procedure's input and output once; routers are thin (`.input().output()` and one operation call); operations own the use case and its transaction.
- **Why:** One source of truth for types, validation and forms across server and client.
- **Trade-off:** Couples the UI to a TypeScript API; fine for one app on one origin.

### 7. Errors mapped once

- **Decision:** Operations throw domain errors; one middleware maps them to tRPC codes, with `field_errors` keyed by input path for forms. Unexpected errors return a generic message and log only the error name and SQLSTATE.
- **Why:** Consistent client handling; SQL messages can embed inputs, so they never reach responses or logs.
- **Trade-off:** Diagnosing an unexpected failure needs reproduction, not the log line alone.

### 8. Dialogs and screen state in the URL

- **Decision:** Forms open as dialogs driven by `?dialog=`; filters, pages and dialogs live in search params, updated with `replaceState`. Forms are dialog-agnostic (`onSaved`/`onCancel`).
- **Why:** Every state is linkable and survives reload; forms stay testable on their own.
- **Trade-off:** By design, Back leaves the page instead of stepping through filter changes.

### 9. Deterministic seed, independent verification

- **Decision:** `db:seed` generates 10,000 employees from a seed and `as_of` date; a manifest computed with separate exact arithmetic lets `db:verify` check every report's numbers against the database.
- **Why:** The report SQL is checked against an independent calculation on realistic volume, not only small fixtures.
- **Trade-off:** Reports use today's date, so an old seed drifts until reseeded.

### 10. Lint-enforced module boundaries

- **Decision:** ESLint enforces import boundaries, single import sites per library, color tokens, file size caps and floating promises; no rule may be disabled.
- **Why:** Architecture rules hold mechanically for humans and AI agents alike, instead of relying on prose in `AGENTS.md`.
- **Trade-off:** New boundaries mean editing `eslint.config.mjs` alongside the code.

### 11. Scope

- **Decision:** Base pay records and four reports for one HR role. Payroll, bonuses, currency conversion, inter-company transfers, self-service and roles are out ([exclusions](requirements.md#exclusions)).
- **Why:** These answer the brief's question of how the org pays people; each exclusion needs its own rules or sources of truth.
- **Trade-off:** No signup, password reset or user administration ([login](login.md)).
