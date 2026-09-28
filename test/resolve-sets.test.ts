import assert from "node:assert/strict";
import { test } from "node:test";

const { rankSets } = await import("../dist/resolve/sets.js");

function setTable(records: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { records, bySlug: new Map(records.map((record) => [record.slug, record] as const)) };
}

test("a set is matched by title and by slug", () => {
  const table = setTable([{ slug: "dlia-vecheri", title: "Для вечері", description: undefined }]);

  const byTitle = rankSets(table, "Для вечері");
  assert.equal(byTitle.length, 1);
  assert.equal(byTitle[0].record.slug, "dlia-vecheri");

  const bySlug = rankSets(table, "dlia-vecheri");
  assert.equal(bySlug.length, 1);
  assert.equal(bySlug[0].record.slug, "dlia-vecheri");
});
