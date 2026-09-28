import assert from "node:assert/strict";
import { test } from "node:test";

import { parseItem } from "../dist/resolve/normalize.js";
import { orderedAmount, orderedQuantity } from "../dist/daemon/fill.js";
import { isMultipleOfStep } from "../dist/utils/step.js";

const COMPANY = "1ec88c5d-a050-669c-8467-570a157f3e31";

function product(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "p-1",
    name: "Тестовий товар",
    slug: "test-product",
    stock: 100,
    available: true,
    companyId: COMPANY,
    weighted: false,
    displayRatio: null,
    step: 1,
    ...overrides,
  };
}

const WEIGHTED_PRODUCTS: readonly [string, Record<string, unknown>][] = [
  ["weighted, step 0.2", product({ weighted: true, displayRatio: "1кг", step: 0.2 })],
  ["weighted, step 0.35", product({ weighted: true, displayRatio: "1кг", step: 0.35 })],
  ["weighted, step 0.5", product({ weighted: true, displayRatio: "1кг", step: 0.5 })],
];

const PACKAGED_PRODUCTS: readonly [string, Record<string, unknown>][] = [
  ["packaged, no stated contents", product({ weighted: false, displayRatio: null, step: 1 })],
  ["packaged, contents 10шт", product({ weighted: false, displayRatio: "10шт", step: 1 })],
  ["packaged, contents 15шт/уп", product({ weighted: false, displayRatio: "15шт/уп", step: 1 })],
  ["packaged, contents 950г", product({ weighted: false, displayRatio: "950г", step: 1 })],
];

const ZERO_STEP_PRODUCTS: readonly [string, Record<string, unknown>][] = [
  ["weighted, step 0", product({ weighted: true, displayRatio: "1кг", step: 0 })],
];

const PRODUCTS: readonly [string, Record<string, unknown>][] = [
  ...WEIGHTED_PRODUCTS,
  ...PACKAGED_PRODUCTS,
  ...ZERO_STEP_PRODUCTS,
];

const ITEMS: readonly [string, string][] = [
  ["a bare number", "х 2"],
  ["a count in pieces", "х 2 шт"],
  ["a fractional count", "х 1.5 шт"],
  ["a count of zero", "х 0 шт"],
  ["a mass in kilograms", "х 0.5 кг"],
  ["a mass in grams", "х 300 г"],
  ["a larger count", "х 10 шт"],
  ["no quantity at all", "х"],
];

for (const [itemLabel, text] of ITEMS) {
  for (const [productLabel, candidate] of PRODUCTS) {
    test(`${itemLabel} against a product ${productLabel} resolves to a quantity cart set would accept`, () => {
      const parsed = parseItem(text);
      const quantity = orderedQuantity(parsed as never, candidate as never);

      assert.ok(
        quantity === 0 || (quantity > 0 && isMultipleOfStep(quantity, candidate.step as number)),
        `orderedQuantity(${text}, step ${candidate.step}) resolved to ${quantity}, which cart set would refuse`,
      );
    });
  }
}

const NO_USABLE_STEP: readonly [string, string, number][] = [
  ["a bare number", "х 2", 2],
  ["a count in pieces", "х 2 шт", 2],
  ["a fractional count", "х 1.5 шт", 2],
  ["a count of zero", "х 0 шт", 0],
  ["a mass in kilograms", "х 0.5 кг", 1],
  ["a mass in grams", "х 300 г", 1],
  ["a larger count", "х 10 шт", 10],
  ["no quantity at all", "х", 1],
];

for (const [itemLabel, text, expected] of NO_USABLE_STEP) {
  test(`${itemLabel} against a weighted product with no usable step counts whole units: ${text}`, () => {
    const parsed = parseItem(text);
    const noStep = product({ weighted: true, displayRatio: "1кг", step: 0 });

    assert.equal(orderedQuantity(parsed as never, noStep as never), expected);
  });
}

const NO_USABLE_STEP_MASSES: readonly [string, string][] = [
  ["a mass in kilograms", "х 0.5 кг"],
  ["a mass in grams", "х 300 г"],
];

for (const [itemLabel, text] of NO_USABLE_STEP_MASSES) {
  test(`${itemLabel} against a weighted product with no usable step says the amount was chosen: ${text}`, () => {
    const parsed = parseItem(text);
    const noStep = product({ weighted: true, displayRatio: "1кг", step: 0 });

    assert.equal(orderedAmount(parsed as never, noStep as never).note, "chosen");
  });
}
