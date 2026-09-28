import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  fixture,
  clearToolCalls,
  fails,
  output,
  run,
  setPayloads,
  startDaemon,
  stopDaemon,
  toolCalls,
  type Responder,
} from "./harness.ts";

const COMPANY = "1ec88c5d-a050-669c-8467-570a157f3e31";
const BRANCH = "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468";

const RESTRICTIONS_TOOL = "silpo_get_my_food_restrictions";
const DETAILS_TOOL = "silpo_get_product_details";
const BATCH_TOOL = "silpo_find_products_batch";
const SIMILAR_TOOL = "silpo_get_similar_products";
const ADD_TOOL = "silpo_add_or_update_cart_products";
const CART_TOOL = "silpo_get_shopping_cart_by_id";
const ONLINE_ORDERS_TOOL = "silpo_get_my_online_orders";
const OFFLINE_ORDERS_TOOL = "silpo_get_my_offline_orders";
const FAVORITES_TOOL = "silpo_get_my_favorites";

const MILK = "1f18a0dd-a1ff-6b16-936b-993049b0fabd";
const MILK_NAME = "Молоко Яготинське пастеризоване 2,5% 950г";
const MILK_TERM = "молоко яготинське пастеризоване";
const GRANOLA = "1ed075df-6db4-6e90-bfca-dd63763181f0";
const ALTERNATIVE = "3f18a0dd-a1ff-6b16-936b-993049b0fabd";
const PICKED_UNAVAILABLE = "7f18a0dd-a1ff-6b16-936b-993049b0fabd";
const PICKED_ALTERNATIVE = "8f18a0dd-a1ff-6b16-936b-993049b0fabd";
const EGGS_A = "9f18a0dd-a1ff-6b16-936b-993049b0fa11";
const EGGS_B = "9f18a0dd-a1ff-6b16-936b-993049b0fa22";

const HELD_CART_SNAPSHOT =
  "delivery: SelfPickup\n" +
  "slot: 2026-08-17 09:00 - 2026-08-17 09:30\n" +
  "address: Київ, просп. Володимира Івасюка, 46\n" +
  "total: 0\n" +
  "subTotal: 0\n" +
  "shipments\n" +
  `  companyId: ${COMPANY}\n` +
  `  branchId: ${BRANCH}\n`;

before(startDaemon);
after(stopDaemon);

const RESTRICTIONS_NONE = { success: true, summary: "", restrictions: [] };
const EMPTY_BATCH = { success: true, summary: "", queries: [], meta: { totalQueries: 0, totalProducts: 0 } };
const EMPTY_ONLINE_ORDERS = { success: true, summary: "", orders: [], meta: { total: 0 } };
const EMPTY_OFFLINE_ORDERS = { success: true, summary: "", orders: [], meta: { total: 0 } };
const EMPTY_FAVORITES = { success: true, summary: "", products: [], meta: { total: 0 } };

function details(
  id: string,
  name: string,
  price: number,
  displayRatio: string,
  available = true,
  stock = 10,
): Record<string, unknown> {
  return {
    success: true,
    product: {
      id,
      name,
      slug: "x",
      price,
      oldPrice: null,
      stock,
      available,
      weighted: false,
      step: 1,
      ratio: null,
      displayRatio,
      url: "https://silpo.ua/x",
      images: [],
      attributes: null,
      companyId: COMPANY,
      branchId: BRANCH,
    },
  };
}

const MILK_DETAILS = details(MILK, MILK_NAME, 32.5, "950г");

function catalogProduct(
  id: string,
  name: string,
  price: number,
  displayRatio: string,
  stock = 10,
): Record<string, unknown> {
  return {
    id,
    name,
    slug: `${id}-slug`,
    price,
    oldPrice: null,
    stock,
    available: true,
    image: null,
    weighted: false,
    step: 1,
    displayRatio,
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
  };
}

function similarPayload(products: readonly Record<string, unknown>[]): Record<string, unknown> {
  return {
    success: true,
    summary: "",
    products,
    meta: { totalQueries: 1, totalProducts: products.length },
  };
}

function overStock(productId: string, stock: number): Record<string, unknown> {
  const payload = fixture("cart.details") as {
    cart: { calculation: { validations: unknown[] } };
  };

  return {
    ...payload,
    cart: {
      ...payload.cart,
      calculation: {
        ...payload.cart.calculation,
        validations: [
          ...payload.cart.calculation.validations,
          {
            level: "error",
            type: "product",
            message: "product.offer.stock.max",
            context: { productId, markdownGroup: "default", stock },
          },
        ],
      },
    },
  };
}

function cartLineFrom(product: Record<string, unknown>, quantity: number, stock?: number): Record<string, unknown> {
  const price = product.price as number;

  return {
    productId: product.id,
    companyId: COMPANY,
    branchId: BRANCH,
    slug: product.slug,
    name: product.name,
    image: null,
    ratio: product.displayRatio,
    quantity,
    price,
    oldPrice: null,
    subTotal: price * quantity,
    subDiscount: 0,
    total: price * quantity,
    stock: stock ?? product.stock,
    weighted: product.weighted,
    addToBasketStep: product.step,
    comment: null,
  };
}

