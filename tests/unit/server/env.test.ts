import { describe, expect, it } from "vitest";
import { ownerEnv, parseEnv } from "@/server/env";

const validSource = {
  DATABASE_URL: "postgres://acme_app:app@127.0.0.1:5432/acme",
  APP_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "a".repeat(32),
  CURSOR_SECRET: "b".repeat(32),
  DEMO_HR_EMAIL: "hr@acme.test",
  DEMO_HR_PASSWORD: "correct-horse-battery",
};

describe("parseEnv", () => {
  it("returns the parsed values for a complete environment", () => {
    expect(parseEnv(validSource)).toEqual(validSource);
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

describe("ownerEnv", () => {
  it("returns the owner database URL", () => {
    const url = "postgres://acme_owner:owner@127.0.0.1:5432/acme";

    expect(ownerEnv({ DATABASE_OWNER_URL: url })).toEqual({ DATABASE_OWNER_URL: url });
  });

  it("rejects a missing owner database URL", () => {
    expect(() => ownerEnv({})).toThrow(/DATABASE_OWNER_URL/);
  });
});
