import assert from "node:assert/strict";
import { test } from "node:test";

const { toOneLine } = await import("../dist/utils/text.js");

test("puts a string on one line whatever whitespace it carries", () => {
  assert.equal(toOneLine("  spaced\ntext "), "spaced text");
  assert.equal(toOneLine("домофон\n\nне працює"), "домофон не працює");
  assert.equal(toOneLine("no\u00a0break\u00a0space"), "no break space");
  assert.equal(toOneLine("\t tabbed \t"), "tabbed");
  assert.equal(toOneLine("   "), "");
  assert.equal(toOneLine("plain"), "plain");
});
