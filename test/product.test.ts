import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  clearToolCalls,
  fails,
  fixture,
  render,
  run,
  setPayloads,
  startDaemon,
  stopDaemon,
  toolCalls,
} from "./harness.ts";

const BRANCH = "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468";
const COMPANY = "1ec88c5d-a050-669c-8467-570a157f3e31";
const OFFLINE = ["me", "orders", "--offline"];
const FAVORITES = ["products", "find", "--favorites"];
const CART_READ = { silpo_get_shopping_cart_by_id: fixture("cart.details") };

const DETAILS_TOOL = "silpo_get_product_details";
const FAVORITES_TOOL = "silpo_add_or_update_favorite_products";
const ADD_TOOL = "silpo_add_or_update_cart_products";
const REMOVE_TOOL = "silpo_remove_cart_products";

const KREVETKA = "1edb8c52-3b12-6e62-87a9-39a07e017bad";
const KREVETKA_SLUG = "krevetka-korolivska-syra-defrostovana-40-60-864122";
const YAITSIA = "1ed07606-0894-6584-ac01-dd63763181f9";
const YAITSIA_SLUG = "yaitsia-kuriachi-s1-kvochka-452276";
const KABACHOK = "1f18a0dd-a26f-6c5e-bad1-65ceb9462254";
const DETAILS = ["products", "card", "krevetka-varena-80-100-880804"];

function asked(tool: string, field: string): unknown[] {
  return toolCalls()
    .filter((call) => call.name === tool)
    .map((call) => call.arguments[field]);
}

