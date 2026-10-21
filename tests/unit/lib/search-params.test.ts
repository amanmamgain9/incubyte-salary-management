import { describe, expect, it } from "vitest";
import { z } from "zod";
import { parseSearchParams, patchSearchParams } from "@/lib/search-params";

const schema = z.object({
  search: z.string().optional().catch(undefined),
  status: z.enum(["active", "departed"]).optional().catch(undefined),
});

describe("parseSearchParams", () => {
  it("reads a page's searchParams object, taking the first of repeated values", () => {
    expect(parseSearchParams(schema, { search: ["ana", "bo"], status: "active", other: undefined })).toEqual({
      search: "ana",
      status: "active",
    });
  });

  it("reads URLSearchParams the same way", () => {
    expect(parseSearchParams(schema, new URLSearchParams("search=ana&search=bo&status=active"))).toEqual({
      search: "ana",
      status: "active",
    });
  });

  it("falls back to the schema's defaults for invalid values", () => {
    expect(parseSearchParams(schema, { status: "retired" })).toEqual({});
  });
});

describe("patchSearchParams", () => {
  const current = new URLSearchParams("search=ana&cursor=abc&dialog=create");

  it("sets a filter and drops the cursor", () => {
    expect(patchSearchParams(current, { status: "active" })).toBe("search=ana&dialog=create&status=active");
  });

  it("removes blank and undefined values", () => {
    expect(patchSearchParams(current, { search: "  " })).toBe("dialog=create");
    expect(patchSearchParams(current, { search: undefined })).toBe("dialog=create");
  });

  it("keeps the cursor when only the page or the dialog changes", () => {
    expect(patchSearchParams(current, { cursor: "def" })).toBe("search=ana&cursor=def&dialog=create");
    expect(patchSearchParams(current, { dialog: undefined, saved: "created" })).toBe(
      "search=ana&cursor=abc&saved=created",
    );
  });

  it("does not change the params it was given", () => {
    patchSearchParams(current, { search: "bo" });
    expect(current.toString()).toBe("search=ana&cursor=abc&dialog=create");
  });
});