function cartWithLines(
  lines: readonly Record<string, unknown>[],
  validations: readonly Record<string, unknown>[] = [],
): Record<string, unknown> {
  return {
    cart: {
      id: "cart-1",
      deliveryType: "SelfPickup",
      timeslot: { start: "2026-08-17T06:00:00+00:00", end: "2026-08-17T06:30:00+00:00" },
      address: { addressType: "self-pickup", city: "Київ", street: "x" },
      shipments: [{ id: "s1", companyId: COMPANY, branchId: BRANCH, products: lines }],
      promoCode: null,
      calculation: {
        total: 0,
        totalAfterDiscounts: 0,
        certificatesTotal: 0,
        subTotal: 0,
        subDiscount: 0,
        productsTotal: 0,
        delivery: { total: 0, totalWeight: 0, deliveryExpressByPromise: null },
        promoCode: null,
        payment: { availableTypes: [] },
        validations,
      },
    },
    loyalty: null,
  };
}

function stockMaxValidation(productId: string, stock: number): Record<string, unknown> {
  return {
    level: "error",
    type: "product",
    message: "product.offer.stock.max",
    context: { productId, markdownGroup: "default", stock },
  };
}

function sequencedCart(...payloads: readonly Record<string, unknown>[]): Responder {
  let index = 0;

  return () => payloads[Math.min(index++, payloads.length - 1)]!;
}

function everyProbeReturns(products: readonly Record<string, unknown>[]): Responder {
  return (args) => {
    const probes = args.products as string[];

    return {
      success: true,
      summary: "",
      queries: probes.map((query) => ({ query, totalFound: products.length, products })),
      meta: { totalQueries: probes.length, totalProducts: products.length },
    };
  };
}

function writesTo(tool: string): unknown[] {
  return toolCalls().filter((call) => call.name === tool);
}

function onlineOrderFor(productId: string): Record<string, unknown> {
  return {
    success: true,
    summary: "",
    orders: [
      {
        orderId: "o-1",
        number: null,
        status: "done",
        createdAt: "2026-08-01T00:00:00+00:00",
        amount: 0,
        discount: 0,
        delivery: null,
        address: null,
        products: [
          {
            id: productId,
            name: "",
            price: 0,
            quantity: 1,
            subtotal: 0,
            removed: false,
            image: null,
            companyId: COMPANY,
            branchId: BRANCH,
          },
        ],
      },
    ],
    meta: { total: 1 },
  };
}

test("the fill is reachable only under the cart, not at the top level", async () => {
  const message = await fails(["fill", MILK_TERM]);

  assert.match(message, /unknown command 'fill'/);
});

test("a confident match writes the cart, naming no identifier", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г")]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: MILK, quantity: 1 }] },
    [DETAILS_TOOL]: MILK_DETAILS,
  });
  clearToolCalls();

  const text = await run(["cart", "fill", MILK_TERM]);

  assert.equal(text, `1 settled\n\n${MILK_TERM} → ${MILK_NAME} 950г — 32.5 ₴\n\n${HELD_CART_SNAPSHOT}`);
  assert.deepEqual(writesTo(ADD_TOOL), [
    {
      name: ADD_TOOL,
      arguments: { products: [{ productId: MILK, companyId: COMPANY, branchId: BRANCH, quantity: 1 }] },
    },
  ]);
});

test("an item the cart already holds is a no-op, and the price comes from the cart line", async () => {
  const already = {
    cart: {
      id: "cart-1",
      deliveryType: "SelfPickup",
      timeslot: { start: "2026-08-17T06:00:00+00:00", end: "2026-08-17T06:30:00+00:00" },
      address: { addressType: "self-pickup", city: "Київ", street: "x" },
      shipments: [
        {
          id: "s1",
          companyId: COMPANY,
          branchId: BRANCH,
          products: [
            {
              productId: MILK,
              companyId: COMPANY,
              branchId: BRANCH,
              slug: "x",
              name: MILK_NAME,
              image: null,
              ratio: "950г",
              quantity: 1,
              price: 32.5,
              oldPrice: null,
              subTotal: 32.5,
              subDiscount: 0,
              total: 32.5,
              stock: 10,
              weighted: false,
              addToBasketStep: 1,
              comment: null,
            },
          ],
        },
      ],
      promoCode: null,
      calculation: {
        total: 32.5,
        totalAfterDiscounts: 32.5,
        certificatesTotal: 0,
        subTotal: 32.5,
        subDiscount: 0,
        productsTotal: 32.5,
        delivery: { total: 0, totalWeight: 0, deliveryExpressByPromise: null },
        promoCode: null,
        payment: { availableTypes: [] },
        validations: [],
      },
    },
    loyalty: null,
  };

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г")]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [CART_TOOL]: already,
  });
  clearToolCalls();

  const text = await run(["cart", "fill", MILK_TERM]);

  assert.equal(
    text,
    `1 settled\n\n${MILK_TERM} → ${MILK_NAME} 950г — 32.5 ₴\n\n` +
      "delivery: SelfPickup\n" +
      "slot: 2026-08-17 09:00 - 2026-08-17 09:30\n" +
      "address: Київ, x\n" +
      "total: 32.5\n" +
      "subTotal: 32.5\n" +
      "shipments\n" +
      `  companyId: ${COMPANY}\n` +
      `  branchId: ${BRANCH}\n` +
      "  products\n" +
      `    id: ${MILK}\n` +
      "    slug: x\n" +
      "    quantity: 1\n" +
      "    total: 32.5\n" +
      "    stock: 10\n" +
      `    ${MILK_NAME} 950г — 32.5 ₴\n`,
  );
  assert.deepEqual(writesTo(ADD_TOOL), [], "an already-written item accumulated a second write");
});

