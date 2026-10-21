import { describe, expect, it } from "vitest";
import { formDiff } from "@/lib/form-diff";

const opened = { name: "Ada Lovelace", department_id: "engineering", last_working_day: "" };

describe("formDiff", () => {
  it("reports no changes for an untouched form", () => {
    expect(formDiff({ baseline: opened, values: opened }, opened)).toEqual({ changes: {}, outdated: false });
  });

  it("reports only the fields edited since the form opened", () => {
    const values = { ...opened, name: "Ada King" };
    expect(formDiff({ baseline: opened, values }, opened).changes).toEqual({ name: "Ada King" });
  });

  it("does not report a field edited back to its opened value", () => {
    expect(formDiff({ baseline: opened, values: { ...opened } }, opened).changes).toEqual({});
  });

  it("keeps untouched fields out of the changes when the record is updated elsewhere while editing", () => {
    const values = { ...opened, name: "Ada King" };
    const latest = { ...opened, department_id: "finance" };
    expect(formDiff({ baseline: opened, values }, latest).changes).toEqual({ name: "Ada King" });
  });

  it("reports the form as outdated when the record changed since it opened", () => {
    const latest = { ...opened, last_working_day: "2026-03-31" };
    expect(formDiff({ baseline: opened, values: opened }, latest).outdated).toBe(true);
  });
});
