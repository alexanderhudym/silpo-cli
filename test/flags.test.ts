import assert from "node:assert/strict";
import { test } from "node:test";

const { formatFlags } = await import("../dist/utils/flags.js");

test("names only the flags that are raised", () => {
  assert.equal(
    formatFlags(
      {
        isLimitedAlcohol: false,
        isLimitedTobacco: false,
        isLimitedCookedFood: true,
        isLimitedOwnCooking: true,
      },
      "isLimited",
    ),
    "cookedFood, ownCooking",
  );
});

test("yields nothing when no flag is raised", () => {
  assert.equal(formatFlags({ isLimitedAlcohol: false, isLimitedTobacco: false }, "isLimited"), "");
  assert.equal(formatFlags({}, "isLimited"), "");
});

test("keeps a name that does not carry the prefix", () => {
  assert.equal(formatFlags({ vegan: true, isLimitedAlcohol: true }, "isLimited"), "vegan, alcohol");
});

test("strips nothing when no prefix is given", () => {
  assert.equal(formatFlags({ isLimitedAlcohol: true }), "isLimitedAlcohol");
  assert.equal(formatFlags({ Alcohol: true }), "Alcohol");
});

test("keeps the order the payload gave", () => {
  assert.equal(formatFlags({ b: true, a: true, c: true }), "b, a, c");
});