test("--dry-run resolves without writing to the cart", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г")]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [DETAILS_TOOL]: MILK_DETAILS,
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--dry-run", MILK_TERM]);

  assert.equal(text, `1 settled\n\n${MILK_TERM} → ${MILK_NAME} 950г — 32.5 ₴\n\n${HELD_CART_SNAPSHOT}`);
  assert.deepEqual(writesTo(ADD_TOOL), []);
});

test("--ask-all puts every resolvable item to the caller instead of deciding", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г")]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [DETAILS_TOOL]: MILK_DETAILS,
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--ask-all", MILK_TERM]);

  assert.equal(
    text,
    `0 settled\n\nask ${MILK_TERM}\n  ${MILK}: ${MILK_NAME} 950г — 32.5 ₴\n\n${HELD_CART_SNAPSHOT}`,
  );
  assert.deepEqual(writesTo(ADD_TOOL), []);
});

test("a resolved product touching a stored restriction still writes, flagged warn", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: { success: true, summary: "", restrictions: [{ slug: "vegan", name: "Веган" }] },
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г")]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: MILK, quantity: 1 }] },
    [DETAILS_TOOL]: MILK_DETAILS,
  });
  clearToolCalls();

  const text = await run(["cart", "fill", MILK_TERM]);

  assert.equal(
    text,
    `1 settled\n\n${MILK_TERM} → ${MILK_NAME} 950г — 32.5 ₴\n\nwarn ${MILK_TERM}: Веган\n\n${HELD_CART_SNAPSHOT}`,
  );
  assert.equal(writesTo(ADD_TOOL).length, 1, "a restriction dropped the candidate from the cart write");
});

test("a term matching nothing anywhere misses, and nothing is written", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: EMPTY_BATCH,
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "захалявний ніж"]);

  assert.equal(text, `0 settled\n\nmiss захалявний ніж\n\n${HELD_CART_SNAPSHOT}`);
  assert.deepEqual(writesTo(ADD_TOOL), []);
});

test("a lone candidate that does not cover every word of the term asks, and fetches no alternatives", async () => {
  const term = "йогурт грецький натуральний";

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct("yohurt-id", "Йогурт полуничний 140г", 40, "140г")]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [DETAILS_TOOL]: details("yohurt-id", "Йогурт полуничний 140г", 40, "140г"),
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--dry-run", term]);

  assert.equal(
    text,
    `0 settled\n\nask ${term}\n  yohurt-id: Йогурт полуничний 140г 140г — 40 ₴\n\n${HELD_CART_SNAPSHOT}`,
  );
  assert.equal(
    writesTo(SIMILAR_TOOL).length,
    0,
    "an already-ambiguous term fetched alternatives it had no business fetching",
  );
});

test("--pick answers an ask, carrying the whole list plus the pick", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [DETAILS_TOOL]: details(GRANOLA, "Гранола вівсяна", 45, "300г"),
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: GRANOLA, quantity: 1 }] },
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--pick", `гранола=${GRANOLA}`, "гранола"]);

  assert.equal(text, `1 settled\n\nгранола → Гранола вівсяна 300г — 45 ₴\n\n${HELD_CART_SNAPSHOT}`);
  assert.deepEqual(writesTo(ADD_TOOL), [
    {
      name: ADD_TOOL,
      arguments: { products: [{ productId: GRANOLA, companyId: COMPANY, branchId: BRANCH, quantity: 1 }] },
    },
  ]);
});

test("--pick with no <term>=<id> shape fails before any call", async () => {
  assert.match(await fails(["cart", "fill", "--pick", "молоко", "молоко"]), /expected <term>=<id>/);
});

test("a --pick resolving to an unavailable product becomes a question offering its alternatives, and writes nothing", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [DETAILS_TOOL]: [
      details(PICKED_UNAVAILABLE, "Гранола шоколадна", 50, "300г", false, 0),
      details(PICKED_ALTERNATIVE, "Гранола горіхова", 48, "300г"),
    ],
    [SIMILAR_TOOL]: similarPayload([catalogProduct(PICKED_ALTERNATIVE, "Гранола горіхова", 48, "300г")]),
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--pick", `гранола=${PICKED_UNAVAILABLE}`, "гранола"]);

  assert.equal(writesTo(ADD_TOOL).length, 0, "an unavailable pick was written before the caller chose an alternative");
  assert.ok(text.includes(`unavailable ${PICKED_UNAVAILABLE}`), text);
  assert.ok(text.includes(PICKED_ALTERNATIVE), text);
});

