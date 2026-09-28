import assert from "node:assert/strict";
import { test } from "node:test";

const { parseProductName } = await import("../dist/resolve/product-name.js");

test("a percentage anywhere in a product title is a specification", () => {
  const parsed = parseProductName("Молоко ультрапастеризоване Яготинське 2,5% тетра 950г");

  assert.deepEqual(parsed.specification, { kind: "percentage", value: 2.5 });
  assert.equal(parsed.packSize, 950);
  assert.equal(parsed.packUnit, "г");
});

test("a title with no percentage carries no specification", () => {
  const parsed = parseProductName("Вода Моршинська негазована 2л");

  assert.equal(parsed.specification, undefined);
  assert.equal(parsed.packSize, 2);
  assert.equal(parsed.packUnit, "л");
});

test("a title with no pack carries no packSize or packUnit", () => {
  const parsed = parseProductName("Креветка варена 80/100");

  assert.equal(parsed.specification, undefined);
  assert.equal(parsed.packSize, undefined);
  assert.equal(parsed.packUnit, undefined);
});

test("a currency mention is not mistaken for a pack size", () => {
  const parsed = parseProductName("Подарунковий сертифікат на 100грн");

  assert.equal(parsed.packSize, undefined);
  assert.equal(parsed.packUnit, undefined);
});

test("a fractional volume with a space before the unit is still a pack", () => {
  const parsed = parseProductName("Йогурт питний Активіа полуниця 2%, 0.5 л");

  assert.deepEqual(parsed.specification, { kind: "percentage", value: 2 });
  assert.equal(parsed.packSize, 0.5);
  assert.equal(parsed.packUnit, "л");
});
