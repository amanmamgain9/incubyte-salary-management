import { describe, expect, it } from "vitest";
import type { Page, Paging } from "@/contracts/paging";
import { InvalidCursorError } from "@/server/core/errors";
import { paginateKeyset } from "@/server/core/pagination";

type Row = { id: number };
type Key = readonly [number];
type From = { key: Key; before: boolean } | null;
type Input = Paging & Record<string, unknown>;

// In-memory stand-in for a keyset query: ORDER BY id (descending when `before`), LIMIT take.
function fakeTable(size: number) {
  const rows: Row[] = Array.from({ length: size }, (_, i) => ({ id: i + 1 }));
  const calls: { from: From; take: number }[] = [];
  const fetch = async (from: From, take: number): Promise<Row[]> => {
    calls.push({ from, take });
    if (!from) return rows.slice(0, take);
    const [id] = from.key;
    return from.before
      ? rows.filter((row) => row.id < id).reverse().slice(0, take)
      : rows.filter((row) => row.id > id).slice(0, take);
  };
  const count = async () => rows.length;
  return { rows, calls, fetch, count };
}

type Table = ReturnType<typeof fakeTable>;

const listPage = (table: Table, input: Input, scope = "employees.list") =>
  paginateKeyset({
    scope,
    input,
    keyOf: (row: Row): Key => [row.id],
    fetch: table.fetch,
    count: table.count,
  });

const ids = (page: Page<Row>) => page.items.map((row) => row.id);

function cursorOf(cursor: string | null): string {
  if (cursor === null) throw new Error("expected a cursor");
  return cursor;
}