test("a quantity over stock is reduced, and the reduction is carried into the outcome unchanged", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г", 10)]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: MILK, quantity: 3 }] },
    [CART_TOOL]: [overStock(MILK, 2), fixture("cart.details")],
    [DETAILS_TOOL]: MILK_DETAILS,
  });
  clearToolCalls();

  const text = await run(["cart", "fill", `${MILK_TERM} 3`]);

  assert.equal(
    text,
    `1 settled\n\n${MILK_TERM} → ${MILK_NAME} 950г — 32.5 ₴ ×3\n\nreduced: ${MILK} from 3 to 2\n\n` +
      "validations\n" +
      "  info order: order.payment_types.disabled\n" +
      "    reason: not_available_for_total\n" +
      "    paymentTypes: BNPL\n" +
      "    total: 438.15\n" +
      "    minTotal: 1000\n" +
      "\n" +
      "delivery: SelfPickup\n" +
      "slot: 2026-08-21 09:00 - 2026-08-21 09:30\n" +
      "address: Київ, просп. Володимира Івасюка, 46\n" +
      "total: 438.15\n" +
      "subTotal: 780.65\n" +
      "discount: 342.5\n" +
      "weight: 1.85\n" +
      "bonus: 107.56 of 107.56\n" +
      "checkout: https://silpo.ua/checkout-new\n" +
      "checkoutMobile: https://link.silpo.ua/1hbXLDBPFJ8iiZTg7\n" +
      "shipments\n" +
      `  companyId: ${COMPANY}\n` +
      `  branchId: ${BRANCH}\n` +
      "  products\n" +
      "    id: 1ed07609-566a-6c24-829d-dd63763181f9\n" +
      "    slug: kuriache-file-461800\n" +
      "    quantity: 1кг\n" +
      "    total: 184\n" +
      "    discount: 45\n" +
      "    stock: 184кг\n" +
      "    step: 0.5кг\n" +
      "    comment: без кістки, будь ласка\n" +
      "    Куряче філе — 184 ₴/кг was 229\n" +
      "\n" +
      "    id: 1edb8c52-3b12-6e62-87a9-39a07e017bad\n" +
      "    slug: krevetka-korolivska-syra-defrostovana-40-60-864122\n" +
      "    quantity: 0.85кг\n" +
      "    total: 254.15\n" +
      "    discount: 297.5\n" +
      "    stock: 45.9кг\n" +
      "    step: 0.85кг\n" +
      "    Креветка королівська сира дефростована 40/60 — 299 ₴/кг was 649\n",
  );
  assert.deepEqual(
    writesTo(ADD_TOOL).map((call) => (call as { arguments: unknown }).arguments),
    [
      { products: [{ productId: MILK, companyId: COMPANY, branchId: BRANCH, quantity: 3 }] },
      { products: [{ productId: MILK, companyId: COMPANY, branchId: BRANCH, quantity: 2 }] },
    ],
  );
});

test("a line the branch has none of becomes a question offering its alternatives, discovered only by the write, and writes nothing", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г", 10)]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: MILK, quantity: 1 }] },
    [CART_TOOL]: overStock(MILK, 0),
    [DETAILS_TOOL]: [MILK_DETAILS, details(ALTERNATIVE, "Молоко альтернативне", 30, "1л")],
    [SIMILAR_TOOL]: similarPayload([catalogProduct(ALTERNATIVE, "Молоко альтернативне", 30, "1л")]),
  });
  clearToolCalls();

  const { text, code } = await output(["cart", "fill", MILK_TERM]);

  assert.ok(!text.includes("unfillable"), text);
  assert.ok(text.includes(`unavailable ${MILK}`), text);
  assert.ok(text.includes(ALTERNATIVE), text);
  assert.equal(writesTo(ADD_TOOL).length, 1, "the write that revealed the shortage did not happen");
  assert.equal(code, 0);
});

test("a branch holding fewer than the item asked for asks, naming the product, the stock and the ask", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г", 1)]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [SIMILAR_TOOL]: similarPayload([catalogProduct(ALTERNATIVE, "Молоко альтернативне", 30, "1л")]),
    [DETAILS_TOOL]: details(ALTERNATIVE, "Молоко альтернативне", 30, "1л"),
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--dry-run", `${MILK_TERM} 3`]);

  assert.ok(text.includes(`holds 1 of 3 ${MILK}`), text);
  assert.ok(text.includes(ALTERNATIVE), text);
  assert.deepEqual(writesTo(ADD_TOOL), []);
});

