import { describe, expect, it } from "vitest";
import { createCursorCodec } from "@/server/core/cursor";
import { InvalidCursorError } from "@/server/core/errors";

const secret = "cursor-test-secret-0000000000000000000";
const otherSecret = "other-test-secret-00000000000000000000";
const payload = {
  scope: "reports.salaryGrowth",
  fingerprint: "f1",
  key: ["2026-01", "IN", "INR"],
  before: false,
  range_start: 51,
};

const toBase64Url = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

describe("createCursorCodec", () => {
  it("decodes a cursor it encoded back to the same payload", () => {
    const codec = createCursorCodec(secret);

    expect(codec.decode(codec.encode(payload))).toEqual(payload);
  });

  it("encodes into an opaque URL-safe string that does not show the payload", () => {
    const cursor = createCursorCodec(secret).encode(payload);

    expect(cursor).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(cursor).not.toContain("reports.salaryGrowth");
  });

  it("rejects a cursor whose payload was replaced but whose signature was kept", () => {
    const codec = createCursorCodec(secret);
    const [, signature] = codec.encode(payload).split(".");
    const forged = `${toBase64Url({ ...payload, range_start: 1 })}.${signature}`;

    expect(() => codec.decode(forged)).toThrow(InvalidCursorError);
  });

  it("rejects a cursor with any single character changed", () => {
    const codec = createCursorCodec(secret);
    const cursor = codec.encode(payload);

    for (let i = 0; i < cursor.length; i += 1) {
      const swapped = cursor[i] === "A" ? "B" : "A";
      const tampered = `${cursor.slice(0, i)}${swapped}${cursor.slice(i + 1)}`;

      expect(() => codec.decode(tampered), `position ${i}`).toThrow(InvalidCursorError);
    }
  });

  it("rejects a cursor signed with a different secret", () => {
    const cursor = createCursorCodec(otherSecret).encode(payload);

    expect(() => createCursorCodec(secret).decode(cursor)).toThrow(InvalidCursorError);
  });

  it.each(["", "not-a-cursor", ".", "a.", ".b", "a.b", "a.b.c", "%%%.%%%"])(
    "rejects the malformed cursor %j",
    (cursor) => {
      expect(() => createCursorCodec(secret).decode(cursor)).toThrow(InvalidCursorError);
    },
  );
});
