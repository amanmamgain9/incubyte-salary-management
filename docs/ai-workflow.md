# How AI was used

> Draft — author to review.

The code and docs were written with AI coding agents (every commit carries a Claude co-author trailer); I set the plan, reviewed each change and decided what landed. The evidence is the commit history: hashes below are on `main`.

## Docs before code

The first 14 commits are documents, no code: requirements (`bc9f17d`), data model and constraints (`fdb31bf`, `7c985b4`), architecture (`a812e2c`), login and security (`fe44e63`), tRPC contracts (`dcbda06`, `fd695cf`), data generation (`622666e`), design language and static screen prototypes (`3edf448`, `21e7f0a`). Agents then had a written spec to build against and I had one to review against.

Before the scaffold, `AGENTS.md` fixed the coding rules and a planned file tree with one owner per file (`9ee5d6b`), plus the red → green convention (`e9c3c1b`). Once it grew too long for every task, it was split into root rules and area guides for `src/server`, `src/features` and `tests` (`df5e0b9`), each imported by a `CLAUDE.md` beside it, so an agent loads only the rules for the folder it works in.

## Rules made mechanical

Prose rules get skipped; lint errors do not. `eslint.config.mjs` (`77f2252`, `7685c3a`) enforces the planned import boundaries (each its own rule id), one import site per library, env access only through `env.ts`, color tokens, no default exports and file size caps, and `AGENTS.md` forbids disabling a rule. The type system carries other rules: functions that need a transaction take `Tx`, so the compiler proves every caller opened one (`a985d3f`).

## Small slices, gated

Work went in small vertical slices, one Conventional Commit each, done only when typecheck, lint and tests pass (`AGENTS.md` › Definition of done). Core rules landed as a red → green pair, the red commit holding the failing test and a stub:

| Rule | Red | Green |
| --- | --- | --- |
| Signed cursor codec | `ee04ca5` | `8ca9b23` |
| Keyset pagination | `b00735b` | `30bb529` |
| Domain-error mapping | `71558f3` | `22a548f` |
| Employment-date validation | `6e4d3be` | `89fe1f6` |
| Salary change with expected revision | `ca838ca` | `5fe87f1` |
| Each report's numbers | `ec18d6c`, `b673d7c`, `9636113`, `929bfb8` | `3186361`, `cdcf521`, `7804ae7`, `3bbe507` |
| Reject a salary change with no change | `ec9baae` | `88af36b` |

## Review loops

Separate review passes over finished slices found real issues, each fixed in its own commit:

- **Form overwrite:** an open edit form treated a refetched record's values as user changes and could overwrite another update; test `f4ba3ce`, fix `8f60ce7` (compare against the values the form opened with, offer a reload).
- **Transactions:** lock and `SET LOCAL` code accepted any executor (`a985d3f` requires `Tx`); fetch and count ran in parallel on one transaction connection (`c2d29de` runs them in sequence).
- **Use cases:** the salary router made two calls (change, then re-read), an exception the backend guide itself allowed; `changeSalary` now owns the use case and returns the committed employee, and the exception is gone from the guide (`575793a`).
- **Policy in shared code:** dialog names lived in a shared hook (`9bbfe7c`) and report defaults in `lib/product-defaults.ts` (`6fe69b4`); both moved into their features.
- **Duplication:** the period-end rule was written three times (`2504dbb`); an employee's status was derived in SQL for reads and in TypeScript for salary changes, now one builder (`72fbba5`); the benchmark overview read its single group from the current page instead of the summary (`305dbd4`).
- **Docs ahead of code:** the docs promised a date picker the code did not have; they were corrected to the native inputs (`9cc5af4`) until the picker was built (`2b99e71`). The README was rewritten to describe only what works (`523286f`).

Tests caught others: the production-build sign-in flow bounced between `/login` and `/employees` because the login page prefetched a redirect (`f7e29f7`, with the sign-in e2e `a05fc24`); an old or tampered directory cursor ended on the error page instead of returning to page one (`105df06`); the growth e2e depended on the date the data was generated (`952e302`).

## Where the AI needed correcting

- **Over-prescriptive plans.** The planned tree named files before their use was known. `lib/product-defaults.ts` became a dumping ground for report policy and was removed (`6fe69b4`); `trpc/router-types.ts` never had a consumer (`14e0a8f`). The rules were then rewritten around concepts: mechanism vs policy, operations own use cases, extract by concept not text (`c2a9781`, `b8c9741`).
- **Guides drift.** When implementation proved a guide wrong, the guide changed in the same commit: 63 of the 122 commits that built the app touch an `AGENTS.md` alongside code, e.g. the form baseline rule (`8f60ce7`), the transaction rule (`c2d29de`) and the use-case rule (`575793a`). The pagination pseudocode was rewritten to match the built helper (`5920b35`).
- **Length.** The requirements grew past the brief's one page and were trimmed, linking calculation detail to the contracts instead of restating it (`d0f6850`).

## Verification over trust

- `db:verify` checks every report's numbers on the 10,000-employee seed against a manifest computed with separate exact arithmetic (`c3cdb3f`, `45c5fc1`), so report SQL is not checked against itself.
- CI (`.github/workflows/ci.yml`) runs typecheck, lint, unit tests and build, database tests, seed + `db:verify`, and the Playwright suite on every push.
- Screens were checked in a browser against the prototypes; layout fixes followed (`bbbe0da`, `673a6b5`).
