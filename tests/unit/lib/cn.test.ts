import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("joins class names and skips falsy ones", () => {
    expect(cn("a", false, "b", null, undefined, "", "c")).toBe("a b c");
  });

  it("returns an empty string when nothing is set", () => {
    expect(cn(false, undefined)).toBe("");
  });
});
