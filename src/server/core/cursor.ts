import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { InvalidCursorError } from "@/server/core/errors";

/** Signs payloads into opaque cursor strings and verifies them back. */
export type CursorCodec = {
  encode(payload: Readonly<Record<string, unknown>>): string;
  /** Returns the signed payload; throws InvalidCursorError for anything it did not sign. */
  decode(cursor: string): unknown;
};

// Cursor format: `<base64url(JSON payload)>.<base64url(HMAC-SHA256(secret, body))>`.
export function createCursorCodec(secret: string): CursorCodec {
  const sign = (body: string) => createHmac("sha256", secret).update(body).digest("base64url");

  return {
    encode(payload) {
      const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
      return `${body}.${sign(body)}`;
    },
    decode(cursor) {
      const [body, signature, ...rest] = cursor.split(".");
      if (!body || !signature || rest.length > 0 || !sameString(signature, sign(body))) {
        throw new InvalidCursorError();
      }
      return parseBody(body);
    },
  };
}

// Compares the encoded strings, so non-canonical base64url spellings of a valid signature are rejected too.
function sameString(actual: string, expected: string): boolean {
  const a = Buffer.from(actual, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function parseBody(body: string): unknown {
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new InvalidCursorError();
  }
}