test("--accept-stock takes what the branch holds, naming no identifier of its own", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г", 1)]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [SIMILAR_TOOL]: similarPayload([catalogProduct(ALTERNATIVE, "Молоко альтернативне", 30, "1л")]),
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: MILK, quantity: 1 }] },
    [DETAILS_TOOL]: MILK_DETAILS,
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--accept-stock", MILK_TERM, `${MILK_TERM} 3`]);

  assert.equal(text, `1 settled\n\n${MILK_TERM} → ${MILK_NAME} 950г — 32.5 ₴\n\n${HELD_CART_SNAPSHOT}`);
  assert.deepEqual(writesTo(ADD_TOOL), [
    {
      name: ADD_TOOL,
      arguments: { products: [{ productId: MILK, companyId: COMPANY, branchId: BRANCH, quantity: 1 }] },
    },
  ]);
});

test("a --pick answer over a shortfall is not lost to --accept-stock for the same term", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [DETAILS_TOOL]: details(MILK, MILK_NAME, 32.5, "950г", true, 1),
    [SIMILAR_TOOL]: similarPayload([catalogProduct(ALTERNATIVE, "Молоко альтернативне", 30, "1л")]),
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: MILK, quantity: 1 }] },
  });
  clearToolCalls();

  const text = await run([
    "cart",
    "fill",
    "--pick",
    `${MILK_TERM}=${MILK}`,
    "--accept-stock",
    MILK_TERM,
    `${MILK_TERM} 3`,
  ]);

  assert.equal(text, `1 settled\n\n${MILK_TERM} → ${MILK_NAME} 950г — 32.5 ₴\n\n${HELD_CART_SNAPSHOT}`);
  assert.deepEqual(writesTo(ADD_TOOL), [
    {
      name: ADD_TOOL,
      arguments: { products: [{ productId: MILK, companyId: COMPANY, branchId: BRANCH, quantity: 1 }] },
    },
  ]);
  assert.equal(
    writesTo(BATCH_TOOL).length,
    0,
    "a term answered by a pick went through a live search instead of the picked product",
  );
});

test("--fill-with-alternatives takes what the branch holds and makes up the rest from the ranked alternatives", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г", 1)]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [SIMILAR_TOOL]: similarPayload([catalogProduct(ALTERNATIVE, "Молоко альтернативне", 30, "1л")]),
    [ADD_TOOL]: {
      success: true,
      summary: "Updated 2 product(s)",
      products: [
        { productId: MILK, quantity: 1 },
        { productId: ALTERNATIVE, quantity: 2 },
      ],
    },
    [DETAILS_TOOL]: [MILK_DETAILS, details(ALTERNATIVE, "Молоко альтернативне", 30, "1л")],
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--fill-with-alternatives", MILK_TERM, `${MILK_TERM} 3`]);

  assert.ok(text.includes(`${MILK_NAME} 950г — 32.5 ₴`), text);
  assert.ok(text.includes("Молоко альтернативне 1л — 30 ₴"), text);
  assert.deepEqual(
    writesTo(ADD_TOOL).map((call) => (call as { arguments: { products: { productId: string; quantity: number }[] } }).arguments.products),
    [
      [
        { productId: MILK, companyId: COMPANY, branchId: BRANCH, quantity: 1 },
        { productId: ALTERNATIVE, companyId: COMPANY, branchId: BRANCH, quantity: 2 },
      ],
    ],
  );
});

test("--fill-with-alternatives prints a short row where no alternative shares the product's own unit", async () => {
  const carrot = "1f18a0dd-a1ff-6b16-936b-993049b0fabf";
  const weighed = {
    ...catalogProduct(carrot, "Морква мита", 30.99, "1кг"),
    weighted: true,
    step: 0.2,
    stock: 0.2,
  };
  const milkAlternative = catalogProduct(ALTERNATIVE, "Молоко альтернативне", 30, "1л");

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([weighed]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [SIMILAR_TOOL]: similarPayload([milkAlternative]),
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carrot, quantity: 0.2 }] },
    [DETAILS_TOOL]: { success: true, summary: "", product: weighed },
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--fill-with-alternatives", "морква", "морква 3"]);

  assert.ok(text.includes("1 settled"), text);
  assert.ok(text.includes("морква → Морква мита — 30.99 ₴/кг ×0.2кг"), text);
  assert.ok(text.includes(`short морква: holds 0.2кг of 0.6кг ${carrot} Морква мита`), text);
  assert.deepEqual(
    writesTo(ADD_TOOL).map((call) => (call as { arguments: { products: { productId: string }[] } }).arguments.products.map((p) => p.productId)),
    [[carrot]],
  );
});

test("a short row names what the step lets through, and says so where that differs from raw stock", async () => {
  const carrot = "1f18a0dd-a1ff-6b16-936b-993049b0fabf";
  const weighed = {
    ...catalogProduct(carrot, "Морква мита", 30.99, "1кг"),
    weighted: true,
    step: 0.2,
    stock: 0.25,
  };
  const milkAlternative = catalogProduct(ALTERNATIVE, "Молоко альтернативне", 30, "1л");

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([weighed]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [SIMILAR_TOOL]: similarPayload([milkAlternative]),
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carrot, quantity: 0.2 }] },
    [DETAILS_TOOL]: { success: true, summary: "", product: weighed },
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--fill-with-alternatives", "морква", "морква 3"]);

  assert.ok(text.includes("морква → Морква мита — 30.99 ₴/кг ×0.2кг"), text);
  assert.ok(
    text.includes(
      `short морква: holds 0.2кг (0.25кг on the shelf, step 0.2кг) of 0.6кг ${carrot} Морква мита`,
    ),
    text,
  );
  assert.deepEqual(
    writesTo(ADD_TOOL).map((call) => (call as { arguments: { products: { productId: string; quantity: number }[] } }).arguments.products.map((p) => p.quantity)),
    [[0.2]],
  );
});

