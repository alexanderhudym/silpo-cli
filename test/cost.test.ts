import assert from "node:assert/strict";
import { test } from "node:test";

const { formatCostTiers } = await import("../dist/utils/cost.js");

test("names the cost and the order total it begins at", () => {
  assert.equal(formatCostTiers([{ cost: 69, fromOrderCost: 1299 }]), "69 from 1299");
});

test("joins several tiers in the order the payload gave", () => {
  assert.equal(
    formatCostTiers([
      { cost: 69, fromOrderCost: 1299 },
      { cost: 1, fromOrderCost: 1899 },
    ]),
    "69 from 1299, 1 from 1899",
  );
});

test("yields nothing without tiers", () => {
  assert.equal(formatCostTiers([]), "");
});

test("keeps a free delivery tier as the number it is", () => {
  assert.equal(formatCostTiers([{ cost: 0, fromOrderCost: 2500 }]), "0 from 2500");
});
