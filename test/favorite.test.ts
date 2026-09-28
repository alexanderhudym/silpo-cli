import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { clearToolCalls, run, setPayloads, startDaemon, stopDaemon, toolCalls } from "./harness.ts";

const DETAILS_TOOL = "silpo_get_product_details";
const FAVORITES_TOOL = "silpo_add_or_update_favorite_products";

const COMPANY = "1ec88c5d-a050-669c-8467-570a157f3e31";
const BRANCH = "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468";

function card(id: string, slug: string): Record<string, unknown> {
  return {
    success: true,
    product: {
      id,
      name: "Товар",
      slug,
      price: 1,
      oldPrice: null,
      stock: 1,
      available: true,
      weighted: false,
      step: 1,
      ratio: null,
      displayRatio: null,
      url: "https://silpo.ua/product/x",
      images: [],
      attributes: null,
      companyId: COMPANY,
      branchId: BRANCH,
    },
  };
}

function asked(field: string): unknown[] {
  return toolCalls()
    .filter((call) => call.name === FAVORITES_TOOL)
    .map((call) => call.arguments[field]);
}

before(startDaemon);
after(stopDaemon);

test("the intent is the command that was run, not a field of an argument", async () => {
  setPayloads({
    [DETAILS_TOOL]: card("1ed075ea-e448-69d4-a8d3-dd63763181f9", "tovar-a-111111"),
    [FAVORITES_TOOL]: { success: true, summary: "Favorites updated: added 1", actions: [] },
  });
  clearToolCalls();

  await run(["products", "favorite", "tovar-a-111111"]);

  assert.deepEqual(asked("actions"), [
    [{ productId: "1ed075ea-e448-69d4-a8d3-dd63763181f9", externalProductId: 111111, toDelete: false }],
  ]);

  setPayloads({
    [DETAILS_TOOL]: card("1ed07606-0894-6584-ac01-dd63763181f9", "tovar-b-222222"),
    [FAVORITES_TOOL]: { success: true, summary: "Favorites updated: removed 1", actions: [] },
  });
  clearToolCalls();

  await run(["products", "unfavorite", "tovar-b-222222"]);

  assert.deepEqual(asked("actions"), [
    [{ productId: "1ed07606-0894-6584-ac01-dd63763181f9", externalProductId: 222222, toDelete: true }],
  ]);
});

test("several products travel in the one call the command names", async () => {
  setPayloads({
    [DETAILS_TOOL]: card("1ed075ea-e448-69d4-a8d3-dd63763181f9", "tovar-a-111111"),
    [FAVORITES_TOOL]: { success: true, summary: "Favorites updated: removed 2", actions: [] },
  });
  clearToolCalls();

  await run(["products", "unfavorite", "tovar-a-111111", "tovar-a-111111"]);

  assert.equal(asked("actions").length, 1, "the products did not travel in a single call");
});

test("the favorites update says per product which of the two happened", async () => {
  setPayloads({
    [DETAILS_TOOL]: card("1ed075ea-e448-69d4-a8d3-dd63763181f9", "tovar-999999"),
    [FAVORITES_TOOL]: {
      success: true,
      summary: "Favorites updated: added 1, removed 1",
      actions: [
        { productId: "1ed075ea-e448-69d4-a8d3-dd63763181f9", toDelete: false },
        { productId: "1ed07606-0894-6584-ac01-dd63763181f9", toDelete: true },
      ],
    },
  });

  const text = await run(["products", "favorite", "tovar-999999"]);

  assert.equal(
    text,
    "Favorites updated: added 1, removed 1\n\n" +
      "added: 1ed075ea-e448-69d4-a8d3-dd63763181f9\n" +
      "removed: 1ed07606-0894-6584-ac01-dd63763181f9\n",
  );
});
