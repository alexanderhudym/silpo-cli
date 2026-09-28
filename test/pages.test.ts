import assert from "node:assert/strict";
import { test } from "node:test";

const { readCapped, countedAs } = await import("../dist/utils/paginate.js");
const { OFFLINE_ORDERS_CAP, ONLINE_ORDERS_CAP } = await import("../dist/mcp/silpo.js");

const CAP = 10;

function receipts(total: number) {
  const sent: { limit: number; offset: number }[] = [];

  return {
    sent,
    fetch: async (limit: number, offset: number) => {
      sent.push({ limit, offset });

      return {
        rows: Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => ({
          id: offset + i,
        })),
        total,
      };
    },
  };
}

test("more rows than one call may return are read in as many calls as it takes", async () => {
  const { sent, fetch } = receipts(40);

  const rows = await readCapped(CAP, 25, fetch);

  assert.equal(rows.length, 25, "fewer rows came back than were asked for");
  assert.deepEqual(
    sent.map(({ offset }) => offset),
    [0, 10, 20],
    "the pages did not walk the offsets in order",
  );
  for (const { limit } of sent) {
    assert.equal(limit, CAP, "a page asked the server for more than it accepts");
  }
});

test("reading stops at the rows that exist rather than asking past the end", async () => {
  const { sent, fetch } = receipts(14);

  const rows = await readCapped(CAP, 50, fetch);

  assert.equal(rows.length, 14, "the account's 14 receipts did not all come back");
  assert.equal(sent.length, 2, "a page was requested past the end of the list");
});

test("a cap the rows do not reach still returns every row", async () => {
  const { fetch } = receipts(7);

  assert.equal((await readCapped(CAP, 100, fetch)).length, 7);
});

test("the summary over a merged list counts what was merged", () => {
  assert.equal(
    countedAs("Found 10 offline orders (total: 20)", 25),
    "Found 25 offline orders (total: 20)",
    "the printed summary named one page's count over a merged list",
  );
});

test("a summary the server did not shape as a count is replaced rather than left lying", () => {
  assert.equal(countedAs("no number here", 25), "Found 25");
});

test("the caps sit beside the tools they belong to and match the served schemas", () => {
  assert.equal(OFFLINE_ORDERS_CAP, 10);
  assert.equal(ONLINE_ORDERS_CAP, 50);
});

test("a page that overshoots the cap is trimmed to what was asked for", async () => {
  const { fetch } = receipts(40);

  const rows = await readCapped(CAP, 25, fetch);

  assert.equal(rows.length, 25, "whole pages were returned past the number asked for");
  assert.deepEqual(rows[24], { id: 24 }, "the rows kept are not the first 25");
});