test("only the write that actually failed is named unavailable, and the write that succeeded stays settled", async () => {
  const SECOND_ALTERNATIVE = "4f18a0dd-a1ff-6b16-936b-993049b0fabd";

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г", 1)]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [SIMILAR_TOOL]: [
      similarPayload([catalogProduct(ALTERNATIVE, "Молоко альтернативне", 30, "1л")]),
      similarPayload([catalogProduct(SECOND_ALTERNATIVE, "Молоко запасне", 28, "1л")]),
    ],
    [ADD_TOOL]: {
      success: true,
      summary: "Updated 2 product(s)",
      products: [
        { productId: MILK, quantity: 1 },
        { productId: ALTERNATIVE, quantity: 2 },
      ],
    },
    [CART_TOOL]: overStock(ALTERNATIVE, 0),
    [DETAILS_TOOL]: [
      details(ALTERNATIVE, "Молоко альтернативне", 30, "1л"),
      details(SECOND_ALTERNATIVE, "Молоко запасне", 28, "1л"),
      MILK_DETAILS,
    ],
  });
  clearToolCalls();

  const { text, code } = await output([
    "cart",
    "fill",
    "--fill-with-alternatives",
    MILK_TERM,
    `${MILK_TERM} 3`,
  ]);

  assert.ok(text.includes("1 settled"), text);
  assert.ok(text.includes(`${MILK_NAME} 950г — 32.5 ₴`), text);
  assert.ok(text.includes(`unavailable ${ALTERNATIVE}`), text);
  assert.ok(!text.includes(`unavailable ${MILK}`), text);
  assert.ok(text.includes(SECOND_ALTERNATIVE), text);
  assert.deepEqual(
    writesTo(ADD_TOOL).map((call) =>
      (call as { arguments: { products: { productId: string }[] } }).arguments.products.map(
        (product) => product.productId,
      ),
    ),
    [[MILK, ALTERNATIVE]],
  );
  assert.equal(code, 0);
});

test("the fill orders ask candidates by coordination, then by position, where neither covers the term in full", async () => {
  const term = "апельсини соковиті";
  const strong = catalogProduct("orange-a", "Апельсини стиглі", 40, "1кг");
  const weak = catalogProduct("orange-b", "Хліб чорний", 25, "700г");

  const batch: Responder = (args) => {
    const probes = args.products as string[];

    return {
      success: true,
      summary: "",
      queries: probes.map((query) => {
        if (query === term || query === "апельсини") return { query, totalFound: 1, products: [strong] };
        if (query === "соковиті") return { query, totalFound: 1, products: [weak] };

        return { query, totalFound: 0, products: [] };
      }),
      meta: { totalQueries: probes.length, totalProducts: 2 },
    };
  };

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: batch,
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [DETAILS_TOOL]: [details("orange-a", "Апельсини стиглі", 40, "1кг"), details("orange-b", "Хліб чорний", 25, "700г")],
  });
  clearToolCalls();

  const fillText = await run(["cart", "fill", "--dry-run", term]);
  const [askBlock] = fillText.split("\ndelivery: ");
  const fillOrder = askBlock
    .split("\n")
    .filter((line) => line.startsWith("  "))
    .map((line) => line.trim().split(":")[0]);

  assert.deepEqual(fillOrder, ["orange-a", "orange-b"]);
});

test("a tied term is settled by what the caller has bought, not by the catalogue's own order", async () => {
  const term = "яйця курячі домашні";
  const a = catalogProduct(EGGS_A, "Яйця курячі домашні Квочка десяток", 55, "1шт");
  const b = catalogProduct(EGGS_B, "Яйця курячі домашні Господарочка десяток", 52, "1шт");

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([a, b]),
    [ONLINE_ORDERS_TOOL]: onlineOrderFor(EGGS_B),
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: EGGS_B, quantity: 1 }] },
    [DETAILS_TOOL]: details(EGGS_B, "Яйця курячі домашні Господарочка десяток", 52, "1шт"),
  });
  clearToolCalls();

  const fillText = await run(["cart", "fill", term]);

  assert.ok(fillText.includes("Господарочка"), fillText);
  assert.deepEqual(
    writesTo(ADD_TOOL).map(
      (call) => (call as { arguments: { products: { productId: string }[] } }).arguments.products[0]!.productId,
    ),
    [EGGS_B],
  );
});

