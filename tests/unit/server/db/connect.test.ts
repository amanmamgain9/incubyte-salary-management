import { describe, expect, it } from "vitest";
import { databaseName, siblingDatabaseUrl } from "@/server/db/connect";

describe("siblingDatabaseUrl", () => {
  it("keeps the server and credentials and suffixes the database name", () => {
    expect(siblingDatabaseUrl("postgres://acme_app:secret@127.0.0.1:55432/acme", "_e2e")).toBe(
      "postgres://acme_app:secret@127.0.0.1:55432/acme_e2e",
    );
  });

  it("keeps connection options", () => {
    expect(siblingDatabaseUrl("postgres://u:p@db.internal/acme?sslmode=require", "_test")).toBe(
      "postgres://u:p@db.internal/acme_test?sslmode=require",
    );
  });
});

describe("databaseName", () => {
  it("reads the decoded database name", () => {
    expect(databaseName("postgres://u:p@localhost/my%20db")).toBe("my db");
  });
});
