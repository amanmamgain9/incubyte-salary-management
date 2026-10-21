// `db` project setup file: runs in each worker before a test file loads, so the memoized getEnv()/ownerEnv()
// first read the `<db>_test` URLs from tests/db/global-setup.ts, never the dev database's.
import { inject, vi } from "vitest";

for (const [name, value] of Object.entries(inject("testDatabaseEnv"))) vi.stubEnv(name, value);