test("--ask-all offers the candidates the term settled among, not only the one it settled on", async () => {
  const second = "1f18a0dd-a1ff-6b16-936b-993049b0fabe";
  const secondName = "Молоко Яготинське пастеризоване 3,2% 900г";

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([
      catalogProduct(MILK, MILK_NAME, 32.5, "950г"),
      catalogProduct(second, secondName, 35.5, "900г"),
    ]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [DETAILS_TOOL]: MILK_DETAILS,
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "--ask-all", MILK_TERM]);

  assert.ok(text.startsWith("0 settled"), text);
  assert.ok(text.includes(MILK), text);
  assert.ok(text.includes(second), text);
  assert.deepEqual(writesTo(ADD_TOOL), []);
});

test("a weight the step does not divide is raised to the step, and the raising is stated on the settled line", async () => {
  const carrot = "1f18a0dd-a1ff-6b16-936b-993049b0fac0";
  const weighed = {
    ...catalogProduct(carrot, "Морква мита", 30.99, "1кг"),
    weighted: true,
    step: 0.2,
    stock: 45.8,
  };

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([weighed]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carrot, quantity: 0.6 }] },
    [DETAILS_TOOL]: { success: true, summary: "", product: weighed },
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "морква 0.5 кг"]);

  assert.ok(text.includes("морква → Морква мита — 30.99 ₴/кг ×0.6кг (raised to the step)"), text);
  assert.deepEqual(writesTo(ADD_TOOL), [
    {
      name: ADD_TOOL,
      arguments: { products: [{ productId: carrot, companyId: COMPANY, branchId: BRANCH, quantity: 0.6 }] },
    },
  ]);
});

test("a weight the step already divides is written unchanged, and nothing is stated", async () => {
  const carrot = "1f18a0dd-a1ff-6b16-936b-993049b0fac1";
  const weighed = {
    ...catalogProduct(carrot, "Морква мита", 30.99, "1кг"),
    weighted: true,
    step: 0.2,
    stock: 45.8,
  };

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([weighed]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carrot, quantity: 0.6 }] },
    [DETAILS_TOOL]: { success: true, summary: "", product: weighed },
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "морква 0.6 кг"]);

  assert.ok(text.includes("морква → Морква мита — 30.99 ₴/кг ×0.6кг"), text);
  assert.ok(!text.includes("raised to the step"), text);
});

test("a count against a weighted term counts steps, and the reading is stated on the settled line", async () => {
  const carrot = "1f18a0dd-a1ff-6b16-936b-993049b0fac2";
  const weighed = {
    ...catalogProduct(carrot, "Морква мита", 30.99, "1кг"),
    weighted: true,
    step: 0.2,
    stock: 45.8,
  };

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([weighed]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carrot, quantity: 0.4 }] },
    [DETAILS_TOOL]: { success: true, summary: "", product: weighed },
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "морква 2 шт"]);

  assert.ok(text.includes("морква → Морква мита — 30.99 ₴/кг ×0.4кг (count named steps)"), text);
  assert.deepEqual(writesTo(ADD_TOOL), [
    {
      name: ADD_TOOL,
      arguments: { products: [{ productId: carrot, companyId: COMPANY, branchId: BRANCH, quantity: 0.4 }] },
    },
  ]);
});

test("a count covered by whole packs states so, even where the quantity is one and the line would otherwise print no amount at all: яйця курячі 10 шт", async () => {
  const carton = "1f18a0dd-a1ff-6b16-936b-993049b0fad0";
  const cartonName = "Яйця курячі С1 15шт/уп";
  const cartonProduct = catalogProduct(carton, cartonName, 90, "15шт/уп");

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([cartonProduct]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carton, quantity: 1 }] },
    [DETAILS_TOOL]: { success: true, summary: "", product: cartonProduct },
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "яйця курячі 10 шт"]);

  assert.ok(
    text.includes(`яйця курячі → ${cartonName} 15шт/уп — 90 ₴ (count covered by packs)`),
    text,
  );
});

test("a fractional amount raised to a whole one states so on the settled line: молоко 1.5 шт", async () => {
  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([catalogProduct(MILK, MILK_NAME, 32.5, "950г")]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: MILK, quantity: 2 }] },
    [DETAILS_TOOL]: MILK_DETAILS,
  });
  clearToolCalls();

  const text = await run(["cart", "fill", `${MILK_TERM} 1.5 шт`]);

  assert.ok(text.includes(`${MILK_TERM} → ${MILK_NAME} 950г — 32.5 ₴ ×2 (raised to the step)`), text);
});

test("a mass against a weighted product whose payload states no usable step says the amount was chosen: куряче філе 300 г", async () => {
  const fillet = "1f18a0dd-a1ff-6b16-936b-993049b0fad1";
  const filletName = "Куряче філе охолоджене";
  const noStepProduct = { ...catalogProduct(fillet, filletName, 199, "1кг"), weighted: true, step: 0 };

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([noStepProduct]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: fillet, quantity: 1 }] },
    [DETAILS_TOOL]: { success: true, summary: "", product: noStepProduct },
  });
  clearToolCalls();

  const text = await run(["cart", "fill", "куряче філе 300 г"]);

  assert.ok(
    text.includes(`куряче філе → ${filletName} — 199 ₴/кг ×1кг (chosen for want of a step)`),
    text,
  );
});

