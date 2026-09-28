import assert from "node:assert/strict";
import { test } from "node:test";

const { detectRestrictionConflicts } = await import("../dist/resolve/restrictions.js");

const VEGAN = { slug: "vegan", name: "Веган" };
const NO_SUGAR = { slug: "no-sugar", name: null };
const UNKNOWN = { slug: "made-up-restriction", name: "Щось" };

test("a product touching a stored restriction is reported", () => {
  const conflicts = detectRestrictionConflicts("Молоко Яготинське 2,5% 950г", [VEGAN]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].slug, "vegan");
});

test("a product touching no stored restriction reports nothing", () => {
  const conflicts = detectRestrictionConflicts("Вода Моршинська негазована 2л", [VEGAN, NO_SUGAR]);

  assert.deepEqual(conflicts, []);
});

test("a restriction the table has no triggers for never matches", () => {
  const conflicts = detectRestrictionConflicts("Молоко Яготинське 2,5% 950г", [UNKNOWN]);

  assert.deepEqual(conflicts, []);
});

test("several restrictions can be touched by the same product", () => {
  const conflicts = detectRestrictionConflicts("Печиво вівсяне цукор ванільний", [VEGAN, NO_SUGAR]);

  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].slug, "no-sugar");
});
