import { getTRPCErrorShape, initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { formatError } from "@/server/api/error-formatter";
import { ConflictError, NotFoundError, ValidationError } from "@/server/core/errors";

const t = initTRPC.create({ errorFormatter: formatError, isDev: false });

/** The error shape a client receives for `error` raised by `path`. */
function shapeOf(error: TRPCError, path = "employees.create") {
  return getTRPCErrorShape({ config: t._config, error, type: "mutation", path, input: undefined, ctx: undefined });
}

function zodErrorOf(schema: z.ZodType, value: unknown): z.ZodError {
  const result = schema.safeParse(value);
  if (result.success) throw new Error("expected the value to be invalid");
  return result.error;
}

const badRequest = (cause: unknown) => new TRPCError({ code: "BAD_REQUEST", cause });

describe("formatError", () => {
  it("returns a ValidationError's field errors and message", () => {
    const shape = shapeOf(badRequest(new ValidationError({ department_id: "Unknown department" })));

    expect(shape).toMatchObject({
      message: "Invalid input",
      data: { code: "BAD_REQUEST", httpStatus: 400, path: "employees.create", field_errors: { department_id: "Unknown department" } },
    });
  });

  it("returns a ConflictError's field errors", () => {
    const conflict = new ConflictError("Employee ID already exists", { id: "Already exists" });
    const shape = shapeOf(new TRPCError({ code: "CONFLICT", message: conflict.message, cause: conflict }));

    expect(shape).toMatchObject({ message: "Employee ID already exists", data: { field_errors: { id: "Already exists" } } });
  });

  it("returns null field errors for a ConflictError without them", () => {
    const conflict = new ConflictError("Salary was changed by someone else");
    const shape = shapeOf(new TRPCError({ code: "CONFLICT", message: conflict.message, cause: conflict }));

    expect(shape.data.field_errors).toBeNull();
  });

  it("returns null field errors for errors without them", () => {
    const shape = shapeOf(new TRPCError({ code: "NOT_FOUND", message: "Employee not found", cause: new NotFoundError() }));

    expect(shape).toMatchObject({ message: "Employee not found", data: { code: "NOT_FOUND", field_errors: null } });
  });

  it("keys input Zod issues by their flat dotted path with the first message per field", () => {
    const schema = z.object({
      name: z.string().min(1, "Required").max(3, "Too long"),
      pay: z.object({ amount: z.string().regex(/^\d+$/, "Digits only") }),
      tags: z.array(z.string().min(2, "Too short")),
    });
    const shape = shapeOf(badRequest(zodErrorOf(schema, { name: "", pay: { amount: "x" }, tags: ["ok", "a"] })));

    expect(shape).toMatchObject({
      message: "Invalid input",
      data: { field_errors: { name: "Required", "pay.amount": "Digits only", "tags.1": "Too short" } },
    });
  });

  it("uses an input-level Zod issue's message as the error message", () => {
    const schema = z.object({ name: z.string().optional() }).refine((v) => v.name !== undefined, "Change at least one field");
    const shape = shapeOf(badRequest(zodErrorOf(schema, {})));

    expect(shape).toMatchObject({ message: "Change at least one field", data: { field_errors: {} } });
  });

  it("hides an unexpected error behind a generic message", () => {
    const shape = shapeOf(new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: new Error("relation employees: secret") }));

    expect(shape).toMatchObject({
      message: "Internal server error",
      data: { code: "INTERNAL_SERVER_ERROR", httpStatus: 500, field_errors: null },
    });
    expect(JSON.stringify(shape)).not.toContain("secret");
  });

  it("does not expose output validation issues as field errors", () => {
    const outputError = zodErrorOf(z.object({ total: z.string() }), { total: 1 });
    const shape = shapeOf(new TRPCError({ code: "INTERNAL_SERVER_ERROR", cause: outputError }));

    expect(shape).toMatchObject({ message: "Internal server error", data: { field_errors: null } });
    expect(JSON.stringify(shape)).not.toContain("total");
  });

  it("keeps the message of other tRPC errors", () => {
    const shape = shapeOf(new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to continue" }));

    expect(shape).toMatchObject({ message: "Sign in to continue", data: { code: "UNAUTHORIZED", field_errors: null } });
  });
});
