import assert from "node:assert/strict";
import { test } from "node:test";

const { formatEntryAsRow, formatEntryAsSection } = await import("../dist/utils/record.js");

test("writes a key beside its value, whatever the value is", () => {
  assert.equal(formatEntryAsRow("tag", "home"), "tag: home");
  assert.equal(formatEntryAsRow("floor", 3), "floor: 3");
  assert.equal(formatEntryAsRow("itsMe", true), "itsMe: true");
});

test("writes a value that is false or zero, which is a value", () => {
  assert.equal(formatEntryAsRow("itsMe", false), "itsMe: false");
  assert.equal(formatEntryAsRow("floor", 0), "floor: 0");
});

test("takes the separator from the caller", () => {
  assert.equal(formatEntryAsRow("vegan", "Веган", "="), "vegan=Веган");
  assert.equal(formatEntryAsRow("limit", 3, " "), "limit 3");
});

test("keeps a row on the one line it occupies", () => {
  assert.equal(
    formatEntryAsRow("comment", "  домофон\n\nне працює  "),
    "comment: домофон не працює",
  );
});

test("writes a key above its value when the value is a block", () => {
  assert.equal(formatEntryAsSection("members", "name: Олена"), "members\nname: Олена");
  assert.equal(
    formatEntryAsSection("pets", "name: Мурчик\nslug: cat"),
    "pets\nname: Мурчик\nslug: cat",
  );
});
