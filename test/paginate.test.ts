import assert from "node:assert/strict";
import { test } from "node:test";

const { paginate } = await import("../dist/utils/paginate.js");

test("a listing that fits on one page is fetched once", async () => {
  const offsetsRequested: number[] = [];

  const rows = await paginate(500, async (limit, offset) => {
    offsetsRequested.push(offset);

    return { rows: Array.from({ length: 10 }, (_, index) => offset + index), total: 10 };
  });

  assert.deepEqual(offsetsRequested, [0]);
  assert.deepEqual(rows, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("a listing that outgrows one page is fanned out and concatenated in order", async () => {
  const offsetsRequested: number[] = [];
  const total = 25;

  const rows = await paginate(10, async (limit, offset) => {
    offsetsRequested.push(offset);
    const count = Math.min(limit, total - offset);

    return { rows: Array.from({ length: count }, (_, index) => offset + index), total };
  });

  assert.deepEqual(offsetsRequested.sort((a, b) => a - b), [0, 10, 20]);
  assert.deepEqual(rows, Array.from({ length: 25 }, (_, index) => index));
});

test("a later page returning fewer rows than the total promised is still concatenated", async () => {
  const total = 30;

  const rows = await paginate(10, async (limit, offset) => {
    if (offset === 20) {
      return { rows: Array.from({ length: 3 }, (_, index) => offset + index), total };
    }

    const count = Math.min(limit, total - offset);

    return { rows: Array.from({ length: count }, (_, index) => offset + index), total };
  });

  assert.deepEqual(rows, [...Array.from({ length: 23 }, (_, index) => index)]);
});

test("pages that resolve out of order are still concatenated by page index", async () => {
  const total = 30;

  const rows = await paginate(10, async (limit, offset) => {
    const count = Math.min(limit, total - offset);
    const page = { rows: Array.from({ length: count }, (_, index) => offset + index), total };

    if (offset === 0) return page;

    const delay = offset === 10 ? 20 : 0;

    return new Promise((resolve) => setTimeout(() => resolve(page), delay));
  });

  assert.deepEqual(rows, Array.from({ length: 30 }, (_, index) => index));
});
