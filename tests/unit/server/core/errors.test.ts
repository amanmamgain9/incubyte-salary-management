import { describe, expect, it } from "vitest";
import { isUniqueViolation, sqlStateOf } from "@/server/core/errors";

// A driver error carries its SQLSTATE in `code`, like pg's DatabaseError.
const driverError = (code: string) => Object.assign(new Error("duplicate key value"), { code });

describe("sqlStateOf", () => {
  it("reads the SQLSTATE from a driver error", () => {
    expect(sqlStateOf(driverError("23505"))).toBe("23505");
  });

  it("finds the SQLSTATE through wrapping errors' causes", () => {
    const wrapped = new Error("Failed query", { cause: new Error("transaction failed", { cause: driverError("23503") }) });

    expect(sqlStateOf(wrapped)).toBe("23503");
  });

  it("returns undefined for an error chain without a SQLSTATE", () => {
    expect(sqlStateOf(new Error("Failed query", { cause: new Error("timeout") }))).toBeUndefined();
  });

  it("returns undefined for a value that is not an error", () => {
    expect(sqlStateOf({ code: "23505" })).toBeUndefined();
    expect(sqlStateOf(undefined)).toBeUndefined();
  });

  it("ignores a non-string code", () => {
    expect(sqlStateOf(Object.assign(new Error("system error"), { code: 23505 }))).toBeUndefined();
  });
});

describe("isUniqueViolation", () => {
  it("is true for SQLSTATE 23505, also when wrapped", () => {
    expect(isUniqueViolation(driverError("23505"))).toBe(true);
    expect(isUniqueViolation(new Error("Failed query", { cause: driverError("23505") }))).toBe(true);
  });

  it("is false for other violations and errors without a SQLSTATE", () => {
    expect(isUniqueViolation(driverError("23503"))).toBe(false);
    expect(isUniqueViolation(new Error("timeout"))).toBe(false);
  });
});
