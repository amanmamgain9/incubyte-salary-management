import "server-only";

/** Signs payloads into opaque cursor strings and verifies them back. */
export type CursorCodec = {
  encode(payload: Readonly<Record<string, unknown>>): string;
  /** Returns the signed payload; throws InvalidCursorError for anything it did not sign. */
  decode(cursor: string): unknown;
};

export function createCursorCodec(_secret: string): CursorCodec {
  throw new Error("not implemented");
}
