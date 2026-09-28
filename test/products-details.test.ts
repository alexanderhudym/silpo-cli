import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { BRANCH, clearToolCalls, run, setPayloads, startDaemon, stopDaemon, toolCalls } from "./harness.ts";

const FAVORITES_TOOL = "silpo_get_my_favorites";
const DETAILS_TOOL = "silpo_get_product_details";

const COMPANY = "1ec88c5d-a050-669c-8467-570a157f3e31";

function product(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "1ed07632-a969-664a-b656-dd63763181f9",
    name: "Товар",
    slug: "tovar-1",
    price: 10,
    oldPrice: null,
    stock: 1,
    available: true,
    image: null,
    weighted: false,
    step: 1,
    displayRatio: null,
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
    ...overrides,
  };
}

function favoritesPage(products: readonly Record<string, unknown>[]) {
  return {
    success: true,
    summary: `Found ${products.length} products`,
    products,
    meta: { limit: 30, offset: 0, total: products.length },
  };
}

function detailsPayload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    success: true,
    product: {
      id: "irrelevant",
      name: "Товар",
      slug: "tovar-1",
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
      attributes: { composition: "Вода" },
      companyId: COMPANY,
      branchId: BRANCH,
      ...overrides,
    },
  };
}

function asked(tool: string, field: string): unknown[] {
  return toolCalls()
    .filter((call) => call.name === tool)
    .map((call) => call.arguments[field]);
}

before(startDaemon);
after(stopDaemon);

test("a product the CLI holds nothing for is fetched and its attributes are printed", async () => {
  const id = "unknown-1";

  setPayloads({
    [FAVORITES_TOOL]: favoritesPage([product({ id, slug: id })]),
    [DETAILS_TOOL]: detailsPayload({ attributes: { composition: "Вода" } }),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--favorites", "--details"]);

  assert.ok(text.includes("composition: Вода"), text);
  assert.deepEqual(asked(DETAILS_TOOL, "slug"), [id]);
});

test("nothing fetched for a card is kept: an identical listing run again costs a fresh fetch", async () => {
  const id = "unknown-1";

  setPayloads({
    [FAVORITES_TOOL]: favoritesPage([product({ id, slug: id })]),
    [DETAILS_TOOL]: detailsPayload({ attributes: { composition: "Вода" } }),
  });
  clearToolCalls();

  await run(["products", "find", "--favorites", "--details"]);
  assert.equal(toolCalls().filter((call) => call.name === DETAILS_TOOL).length, 1);

  clearToolCalls();
  const second = await run(["products", "find", "--favorites", "--details"]);

  assert.ok(second.includes("composition: Вода"), second);
  assert.equal(toolCalls().filter((call) => call.name === DETAILS_TOOL).length, 1, "a second run did not fetch again");
});

test("a product whose dictionary carries only some keys prints those, requiring none", async () => {
  const id = "partial-1";

  setPayloads({
    [FAVORITES_TOOL]: favoritesPage([product({ id, slug: id })]),
    [DETAILS_TOOL]: detailsPayload({ attributes: { composition: "Вода" } }),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--favorites", "--details"]);

  assert.ok(text.includes("composition: Вода"), text);
  assert.ok(!text.includes("allergens"), text);
  assert.ok(!text.includes("country"), text);
});

test("the live half beside a listing is the listing's own, never a value the card carried", async () => {
  const id = "stale-1";

  setPayloads({
    [FAVORITES_TOOL]: favoritesPage([product({ id, slug: id, price: 42, stock: 7 })]),
    [DETAILS_TOOL]: detailsPayload({ attributes: { price: "999", stock: "0" } }),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--favorites", "--details"]);

  assert.match(text, /— 42 ₴/);
  assert.match(text, /stock: 7\b/);
  assert.ok(!text.includes("— 999"), text);
});

test("the static half covers the whole page with no ceiling", async () => {
  const count = 25;
  const products = Array.from({ length: count }, (_, index) =>
    product({ id: `many-${index}`, slug: `many-${index}` }),
  );

  setPayloads({
    [FAVORITES_TOOL]: favoritesPage(products),
    [DETAILS_TOOL]: detailsPayload(),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--favorites", "--details", "--limit", String(count)]);

  assert.equal(toolCalls().filter((call) => call.name === DETAILS_TOOL).length, count);
  assert.ok(!text.includes("no card for"), text);
});

test("a card that could not be had prints that product without attributes, and names it, leaving the rest intact", async () => {
  setPayloads({
    [FAVORITES_TOOL]: favoritesPage([
      product({ id: "good-1", slug: "good-1" }),
      product({ id: "bad-1", slug: "bad-1" }),
    ]),
    [DETAILS_TOOL]: (args: Record<string, unknown>) =>
      args.slug === "bad-1" ? { isError: true, content: "gone" } : detailsPayload({ attributes: { composition: "Вода" } }),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--favorites", "--details"]);

  assert.match(text, /no card for: bad-1/);
  assert.match(text, /id: good-1[\s\S]*composition: Вода/);
  assert.match(text, /id: bad-1/);
});

test("the card command still answers a uuid, a slug and an external product id", async () => {
  setPayloads({ [DETAILS_TOOL]: detailsPayload({ id: "1edb8c52-3b12-6e62-87a9-39a07e017bad" }) });

  for (const named of ["1edb8c52-3b12-6e62-87a9-39a07e017bad", "krevetka-korolivska-syra-defrostovana-40-60-864122", "864122"]) {
    clearToolCalls();
    await run(["products", "card", named]);

    assert.deepEqual(asked(DETAILS_TOOL, "slug"), [named]);
  }
});

test("the card prints the external product id the slug names, unconditionally", async () => {
  setPayloads({ [DETAILS_TOOL]: detailsPayload({ slug: "krevetka-korolivska-864122" }) });

  const text = await run(["products", "card", "864122"]);

  assert.match(text, /externalId: 864122/);
});
