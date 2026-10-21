import { TRPCClientError } from "@trpc/client";
import { describe, expect, it } from "vitest";
import { isConflict, toFieldErrors } from "@/lib/mutation-errors";

function procedureError(message: string, field_errors: Record<string, string> | null) {
  return TRPCClientError.from({ error: { code: -32600, message, data: { code: "BAD_REQUEST", field_errors } } });
}

describe("toFieldErrors", () => {
  it("puts field errors beside the form's fields", () => {
    const error = procedureError("Invalid input", { id: "Employee ID already exists", name: "Enter a name" });
    expect(toFieldErrors(error, ["id", "name"])).toEqual({
      fields: { id: "Employee ID already exists", name: "Enter a name" },
      message: null,
    });
  });

  it("turns errors for fields the form does not show into the message", () => {
    const error = procedureError("Invalid input", { employee_id: "This employee has left", reason: "Enter a reason" });
    expect(toFieldErrors(error, ["reason"])).toEqual({
      fields: { reason: "Enter a reason" },
      message: "This employee has left",
    });
  });

  it("uses the error message when there are no field errors", () => {
    const error = procedureError("The salary changed since you opened this form", null);
    expect(toFieldErrors(error, ["reason"])).toEqual({
      fields: {},
      message: "The salary changed since you opened this form",
    });
  });

  it("explains a network failure", () => {
    const error = TRPCClientError.from(new TypeError("Failed to fetch"));
    expect(toFieldErrors(error, [])).toEqual({
      fields: {},
      message: "We couldn’t reach the server. Check your connection and try again.",
    });
  });

  it("shows the message of an ordinary error", () => {
    expect(toFieldErrors(new Error("Incorrect email or password."), ["email"])).toEqual({
      fields: {},
      message: "Incorrect email or password.",
    });
  });

  it("falls back to a generic message for anything else", () => {
    expect(toFieldErrors("boom", [])).toEqual({ fields: {}, message: "Something went wrong. Try again." });
  });
});

describe("isConflict", () => {
  it("recognises a CONFLICT rejection", () => {
    const error = TRPCClientError.from({ error: { code: -32009, message: "Stale revision", data: { code: "CONFLICT" } } });
    expect(isConflict(error)).toBe(true);
  });

  it("ignores other rejections and non-tRPC errors", () => {
    expect(isConflict(procedureError("Invalid input", null))).toBe(false);
    expect(isConflict(new Error("CONFLICT"))).toBe(false);
    expect(isConflict(null)).toBe(false);
  });
});
