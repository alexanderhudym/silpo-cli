import assert from "node:assert/strict";
import { test } from "node:test";

const { KILOGRAM, formatAmount, formatPricedName, isPieceUnit, isWeightUnit } = await import(
  "../dist/utils/price.js"
);

test("names the product and its price", () => {
  assert.equal(
    formatPricedName({ name: "Піца Американа", price: 99 }),
    "Піца Американа — 99 ₴",
  );
});

test("puts the size of one package beside the name", () => {
  assert.equal(
    formatPricedName({ name: "Сирок глазурований", price: 12.99, size: "36г" }),
    "Сирок глазурований 36г — 12.99 ₴",
  );
});

test("names the unit the price is per", () => {
  assert.equal(
    formatPricedName({ name: "Креветка варена 80/100", price: 399, unit: KILOGRAM }),
    "Креветка варена 80/100 — 399 ₴/кг",
  );
});

test("keeps the previous price where the payload carries one", () => {
  assert.equal(
    formatPricedName({ name: "Креветка варена 80/100", price: 399, oldPrice: 579, unit: KILOGRAM }),
    "Креветка варена 80/100 — 399 ₴/кг was 579",
  );
});

test("shows nothing where the payload carries no previous price and no size", () => {
  assert.equal(
    formatPricedName({ name: "Цукіні", price: 39.99, size: null, oldPrice: null, unit: null }),
    "Цукіні — 39.99 ₴",
  );
});

test("collapses a name the payload gave on several lines", () => {
  assert.equal(
    formatPricedName({ name: "Молоко\n  Яготинське  2,6%", price: 61.49 }),
    "Молоко Яготинське 2,6% — 61.49 ₴",
  );
});

test("prints the price digit for digit, converting nothing", () => {
  assert.equal(
    formatPricedName({ name: "Хліб «Крафтяр»", price: 100.43, unit: KILOGRAM }),
    "Хліб «Крафтяр» — 100.43 ₴/кг",
  );
});

test("suffixes an amount with the unit it is counted in, and leaves it alone without one", () => {
  assert.equal(formatAmount(47.6, KILOGRAM), "47.6кг");
  assert.equal(formatAmount(0, KILOGRAM), "0кг");
  assert.equal(formatAmount(-1, null), "-1");
});

test("tells a unit of weight from a package size and from a count of pieces", () => {
  assert.ok(isWeightUnit("кг"));
  assert.ok(isWeightUnit("г"));
  assert.ok(!isWeightUnit("500г"));
  assert.ok(!isWeightUnit("шт"));
  assert.ok(!isWeightUnit(null));
  assert.ok(isPieceUnit("шт"));
  assert.ok(!isPieceUnit("20шт"));
});
