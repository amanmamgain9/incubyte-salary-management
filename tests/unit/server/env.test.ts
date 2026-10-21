import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv, parseOwnerEnv } from "@/server/env";

const validSource = {
  DATABASE_URL: "postgres://acme_app:app@127.0.0.1:5432/acme",
  APP_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "a".repeat(32),
  CURSOR_SECRET: "b".repeat(32),
  DEMO_HR_EMAIL: "hr@acme.test",
  DEMO_HR_PASSWORD: "correct-horse-battery",
};

const ownerUrl = "postgres://acme_owner:owner@127.0.0.1:5432/acme";

describe("parseEnv", () => {
  it("returns the parsed values for a complete environment", () => {
    expect(parseEnv(validSource)).toEqual({ ...validSource, appOrigin: "http://localhost:3000" });
  });

  it("derives appOrigin from APP_URL without path, trailing slash or default port", () => {
    expect(parseEnv({ ...validSource, APP_URL: "HTTPS://HR.Acme.test:443/app/" }).appOrigin).toBe(
      "https://hr.acme.test",
    );
  });

  it("drops variables the app does not read", () => {
    expect(parseEnv({ ...validSource, UNRELATED: "x" })).not.toHaveProperty("UNRELATED");
  });

  it("rejects an environment with a missing variable and names it", () => {
    const { DATABASE_URL: _omitted, ...missingDatabaseUrl } = validSource;

    expect(() => parseEnv(missingDatabaseUrl)).toThrow(/DATABASE_URL/);
  });

  it("rejects a secret shorter than 32 characters", () => {
    expect(() => parseEnv({ ...validSource, BETTER_AUTH_SECRET: "short" })).toThrow(
      /BETTER_AUTH_SECRET/,
    );
  });

  it("rejects a cursor secret equal to the auth secret", () => {
    expect(() =>
      parseEnv({ ...validSource, CURSOR_SECRET: validSource.BETTER_AUTH_SECRET }),
    ).toThrow(/CURSOR_SECRET/);
  });

  it("never includes secret values in the error message", () => {
    const secret = "s".repeat(40);

    expect(() => parseEnv({ ...validSource, BETTER_AUTH_SECRET: secret, CURSOR_SECRET: secret })).toThrow(
      expect.objectContaining({ message: expect.not.stringContaining(secret) as unknown }),
    );
  });
});

describe("parseOwnerEnv", () => {
  it("returns the owner database URL when it is the only variable set", () => {
    expect(parseOwnerEnv({ DATABASE_OWNER_URL: ownerUrl })).toEqual({ DATABASE_OWNER_URL: ownerUrl });
  });

  it("rejects a missing owner database URL", () => {
    expect(() => parseOwnerEnv({})).toThrow(/DATABASE_OWNER_URL/);
  });
});

describe("loading the env module", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  // Owner-only process: what drizzle-kit and the owner scripts see.
  const loadWithOwnerUrlOnly = async () => {
    for (const name of Object.keys(validSource)) vi.stubEnv(name, undefined);
    vi.stubEnv("DATABASE_OWNER_URL", ownerUrl);
    vi.resetModules();
    return import("@/server/env");
  };

  it("does not parse the app environment on import", async () => {
    await expect(loadWithOwnerUrlOnly()).resolves.toHaveProperty("getEnv");
  });

  it("reads the owner environment when only the owner URL is set", async () => {
    const { ownerEnv } = await loadWithOwnerUrlOnly();

    expect(ownerEnv()).toEqual({ DATABASE_OWNER_URL: ownerUrl });
  });

  it("still validates the app environment when it is first used", async () => {
    const { getEnv } = await loadWithOwnerUrlOnly();

    expect(() => getEnv()).toThrow(/DATABASE_URL/);
  });
});
