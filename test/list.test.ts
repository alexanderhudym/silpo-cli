import assert from "node:assert/strict";
import { test } from "node:test";

const { formatList, formatRows } = await import("../dist/utils/list.js");

test("puts rows one to a line", () => {
  assert.equal(formatRows(["id: @aal", "tag: home"]), "id: @aal\ntag: home");
});

test("puts a blank line between items", () => {
  assert.equal(formatList(["one", "two"]), "one\n\ntwo");
});

test("skips what there is nothing of, leaving no separator behind", () => {
  assert.equal(formatRows(["one", null, "two"]), "one\ntwo");
  assert.equal(formatList(["one", false, "two"]), "one\n\ntwo");
  assert.equal(formatRows(["", ""]), "");
  assert.equal(formatList([]), "");
});
