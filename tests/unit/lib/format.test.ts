import { describe, expect, it } from "vitest";
import { formatInitials } from "@/lib/format";

describe("formatInitials", () => {
  it.each([
    ["Demo HR Manager", "DH"],
    ["aarav sharma", "AS"],
    ["  Mia   Wong ", "MW"],
    ["Cher", "C"],
    ["", "?"],
    ["   ", "?"],
  ])("formats %j as %j", (name, initials) => {
    expect(formatInitials(name)).toBe(initials);
  });
});