function cardPayload(id: string, slug: string): Record<string, unknown> {
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

function favoriteListingPayload(id: string, slug: string, externalProductId: number | null) {
  return {
    success: true,
    summary: "Found 1 products",
    products: [
      {
        id,
        name: "Товар",
        slug,
        price: 299,
        oldPrice: null,
        stock: 5,
        available: true,
        image: null,
        weighted: false,
        step: 1,
        displayRatio: null,
        specialPrices: null,
        companyId: COMPANY,
        branchId: BRANCH,
        externalProductId,
      },
    ],
    meta: { limit: 30, offset: 0, total: 1 },
  };
}

before(startDaemon);
after(stopDaemon);

test("a product record carries every identifier its payload holds", async () => {
  const text = await render("products.favorites", FAVORITES);

  assert.match(text, new RegExp(`\\nid: ${YAITSIA}\\nslug: ${YAITSIA_SLUG}\\nexternalId: 452276\\n`));
});

test("a listing record whose product carries no external id, and the slug names none either, prints none", async () => {
  const NO_TAIL_SLUG = "krevetka-bez-nomera";

  setPayloads({
    ...CART_READ,
    silpo_get_my_favorites: favoriteListingPayload(KREVETKA, NO_TAIL_SLUG, null),
  });

  const text = await run(FAVORITES);

  assert.match(text, new RegExp(`id: ${KREVETKA}\\nslug: ${NO_TAIL_SLUG}\\nstock: `));
  assert.ok(!text.includes("externalId"), "an external product id was printed for a payload without one");
  assert.ok(!text.includes("null"), "a null leaked into the output");
});

test("a product card prints the external product id its slug names, unconditionally", async () => {
  const text = await render("products.details", ["products", "card", KREVETKA_SLUG]);

  assert.match(text, /^id: [0-9a-f-]{36}\nslug: /);
  assert.match(text, /\nexternalId: 880804\n/, "the slug determines the external product id, whatever the index holds");
});

test("a product card prints the external product id the index has already seen", async () => {
  setPayloads({
    ...CART_READ,
    silpo_get_my_favorites: favoriteListingPayload(YAITSIA, YAITSIA_SLUG, 452276),
  });
  await run(FAVORITES);

  setPayloads({ ...CART_READ, [DETAILS_TOOL]: cardPayload(YAITSIA, YAITSIA_SLUG) });

  const text = await run(["products", "card", YAITSIA_SLUG]);

  assert.match(text, /\nexternalId: 452276\n/);
});

test("sends a product card the argument it was given, whatever form it takes", async () => {
  setPayloads({ ...CART_READ, [DETAILS_TOOL]: fixture("products.details") });

  for (const named of [KREVETKA, KREVETKA_SLUG, "864122"]) {
    clearToolCalls();
    await run(["products", "card", named]);

    assert.deepEqual(asked(DETAILS_TOOL, "slug"), [named]);
  }
});

test("no product card command prints whether the call succeeded", async () => {
  assert.ok(!(await render("products.details", DETAILS)).includes("success"));
});

test("a product card drops the gallery and the page address", async () => {
  const text = await render("products.details", DETAILS);

  assert.ok(!text.includes("silpo.ua"), "a web address survived");
  assert.ok(!text.includes("url"), "the page address survived");
});

test("a product card keeps the attribute keys exactly as the server spelled them", async () => {
  const text = await render("products.details", DETAILS);

  assert.ok(text.includes("attributes\n  Склад: КРЕВЕТКА"), "the attributes are not a group");
  assert.ok(text.includes("  Енергетична цінність (кКал/кДЖ): 75/314"), "a key was rewritten");
  assert.ok(text.includes("  Жири (г): 0.3"), "a numeric attribute was dropped");
});

test("a product card prices by the unit it names, not by the flag the server sends", async () => {
  const text = await render("products.details", DETAILS);

  assert.ok(text.includes("Креветка варена 80/100 — 399 ₴/кг was 579"), "the card lost the unit");
  assert.ok(text.includes("stock: 8кг\nstep: 1кг"), "the stock and the step lost the unit");
  assert.ok(!text.includes("100г"), "the storefront's reference unit was printed");
  assert.ok(!text.includes("branch"), "the branch the caller named was printed back");
});

test("a favorites write resolves the uuid and the external id by looking the product up", async () => {
  setPayloads({
    ...CART_READ,
    [DETAILS_TOOL]: cardPayload(KREVETKA, KREVETKA_SLUG),
    [FAVORITES_TOOL]: { success: true, summary: "Favorites updated", actions: [] },
  });
  clearToolCalls();

  await run(["products", "favorite", KREVETKA_SLUG]);

  assert.deepEqual(asked(FAVORITES_TOOL, "actions"), [
    [{ productId: KREVETKA, externalProductId: 864122, toDelete: false }],
  ]);
});

test("a favorites write looks up a slug the index has never seen, and the external id comes back with it", async () => {
  const NEVER_SEEN = "syr-holovka-1234567";

  setPayloads({
    ...CART_READ,
    [DETAILS_TOOL]: cardPayload(KABACHOK, NEVER_SEEN),
    [FAVORITES_TOOL]: { success: true, summary: "Favorites updated", actions: [] },
  });
  clearToolCalls();

  await run(["products", "favorite", NEVER_SEEN]);

  assert.deepEqual(asked(FAVORITES_TOOL, "actions"), [
    [{ productId: KABACHOK, externalProductId: 1234567, toDelete: false }],
  ]);
});

test("a favorites write fails naming the product when no external id can be resolved, and nothing is sent", async () => {
  const NO_TAIL = "kabachok-svizhyi";

  setPayloads({ ...CART_READ, [DETAILS_TOOL]: cardPayload(KABACHOK, NO_TAIL) });
  clearToolCalls();

  const message = await fails(["products", "favorite", NO_TAIL]);

  assert.match(message, /resolves to no external product id/);
  assert.deepEqual(
    toolCalls().map((call) => call.name),
    [DETAILS_TOOL],
    "a favorites write went out for a product short of an external id",
  );
});

test("a cart quantity change sends the product it was given, unchanged", async () => {
  setPayloads({ ...CART_READ, [ADD_TOOL]: fixture("cart.add") });
  clearToolCalls();

  await run(["cart", "set", KREVETKA, "1.7"]);

  assert.deepEqual(asked(ADD_TOOL, "products"), [
    [{ productId: KREVETKA, companyId: COMPANY, branchId: BRANCH, quantity: 1.7 }],
  ]);
});

test("a cart removal sends the product it was given, unchanged", async () => {
  setPayloads({ ...CART_READ, [REMOVE_TOOL]: fixture("cart.remove") });
  clearToolCalls();

  await run(["cart", "remove", KABACHOK]);

  assert.deepEqual(asked(REMOVE_TOOL, "products"), [[{ productId: KABACHOK }]]);
});

test("a cart line names its product by uuid and by slug", async () => {
  const text = await render("cart.details", ["cart", "details"]);

  assert.match(text, /\n {4}id: [0-9a-f-]{36}\n {4}slug: [a-z0-9-]+\n/);
});

test("a receipt line carrying a catalogue product prints its two identifiers", async () => {
  const text = await render("orders.offline", OFFLINE);
  const TSUKINI = "1ed075df-6db4-6e90-bfca-dd63763181f9";

  assert.match(text, new RegExp(`  productId: ${TSUKINI}\\n  slug: tsukini-51601\\n`));
});

test("a receipt line with no catalogue product prints none, and the command succeeds", async () => {
  const text = await render("orders.offline", OFFLINE);
  const named = text.split("\n").filter((line) => line.includes("productId: "));

  assert.equal(named.length, 2, "a line without a catalogue product was given an identifier");
  assert.ok(!text.includes("999999"), "an article code was printed as an identifier");
});