describe("paginateKeyset", () => {
  it("returns the first page with its range start, total count and only a next cursor", async () => {
    const page = await listPage(fakeTable(7), { limit: 3 });

    expect(ids(page)).toEqual([1, 2, 3]);
    expect(page).toMatchObject({ total_count: 7, range_start: 1, prev_cursor: null });
    expect(page.next_cursor).toEqual(expect.any(String));
  });

  it("fetches one row more than the limit to detect a following page", async () => {
    const table = fakeTable(7);

    await listPage(table, { limit: 3 });

    expect(table.calls).toEqual([{ from: null, take: 4 }]);
  });

  it("uses the default page size of 50 when no limit is given", async () => {
    const table = fakeTable(60);

    const page = await listPage(table, {});

    expect(table.calls).toEqual([{ from: null, take: 51 }]);
    expect(page.items).toHaveLength(50);
  });

  it("returns the following page from a next cursor", async () => {
    const table = fakeTable(7);
    const first = await listPage(table, { limit: 3 });

    const second = await listPage(table, { limit: 3, cursor: cursorOf(first.next_cursor) });

    expect(table.calls[1]).toEqual({ from: { key: [3], before: false }, take: 4 });
    expect(ids(second)).toEqual([4, 5, 6]);
    expect(second.range_start).toBe(4);
    expect(second.prev_cursor).toEqual(expect.any(String));
    expect(second.next_cursor).toEqual(expect.any(String));
  });

  it("has no next cursor on the last page", async () => {
    const table = fakeTable(6);
    const first = await listPage(table, { limit: 3 });

    const last = await listPage(table, { limit: 3, cursor: cursorOf(first.next_cursor) });

    expect(ids(last)).toEqual([4, 5, 6]);
    expect(last.next_cursor).toBeNull();
  });

  it("returns the preceding page in ascending order from a previous cursor", async () => {
    const table = fakeTable(7);
    const first = await listPage(table, { limit: 3 });
    const second = await listPage(table, { limit: 3, cursor: cursorOf(first.next_cursor) });

    const back = await listPage(table, { limit: 3, cursor: cursorOf(second.prev_cursor) });

    expect(table.calls[2]).toEqual({ from: { key: [4], before: true }, take: 4 });
    expect(ids(back)).toEqual([1, 2, 3]);
    expect(back).toMatchObject({ range_start: 1, prev_cursor: null });
    expect(back.next_cursor).toEqual(expect.any(String));
  });

  it("keeps a previous cursor when going back to a page that is not the first", async () => {
    const table = fakeTable(9);
    const first = await listPage(table, { limit: 3 });
    const second = await listPage(table, { limit: 3, cursor: cursorOf(first.next_cursor) });
    const third = await listPage(table, { limit: 3, cursor: cursorOf(second.next_cursor) });

    const back = await listPage(table, { limit: 3, cursor: cursorOf(third.prev_cursor) });

    expect(ids(back)).toEqual([4, 5, 6]);
    expect(back.range_start).toBe(4);
    expect(back.prev_cursor).toEqual(expect.any(String));
  });

  it("walks forward again from a page reached by going back", async () => {
    const table = fakeTable(7);
    const first = await listPage(table, { limit: 3 });
    const second = await listPage(table, { limit: 3, cursor: cursorOf(first.next_cursor) });
    const back = await listPage(table, { limit: 3, cursor: cursorOf(second.prev_cursor) });

    const forward = await listPage(table, { limit: 3, cursor: cursorOf(back.next_cursor) });

    expect(ids(forward)).toEqual([4, 5, 6]);
    expect(forward.range_start).toBe(4);
  });

  it("starts at 1 when going back reaches the first row after earlier rows were removed", async () => {
    const table = fakeTable(7);
    const first = await listPage(table, { limit: 3 });
    const second = await listPage(table, { limit: 3, cursor: cursorOf(first.next_cursor) });
    table.rows.splice(0, 1);

    const back = await listPage(table, { limit: 3, cursor: cursorOf(second.prev_cursor) });

    expect(ids(back)).toEqual([2, 3]);
    expect(back).toMatchObject({ range_start: 1, prev_cursor: null });
  });

  it("returns a single page with no cursors when everything fits", async () => {
    const page = await listPage(fakeTable(3), { limit: 3 });

    expect(ids(page)).toEqual([1, 2, 3]);
    expect(page).toMatchObject({ next_cursor: null, prev_cursor: null, total_count: 3, range_start: 1 });
  });

  it("returns an empty page with no cursors and range start 0", async () => {
    const page = await listPage(fakeTable(0), { limit: 3 });

    expect(page).toEqual({ items: [], next_cursor: null, prev_cursor: null, total_count: 0, range_start: 0 });
  });

  it("accepts a cursor when only the limit changes", async () => {
    const table = fakeTable(7);
    const first = await listPage(table, { limit: 3 });

    const second = await listPage(table, { limit: 2, cursor: cursorOf(first.next_cursor) });

    expect(ids(second)).toEqual([4, 5]);
  });

  it("accepts a cursor when the same filters arrive in a different key order", async () => {
    const table = fakeTable(7);
    const first = await listPage(table, { search: "a", department_id: "ENG", limit: 3 });
    const cursor = cursorOf(first.next_cursor);

    const second = await listPage(table, { department_id: "ENG", limit: 3, search: "a", cursor });

    expect(ids(second)).toEqual([4, 5, 6]);
  });

  it("rejects a cursor reused with a different filter value", async () => {
    const table = fakeTable(7);
    const first = await listPage(table, { department_id: "ENG", limit: 3 });

    await expect(
      listPage(table, { department_id: "OPS", limit: 3, cursor: cursorOf(first.next_cursor) }),
    ).rejects.toThrow(InvalidCursorError);
  });

  it("rejects a cursor reused with an added filter", async () => {
    const table = fakeTable(7);
    const first = await listPage(table, { department_id: "ENG", limit: 3 });

    await expect(
      listPage(table, { department_id: "ENG", search: "a", limit: 3, cursor: cursorOf(first.next_cursor) }),
    ).rejects.toThrow(InvalidCursorError);
  });

  it("rejects a cursor issued for a different scope", async () => {
    const table = fakeTable(7);
    const first = await listPage(table, { limit: 3 }, "employees.list");

    await expect(
      listPage(table, { limit: 3, cursor: cursorOf(first.next_cursor) }, "salaries.history"),
    ).rejects.toThrow(InvalidCursorError);
  });

  it("rejects a tampered cursor without fetching rows", async () => {
    const table = fakeTable(7);
    const first = await listPage(table, { limit: 3 });
    const cursor = cursorOf(first.next_cursor);
    const tampered = `${cursor.startsWith("A") ? "B" : "A"}${cursor.slice(1)}`;

    await expect(listPage(table, { limit: 3, cursor: tampered })).rejects.toThrow(InvalidCursorError);
    expect(table.calls).toHaveLength(1);
  });

  it("rejects an empty cursor string", async () => {
    await expect(listPage(fakeTable(7), { limit: 3, cursor: "" })).rejects.toThrow(InvalidCursorError);
  });
});
