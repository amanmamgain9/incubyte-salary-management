# How AI was used

The app was built with AI coding agents working to a human-set plan; every change was reviewed before it landed. Documents came first: requirements, data model, architecture, API contracts, seed data plan and screen prototypes, so the agents had a spec to build against and reviewers had one to check against. Coding rules and a planned file layout were written down before any code, then split per area so an agent reads only the rules for the folder it works in. The rules that matter most are enforced by tools rather than prose: lint blocks wrong imports and hardcoded colours, and the type system rejects database calls that need a transaction but lack one.

Work went in small slices, each passing typecheck, lint and tests before it was committed. Core rules were written test-first: pagination cursors, error handling, salary changes, employment dates and every report's numbers each started as a failing test. Report results are checked against independently calculated totals on the full 10,000-employee dataset, and CI runs unit, database and browser tests on every push.

Separate review passes over finished work found real defects: an open edit form could overwrite a newer record, queries ran in parallel on a single transaction, and feature-specific rules had leaked into shared code. Tests caught others, including a sign-in redirect loop that appeared only in production builds.

## Where the AI needed correcting

- **Over-prescriptive plans.** The planned layout named files before their use was known. "Exactly one queries file and one operations file per report" pushed unrelated report SQL into a single shared file, later split; report defaults sat in a shared module until each report owned its own; one planned file never had a user. The rules were rewritten around concepts instead: shared code holds mechanisms, features own their policy, one operation owns each use case, and code is extracted when the concept repeats, not just the text.
- **Guides drifting from code.** When the implementation proved a guide wrong, the guide was corrected in the same change; about half of all code changes also touched a guide. The pagination guide, for example, was rewritten to match the helper as built.
- **Length.** The requirements grew past the brief's one page and were trimmed, pointing to the API contracts for calculation detail instead of repeating it.
