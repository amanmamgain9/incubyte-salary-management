import { describe, expect, it } from "vitest";
import { employmentDateErrors, type StoredEmploymentDates } from "@/server/employees/status";

const stored = (overrides: Partial<StoredEmploymentDates> = {}): StoredEmploymentDates => ({
  joining_date: "2024-03-01",
  last_working_day: null,
  latest_revision_date: null,
  ...overrides,
});

describe("employmentDateErrors", () => {
  it("accepts a patch without date fields", () => {
    expect(employmentDateErrors(stored(), {})).toBeNull();
  });

  it("accepts a last working day on the joining date", () => {
    expect(employmentDateErrors(stored(), { last_working_day: "2024-03-01" })).toBeNull();
  });

  it("rejects a last working day before the stored joining date", () => {
    expect(employmentDateErrors(stored(), { last_working_day: "2024-02-29" })).toEqual({
      last_working_day: "Must be on or after the joining date",
    });
  });

  it("checks a last working day against a joining date submitted with it, keyed by the last working day", () => {
    expect(employmentDateErrors(stored(), { joining_date: "2024-06-01", last_working_day: "2024-05-31" })).toEqual({
      last_working_day: "Must be on or after the joining date",
    });
  });

  it("rejects a joining date after the stored last working day", () => {
    expect(employmentDateErrors(stored({ last_working_day: "2024-12-31" }), { joining_date: "2025-01-01" })).toEqual({
      joining_date: "Must be on or before the last working day",
    });
  });

  it("accepts a joining date after the latest revision, since revisions may precede joining", () => {
    expect(employmentDateErrors(stored({ latest_revision_date: "2024-05-10" }), { joining_date: "2024-07-01" })).toBeNull();
  });

  it("rejects a last working day before the latest revision after the initial salary", () => {
    expect(
      employmentDateErrors(stored({ latest_revision_date: "2025-04-01" }), { last_working_day: "2025-03-31" }),
    ).toEqual({ last_working_day: "Must be on or after the latest salary revision (2025-04-01)" });
  });

  it("accepts a last working day on the latest revision date", () => {
    expect(
      employmentDateErrors(stored({ latest_revision_date: "2025-04-01" }), { last_working_day: "2025-04-01" }),
    ).toBeNull();
  });

  it("accepts clearing the last working day", () => {
    const departed = stored({ last_working_day: "2024-12-31", latest_revision_date: "2024-11-01" });

    expect(employmentDateErrors(departed, { last_working_day: null })).toBeNull();
  });

  it("accepts a later joining date when the same patch clears the last working day", () => {
    const departed = stored({ last_working_day: "2024-12-31" });

    expect(employmentDateErrors(departed, { joining_date: "2025-02-01", last_working_day: null })).toBeNull();
  });
});