test("a round trip: the quantity cart fill writes for a weighted product is one cart set accepts for the same line", async () => {
  const carrot = { ...catalogProduct("1f18a0dd-a1ff-6b16-936b-993049b0fac3", "Морква мита", 30.99, "1кг"), weighted: true, step: 0.2 };

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([carrot]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carrot.id, quantity: 0.6 }] },
    [CART_TOOL]: sequencedCart(cartWithLines([]), cartWithLines([]), cartWithLines([cartLineFrom(carrot, 0.6)])),
  });
  clearToolCalls();

  const fillText = await run(["cart", "fill", "морква 3"]);

  assert.ok(fillText.includes("×0.6кг"), fillText);
  assert.deepEqual(
    writesTo(ADD_TOOL).map((call) => (call as { arguments: { products: { quantity: number }[] } }).arguments.products[0]!.quantity),
    [0.6],
    "cart fill's own write is what the round trip has to hand to cart set",
  );

  setPayloads({
    [CART_TOOL]: cartWithLines([cartLineFrom(carrot, 0.6)]),
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carrot.id, quantity: 0.6 }] },
  });
  clearToolCalls();

  await run(["cart", "set", carrot.id, "0.6"]);

  assert.deepEqual(
    writesTo(ADD_TOOL).map((call) => (call as { arguments: { products: { quantity: number }[] } }).arguments.products[0]!.quantity),
    [0.6],
    "cart set refused the exact number cart fill had just written",
  );
});

test("a round trip: a weighted line reduced against stock the step does not divide still settles at a quantity cart set accepts", async () => {
  const carrot = { ...catalogProduct("1f18a0dd-a1ff-6b16-936b-993049b0fac4", "Морква мита", 30.99, "1кг"), weighted: true, step: 0.2 };

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([carrot]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carrot.id, quantity: 0.6 }] },
    [CART_TOOL]: sequencedCart(
      cartWithLines([]),
      cartWithLines([]),
      cartWithLines([cartLineFrom(carrot, 0.6, 0.25)], [stockMaxValidation(carrot.id, 0.25)]),
      cartWithLines([cartLineFrom(carrot, 0.2, 0.25)]),
    ),
  });
  clearToolCalls();

  const fillText = await run(["cart", "fill", "морква 3"]);

  assert.deepEqual(
    writesTo(ADD_TOOL).map((call) => (call as { arguments: { products: { quantity: number }[] } }).arguments.products[0]!.quantity),
    [0.6, 0.2],
    "0.25 is not a multiple of 0.2, so the reduced write has to be the largest whole step within it, not the raw stock",
  );
  assert.ok(fillText.includes(`reduced: ${carrot.id} from 0.6кг to 0.2кг`), fillText);
  assert.ok(fillText.includes("×0.2кг"), fillText);

  setPayloads({
    [CART_TOOL]: cartWithLines([cartLineFrom(carrot, 0.2, 0.25)]),
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carrot.id, quantity: 0.2 }] },
  });
  clearToolCalls();

  await run(["cart", "set", carrot.id, "0.2"]);

  assert.deepEqual(
    writesTo(ADD_TOOL).map((call) => (call as { arguments: { products: { quantity: number }[] } }).arguments.products[0]!.quantity),
    [0.2],
    "cart set refused the exact number the reduce path had just settled on",
  );
});

test("a stock reduction on a weighted product is floored to its step even where the cart read back after the write carries no line for it", async () => {
  const carrot = { ...catalogProduct("1f18a0dd-a1ff-6b16-936b-993049b0fac5", "Морква мита", 30.99, "1кг"), weighted: true, step: 0.2 };

  setPayloads({
    [RESTRICTIONS_TOOL]: RESTRICTIONS_NONE,
    [BATCH_TOOL]: everyProbeReturns([carrot]),
    [ONLINE_ORDERS_TOOL]: EMPTY_ONLINE_ORDERS,
    [OFFLINE_ORDERS_TOOL]: EMPTY_OFFLINE_ORDERS,
    [FAVORITES_TOOL]: EMPTY_FAVORITES,
    [ADD_TOOL]: { success: true, summary: "Updated 1 product(s)", products: [{ productId: carrot.id, quantity: 0.6 }] },
    [CART_TOOL]: sequencedCart(
      cartWithLines([]),
      cartWithLines([]),
      cartWithLines([], [stockMaxValidation(carrot.id, 0.25)]),
      cartWithLines([cartLineFrom(carrot, 0.2, 0.25)]),
    ),
  });
  clearToolCalls();

  const fillText = await run(["cart", "fill", "морква 3"]);

  assert.deepEqual(
    writesTo(ADD_TOOL).map((call) => (call as { arguments: { products: { quantity: number }[] } }).arguments.products[0]!.quantity),
    [0.6, 0.2],
    "0.25 has to be floored to 0.2 using the resolution's own step, not sent raw for want of a line to read the step from",
  );
  assert.ok(fillText.includes(`reduced: ${carrot.id} from 0.6кг to 0.2кг`), fillText);
});
