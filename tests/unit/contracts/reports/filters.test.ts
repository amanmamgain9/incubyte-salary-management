import { describe, expect, it } from "vitest";
import { periodEndError } from "@/contracts/reports/filters";

describe("periodEndError", () => {
  it("allows a period ending today or earlier", () => {
    expect(periodEndError("2026-10-21", "2026-10-21")).toBeUndefined();
    expect(periodEndError("2025-12-31", "2026-10-21")).toBeUndefined();
  });

  it("rejects a period ending after today", () => {
    expect(periodEndError("2026-10-22", "2026-10-21")).toBe("Must be today or earlier");
  });
});
