import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  BRANCH,
  COMPANY,
  clearToolCalls,
  fails,
  fixture,
  output,
  render,
  renderTools,
  renderToolsFailing,
  run,
  setPayload,
  setPayloads,
  startDaemon,
  stopDaemon,
  toolCalls,
} from "./harness.ts";

const CART_TOOL = "silpo_get_shopping_cart_by_id";
const ADD_TOOL = "silpo_add_or_update_cart_products";
const UPDATE_TOOL = "silpo_update_shopping_cart";
const SAVED_ADDRESSES_TOOL = "silpo_get_my_delivery_addresses";
const LIST_BRANCHES_TOOL = "silpo_list_branches";
const TIME_SLOTS_TOOL = "silpo_get_time_slots";

const STORE = "1ed43e73-051b-6842-a111-a5ad042eb496";
const STORE_COMPANY = "1ec88c5d-a050-669c-8467-570a157f3e31";

function timeSlots(...windows: readonly [string, string, boolean][]): Record<string, unknown> {
  return {
    success: true,
    summary: "",
    meta: { total: windows.length },
    slots: windows.map(([start, end, available]) => ({
      start,
      end,
      available,
      deliveryType: "SelfPickup",
      deliveryCost: null,
      deliveryCostMap: [],
      minOrderCost: 0,
      maxWeight: null,
      constraints: {
        isLimitedAlcohol: false,
        isLimitedTobacco: false,
        isLimitedCookedFood: false,
        isLimitedOwnCooking: false,
      },
      fast: null,
    })),
  };
}

const DETAILS = ["cart", "details"];
const CERTIFICATE_ADD = ["cart", "certificate", "add", "9990001234567"];
const UPDATE = ["cart", "setup", "--delivery-type", "SelfPickup"];

const CHICKEN = "1ed07609-566a-6c24-829d-dd63763181f9";
const SHRIMP = "1edb8c52-3b12-6e62-87a9-39a07e017bad";

const CART_READ = { [CART_TOOL]: "cart.details" } as const;

function setting(productId: string, quantity: number | string): string[] {
  return ["cart", "set", productId, String(quantity)];
}

type CartPayload = {
  cart: {
    shipments: { products: { productId: string; quantity: number }[] }[];
    calculation: { validations: Record<string, unknown>[] };
  };
};

function overStock(productId: string, stock: number, quantity = 1): Record<string, unknown> {
  const payload = fixture("cart.details") as unknown as CartPayload;
  const { cart } = payload;

  return {
    ...payload,
    cart: {
      ...cart,
      shipments: cart.shipments.map((shipment) => ({
        ...shipment,
        products: shipment.products.map((product) =>
          product.productId === productId ? { ...product, quantity } : product,
        ),
      })),
      calculation: {
        ...cart.calculation,
        validations: [
          ...cart.calculation.validations,
          {
            level: "error",
            type: "product",
            message: "product.offer.stock.max",
            context: { productId, markdownGroup: "default", stock },
          },
        ],
      },
    },
  } as unknown as Record<string, unknown>;
}

function missingOffer(productId: string): Record<string, unknown> {
  const over = overStock(productId, 0) as unknown as CartPayload;
  const validations = over.cart.calculation.validations.map((one) =>
    one.message === "product.offer.stock.max"
      ? { ...one, message: "product.offer.not_found" }
      : one,
  );

  return {
    ...over,
    cart: { ...over.cart, calculation: { ...over.cart.calculation, validations } },
  } as unknown as Record<string, unknown>;
}

function sentTo(tool: string, key: string): unknown[] {
  return toolCalls()
    .filter((call) => call.name === tool)
    .map((call) => call.arguments[key]);
}

before(startDaemon);
after(stopDaemon);
test("a cart nests its products under the shipment that holds them", async () => {
  const text = await render("cart.details", DETAILS);

  assert.match(text, /\nshipments\n {2}companyId: [0-9a-f-]{36}\n {2}branchId: [0-9a-f-]{36}\n/);
  assert.match(
    text,
    /\n {2}products\n {4}id: [0-9a-f-]{36}\n {4}slug: /,
    "the products are not nested in a shipment",
  );
});

test("a cart prints no shipment id, no product image and no identifier of its own", async () => {
  const text = await render("cart.details", DETAILS);

  assert.ok(!text.includes("images.silpo.ua"), "an image address survived");
  assert.ok(!text.includes("c9803b29"), "the shipment id survived");
  assert.ok(!text.includes("externalId"), "an external product id was derived for a cart line");
  assert.ok(!/^id: /m.test(text), "the cart named itself");
});

test("a cart keeps the checkout address, the only way to finish an order", async () => {
  const text = await render("cart.details", DETAILS);

  assert.ok(text.includes("checkout: https://silpo.ua/"), "the checkout address was dropped");
  assert.ok(!text.includes("checkoutMobileLink"), "the payload's field name survived");
});

test("a cart joins its address into one line", async () => {
  const text = await render("cart.details", DETAILS);

  assert.ok(
    text.includes("address: Київ, просп. Володимира Івасюка, 46\n"),
    "the address was not joined",
  );
  assert.ok(!text.includes("addressType"), "the payload's own address fields survived");
});

test("a line carries its comment, and a line without one carries nothing", async () => {
  const text = await render("cart.details", DETAILS);

  assert.ok(text.includes("    comment: без кістки, будь ласка"), "the comment was dropped");
  assert.equal(text.split("\n").filter((line) => line.includes("comment")).length, 1);
});

test("a successful cart prints every validation it carries, in both context shapes", async () => {
  const text = await render("cart.stale", DETAILS);
  const levels = text.split("\n").filter((line) => line.startsWith("  error "));

  assert.equal(levels.length, 3, "an error validation was dropped from a successful response");
  assert.ok(text.includes("  error timeslot: timeslot.not_found\n  error product:"), text);
  assert.ok(text.includes("    markdownGroup: default"), "a named context value was dropped");
});

test("a cart on a stale slot still prints its products", async () => {
  const text = await render("cart.stale", DETAILS);

  assert.ok(text.includes("    stock: 0"), "the stale cart lost its stock");
  assert.equal(text.split("\n").filter((line) => /^ {4}id: [0-9a-f-]{36}$/.test(line)).length, 2);
});

test("a total, a subTotal and a price the payload does not carry are absent, not printed as undefined", async () => {
  const payload = fixture("cart.details") as unknown as {
    cart: {
      calculation: Record<string, unknown>;
      shipments: { products: Record<string, unknown>[] }[];
    };
  };

  delete payload.cart.calculation.totalAfterDiscounts;
  delete payload.cart.calculation.subTotal;

  for (const shipment of payload.cart.shipments) {
    for (const product of shipment.products) {
      delete product.total;
      delete product.price;
    }
  }

  setPayload(payload);

  const text = await run(DETAILS);

  assert.ok(!text.includes("undefined"), text);
  assert.ok(!/^total: /m.test(text), text);
  assert.ok(!/^subTotal: /m.test(text), text);

  const kuriacheBlock = text.slice(text.indexOf("id: 1ed07609"), text.indexOf("Куряче філе"));

  assert.ok(!kuriacheBlock.includes("total:"), kuriacheBlock);
  assert.ok(text.includes("Куряче філе\n"), text);
});

test("every write closes on the cart it produced, summary first", async () => {
  const writes: [string, string, readonly string[]][] = [
    [ADD_TOOL, "cart.add", setting(CHICKEN, 1)],
    ["silpo_remove_cart_products", "cart.remove", ["cart", "remove", SHRIMP]],
    ["silpo_clear_shopping_cart", "cart.clear", ["cart", "clear"]],
    [UPDATE_TOOL, "cart.setup", UPDATE],
  ];

  for (const [tool, name, args] of writes) {
    const text = await renderTools({ [tool]: name, ...CART_READ }, args);
    const [summary, ...rest] = text.split("\n\n");

    assert.ok(!(summary ?? "").includes("\n"), `${args.join(" ")} opened with more than a summary`);
    assert.ok(
      rest.join("\n\n").includes("checkout: https://silpo.ua/"),
      `${args.join(" ")} did not close on the cart`,
    );
  }
});

test("a write prints no quantity the server echoed back at it", async () => {
  const text = await renderTools({ [ADD_TOOL]: "cart.add", ...CART_READ }, setting(CHICKEN, 1));

  assert.equal(text.split("\n")[0], "Updated 2 product(s)");
  assert.ok(!text.includes("\n1: 1\n"), "the echoed quantity was printed");
  assert.ok(!text.includes("\n2: 0.85\n"), "the echoed quantity was printed");
});

test("a write reads the cart once, not twice", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  await run(setting(CHICKEN, 1));

  assert.equal(sentTo(CART_TOOL, "shoppingCartId").length, 1, "the cart was read more than once");
});

test("a quantity over stock is reduced to what the branch holds, and the reduction is named", async () => {
  setPayloads({
    [ADD_TOOL]: fixture("cart.add"),
    [CART_TOOL]: [overStock(CHICKEN, 2, 5), fixture("cart.details")],
  });
  clearToolCalls();

  const text = await run(setting(CHICKEN, 5));

  assert.ok(text.includes(`reduced: ${CHICKEN} from 5кг to 2кг`), text);
  assert.deepEqual(sentTo(ADD_TOOL, "products").at(-1), [
    {
      productId: CHICKEN,
      companyId: COMPANY,
      branchId: BRANCH,
      quantity: 2,
      comment: "без кістки, будь ласка",
    },
  ]);
});

test("a reduced line is re-sent with the comment it was named with", async () => {
  setPayloads({
    [ADD_TOOL]: fixture("cart.add"),
    [CART_TOOL]: [overStock(CHICKEN, 2, 5), fixture("cart.details")],
  });
  clearToolCalls();

  await run(["cart", "set", CHICKEN, "5", "--comment", "без кістки"]);

  assert.deepEqual(sentTo(ADD_TOOL, "products").at(-1), [
    { productId: CHICKEN, companyId: COMPANY, branchId: BRANCH, quantity: 2, comment: "без кістки" },
  ]);
});

test("a reduced line keeps the comment it already carried when none was named", async () => {
  setPayloads({
    [ADD_TOOL]: fixture("cart.add"),
    [CART_TOOL]: [overStock(CHICKEN, 2, 5), fixture("cart.details")],
  });
  clearToolCalls();

  await run(setting(CHICKEN, 5));

  assert.deepEqual(sentTo(ADD_TOOL, "products").at(-1), [
    {
      productId: CHICKEN,
      companyId: COMPANY,
      branchId: BRANCH,
      quantity: 2,
      comment: "без кістки, будь ласка",
    },
  ]);
});

test("cart set names the total the line ends with, not an increment", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  await run(["cart", "set", CHICKEN, "3"]);

  assert.deepEqual(sentTo(ADD_TOOL, "products").at(-1), [
    {
      productId: CHICKEN,
      companyId: COMPANY,
      branchId: BRANCH,
      quantity: 3,
      comment: "без кістки, будь ласка",
    },
  ]);
});

test("cart set to zero fails naming the removal instead", async () => {
  setPayloads({ [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  assert.match(await fails(["cart", "set", CHICKEN, "0"]), /removes the line.*cart remove/);
  assert.deepEqual(toolCalls(), []);
});

test("cart set to a negative amount fails", async () => {
  setPayloads({ [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  assert.match(await fails(["cart", "set", CHICKEN, "-1"]), /greater than 0/);
  assert.deepEqual(toolCalls(), []);
});

test("a weighed line is named in kilograms, in multiples of its own step", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  await run(["cart", "set", SHRIMP, "1.7"]);

  assert.deepEqual(sentTo(ADD_TOOL, "products").at(-1), [
    { productId: SHRIMP, companyId: COMPANY, branchId: BRANCH, quantity: 1.7 },
  ]);
});

test("a weight the step does not divide fails naming the step, and nothing is rounded", async () => {
  setPayloads({ [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  assert.match(await fails(["cart", "set", SHRIMP, "1"]), /steps of 0\.85кг/);
  assert.deepEqual(toolCalls(), []);
});

test("a comment named alone replaces the comment, and the quantity stands", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  await run(["cart", "set", SHRIMP, "0.85", "--comment", "гострий"]);

  assert.deepEqual(sentTo(ADD_TOOL, "products").at(-1), [
    { productId: SHRIMP, companyId: COMPANY, branchId: BRANCH, quantity: 0.85, comment: "гострий" },
  ]);
});

test("a product the cart does not hold fails naming it, and names cart fill as the way in", async () => {
  setPayloads({ [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  const KABACHOK = "1f18a0dd-a26f-6c5e-bad1-65ceb9462254";

  assert.match(await fails(["cart", "set", KABACHOK, "1"]), new RegExp(`${KABACHOK}.*silpo cart fill`));
  assert.deepEqual(toolCalls(), []);
});

test("a line the command never touched is left to whoever put it there", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: overStock(SHRIMP, 2) });
  clearToolCalls();

  const text = await run(setting(CHICKEN, 1));

  assert.ok(!text.includes("reduced"), "a line the command never sent was reduced");
  assert.equal(sentTo(ADD_TOOL, "products").length, 1, "a second write went out");
  assert.ok(text.includes("error product: product.offer.stock.max"), "the validation was dropped");
});

test("nothing to reduce writes once and says nothing about reduction", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  const text = await run(setting(CHICKEN, 1));

  assert.equal(sentTo(ADD_TOOL, "products").length, 1);
  assert.ok(!text.includes("reduced"), "a reduction was reported where none happened");
  assert.ok(!text.includes("unfillable"), "a line was named unfillable where none was");
});

test("a line the branch has none of is named, kept, and fails the command", async () => {
  setPayloads({
    [ADD_TOOL]: fixture("cart.add"),
    [CART_TOOL]: overStock(CHICKEN, 0),
  });
  clearToolCalls();

  const { text, code } = await output(setting(CHICKEN, 1));

  assert.ok(text.includes(`unfillable: ${CHICKEN}`), text);
  assert.ok(text.includes("checkout: https://silpo.ua/"), "the cart was not printed under it");
  assert.equal(sentTo(ADD_TOOL, "products").length, 1, "the unfillable line was written again");
  assert.notEqual(code, 0, "an unfillable line did not fail the command");
});

test("a line the branch carries no offer for is named the same way", async () => {
  setPayloads({
    [ADD_TOOL]: fixture("cart.add"),
    [CART_TOOL]: missingOffer(CHICKEN),
  });

  const { text, code } = await output(setting(CHICKEN, 1));

  assert.ok(text.includes(`unfillable: ${CHICKEN}`), text);
  assert.notEqual(code, 0, "an unfillable line did not fail the command");
});

test("cart remove drops exactly the products named, however many", async () => {
  setPayloads({
    silpo_remove_cart_products: {
      success: true,
      summary: "Removed 2 product(s) from cart",
      products: [{ productId: CHICKEN }, { productId: SHRIMP }],
    },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "remove", CHICKEN, SHRIMP]);

  const [sent] = toolCalls().filter((call) => call.name === "silpo_remove_cart_products");

  assert.deepEqual(sent?.arguments.products, [{ productId: CHICKEN }, { productId: SHRIMP }]);
});

test("a refused certificate prints the message the server wrote, and the command fails", async () => {
  const text = await renderToolsFailing(
    { silpo_add_or_update_certificates: "cart.certificates", ...CART_READ },
    CERTIFICATE_ADD,
  );

  assert.ok(text.includes("barcode: 9990001234567"), "the barcode was dropped");
  assert.ok(text.includes("    errorMessage: Сертифікат не знайдено !"), "the message was dropped");
  assert.ok(!text.includes("success"), "the success field was printed");
});

test("an accepted certificate prints its barcode and its face value above the cart", async () => {
  setPayloads({
    silpo_add_or_update_certificates: {
      success: true,
      summary: "Certificates: 1 added",
      added: [{ barcode: "9990001234567", faceValue: 500, validations: [] }],
      removed: [],
    },
    [CART_TOOL]: fixture("cart.details"),
  });

  const text = await run(CERTIFICATE_ADD);

  assert.ok(
    text.startsWith("Certificates: 1 added\n\nbarcode: 9990001234567\nvalue: 500\n\n"),
    text,
  );
  assert.ok(text.includes("checkout: https://silpo.ua/"), "the cart was not printed under it");
});

test("removing a certificate names it by its barcode alone", async () => {
  setPayloads({
    silpo_add_or_update_certificates: {
      success: true,
      summary: "Certificates: 1 removed",
      added: [],
      removed: ["9990001234567"],
    },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  const text = await run(["cart", "certificate", "remove", "9990001234567"]);

  assert.ok(text.startsWith("Certificates: 1 removed\n\nremoved: 9990001234567\n\n"), text);

  const [sent] = toolCalls().filter((call) => call.name === "silpo_add_or_update_certificates");

  assert.deepEqual(sent?.arguments, { remove: [{ barcode: "9990001234567" }] });
});

test("a certificate's pin travels with the barcode, and adding and removing stay two acts", async () => {
  setPayloads({
    silpo_add_or_update_certificates: { success: true, summary: "ok", added: [], removed: [] },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "certificate", "add", "9990001234567", "--pin", "4821"]);

  const [sent] = toolCalls().filter((call) => call.name === "silpo_add_or_update_certificates");

  assert.deepEqual(sent?.arguments, {
    add: [{ barcode: "9990001234567", pincode: "4821" }],
  });
});

test("no cart command prints whether the call succeeded", async () => {
  for (const [name, args] of [
    ["cart.details", DETAILS],
    ["cart.stale", DETAILS],
  ] as [string, string[]][]) {
    assert.ok(!(await render(name, args)).includes("success"), `${args.join(" ")} printed success`);
  }

  assert.ok(
    !(await renderTools({ silpo_clear_shopping_cart: "cart.clear", ...CART_READ }, ["cart", "clear"]))
      .includes("success"),
    "the clear printed success",
  );
});

test("cart setup hands over only the setting it was given", async () => {
  setPayloads({
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "setup", "--delivery-type", "DeliveryHome"]);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);
  const named = Object.entries(sent?.arguments ?? {}).filter(([, value]) => value !== undefined);

  assert.deepEqual(named, [["deliveryType", "DeliveryHome"]], "a setting nobody named was sent");
});

test("an invalid --delivery-type fails naming the accepted set, not the tool's schema", async () => {
  clearToolCalls();

  const message = await fails(["cart", "setup", "--to", STORE, "--delivery-type", "pickup"]);

  assert.match(message, /expected one of Unknown, SelfPickup, DeliveryHome/);
  assert.ok(!message.includes("Invalid arguments for tool"), message);
  assert.equal(toolCalls().length, 0);
});

test("cart setup carries neither a promo code, a bonus, a certificate nor the adult flag", async () => {
  setPayloads({
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "setup", "--delivery-type", "DeliveryHome"]);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);
  const keys = Object.keys(sent?.arguments ?? {});

  for (const missing of ["promoCode", "bonusRequested", "isAdultConfirmed"]) {
    assert.ok(!keys.includes(missing), `${missing} reached cart setup`);
  }
});

test("cart promo sends only the promo code", async () => {
  setPayloads({
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "promo", "SPRING"]);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);
  const named = Object.entries(sent?.arguments ?? {}).filter(([, value]) => value !== undefined);

  assert.deepEqual(named, [["promoCode", "SPRING"]]);
});

test("cart promo none clears the code", async () => {
  setPayloads({
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "promo", "none"]);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);

  assert.equal(sent?.arguments.promoCode, null);
});

test("cart bonus sends only the amount requested", async () => {
  setPayloads({
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "bonus", "50"]);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);
  const named = Object.entries(sent?.arguments ?? {}).filter(([, value]) => value !== undefined);

  assert.deepEqual(named, [["bonusRequested", 50]]);
});

test("cart bonus none clears the request", async () => {
  setPayloads({
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "bonus", "none"]);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);

  assert.equal(sent?.arguments.bonusRequested, null);
});

test("cart adult confirms and offers no way to clear it", async () => {
  setPayloads({
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "adult"]);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);
  const named = Object.entries(sent?.arguments ?? {}).filter(([, value]) => value !== undefined);

  assert.deepEqual(named, [["isAdultConfirmed", true]]);
});

test("--to a store resolves self pickup, takes a slot, and writes the shipment itself", async () => {
  setPayloads({
    [SAVED_ADDRESSES_TOOL]: { success: true, summary: "", addresses: [] },
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [TIME_SLOTS_TOOL]: timeSlots(["2026-08-21T06:00:00+00:00", "2026-08-21T06:30:00+00:00", true]),
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  const text = await run(["cart", "setup", "--to", "Володимира Івасюка"]);

  assert.ok(
    text.startsWith("Cart updated"),
    "a resolved-place record was printed though the destination named a store, and nothing was geocoded",
  );

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);

  assert.equal(sent?.arguments.deliveryType, "SelfPickup");
  assert.equal(sent?.arguments.branchId, STORE);
  assert.deepEqual(sent?.arguments.shipments, [{ companyId: STORE_COMPANY, branchId: STORE }]);
  assert.deepEqual(sent?.arguments.timeslot, {
    start: "2026-08-21T06:00:00+00:00",
    end: "2026-08-21T06:30:00+00:00",
  });
  assert.deepEqual(sent?.arguments.address, {
    addressType: "self-pickup",
    latitude: "50.5202200000000000",
    longitude: "30.5145200000000000",
    city: "Київ",
    street: "просп. Володимира Івасюка, 46",
  });
});

test("a destination matching more than one store is printed, and the cart is not written", async () => {
  setPayloads({
    [SAVED_ADDRESSES_TOOL]: { success: true, summary: "", addresses: [] },
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
  });
  clearToolCalls();

  const { text, code } = await output(["cart", "setup", "--to", "Бережанська"]);

  assert.ok(text.startsWith("Found 2 matching places"), text);
  assert.notEqual(code, 0);
  assert.deepEqual(toolCalls().filter((call) => call.name === UPDATE_TOOL), []);
});

test("an address matching the caller's own text exactly is taken, and the cart is written", async () => {
  const shorter = {
    address: null,
    city: "Дніпро",
    street: "проспект Олександра Поля",
    houseNumber: null,
    district: "Центральний район",
    latitude: 48.466615,
    longitude: 35.029631,
  };
  const longer = {
    address: null,
    city: "Дніпро",
    street: "проспект Олександра Поля",
    houseNumber: "84",
    district: "Центральний район",
    latitude: 48.441175,
    longitude: 35.01571,
  };

  setPayloads({
    [SAVED_ADDRESSES_TOOL]: { success: true, summary: "", addresses: [] },
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    ["silpo_find_address"]: { success: true, summary: "Found 2 addresses", addresses: [shorter, longer] },
    silpo_get_available_delivery_types: {
      success: true,
      summary: "",
      options: [{ deliveryType: "DeliveryHome", branchId: STORE, description: "Regular delivery" }],
    },
    [TIME_SLOTS_TOOL]: timeSlots(["2026-08-21T06:00:00+00:00", "2026-08-21T06:30:00+00:00", true]),
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  const text = await run(["cart", "setup", "--to", "Дніпро, проспект Олександра Поля, буд. 84"]);

  assert.ok(!text.includes("Found 2 addresses"), text);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);

  assert.equal(sent?.arguments.address.latitude, "48.441175");
  assert.equal(sent?.arguments.address.longitude, "35.01571");
});

test("the geocoded place --to resolved to is printed with the write", async () => {
  const address = {
    address: null,
    city: "Дніпро",
    street: "проспект Олександра Поля",
    houseNumber: "84",
    district: "Центральний район",
    latitude: 48.441175,
    longitude: 35.01571,
  };

  setPayloads({
    [SAVED_ADDRESSES_TOOL]: { success: true, summary: "", addresses: [] },
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    ["silpo_find_address"]: { success: true, summary: "Found 1 address", addresses: [address] },
    silpo_get_available_delivery_types: {
      success: true,
      summary: "",
      options: [{ deliveryType: "DeliveryHome", branchId: STORE, description: "Regular delivery" }],
    },
    [TIME_SLOTS_TOOL]: timeSlots(["2026-08-21T06:00:00+00:00", "2026-08-21T06:30:00+00:00", true]),
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  const text = await run(["cart", "setup", "--to", "Дніпро, проспект Олександра Поля, буд. 84"]);

  assert.ok(
    text.startsWith(
      "address: Дніпро, проспект Олександра Поля, буд. 84\ndistrict: Центральний район\ncoordinates: 48.441175, 35.01571\n\nCart updated",
    ),
    text,
  );
});

test("--to and --delivery-type together take the named type's own branch, without probing the preference", async () => {
  const address = {
    address: null,
    city: "Дніпро",
    street: "проспект Олександра Поля",
    houseNumber: "84",
    district: "Центральний район",
    latitude: 48.441175,
    longitude: 35.01571,
  };
  const HOME_BRANCH = STORE;
  const B2B_BRANCH = "1eda8887-bf7c-6f38-b0cb-9503162b5586";

  setPayloads({
    [SAVED_ADDRESSES_TOOL]: { success: true, summary: "", addresses: [] },
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    ["silpo_find_address"]: { success: true, summary: "Found 1 address", addresses: [address] },
    silpo_get_available_delivery_types: {
      success: true,
      summary: "",
      options: [
        { deliveryType: "DeliveryHome", branchId: HOME_BRANCH, description: "Regular delivery" },
        { deliveryType: "B2B", branchId: B2B_BRANCH, description: "Business delivery" },
      ],
    },
    [TIME_SLOTS_TOOL]: timeSlots(["2026-08-21T06:00:00+00:00", "2026-08-21T06:30:00+00:00", true]),
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run([
    "cart",
    "setup",
    "--to",
    "Дніпро, проспект Олександра Поля, буд. 84",
    "--delivery-type",
    "B2B",
  ]);

  const slotCalls = toolCalls().filter((call) => call.name === TIME_SLOTS_TOOL);

  assert.equal(slotCalls.length, 1, "the preference's own branch was probed for a slot too");
  assert.deepEqual(slotCalls[0]?.arguments.deliveryTypes, ["B2B"]);
  assert.equal(slotCalls[0]?.arguments.branchId, B2B_BRANCH);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);

  assert.equal(sent?.arguments.deliveryType, "B2B");
  assert.equal(sent?.arguments.branchId, B2B_BRANCH);
  assert.deepEqual(sent?.arguments.shipments, [{ companyId: STORE_COMPANY, branchId: B2B_BRANCH }]);
});

test("--to and a --delivery-type that does not serve the destination fails before any slot is looked up", async () => {
  const address = {
    address: null,
    city: "Дніпро",
    street: "проспект Олександра Поля",
    houseNumber: "84",
    district: "Центральний район",
    latitude: 48.441175,
    longitude: 35.01571,
  };

  setPayloads({
    [SAVED_ADDRESSES_TOOL]: { success: true, summary: "", addresses: [] },
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    ["silpo_find_address"]: { success: true, summary: "Found 1 address", addresses: [address] },
    silpo_get_available_delivery_types: {
      success: true,
      summary: "",
      options: [{ deliveryType: "DeliveryHome", branchId: STORE, description: "Regular delivery" }],
    },
  });
  clearToolCalls();

  assert.match(
    await fails(["cart", "setup", "--to", "Дніпро, проспект Олександра Поля, буд. 84", "--delivery-type", "B2B"]),
    /B2B does not serve this destination/,
  );
  assert.deepEqual(toolCalls().filter((call) => call.name === TIME_SLOTS_TOOL), []);
  assert.deepEqual(toolCalls().filter((call) => call.name === UPDATE_TOOL), []);
});

test("a destination naming nothing the CLI can resolve fails naming it", async () => {
  setPayloads({
    [SAVED_ADDRESSES_TOOL]: { success: true, summary: "", addresses: [] },
    [LIST_BRANCHES_TOOL]: { success: true, summary: "Found 0 branches", branches: [], meta: { limit: 500, offset: 0, total: 0 } },
    ["silpo_find_address"]: { success: true, summary: "Found 0 addresses", addresses: [] },
    ["silpo_find_nova_poshta_settlements"]: { success: true, summary: "", settlements: [] },
  });
  clearToolCalls();

  assert.match(await fails(["cart", "setup", "--to", "нікуди"]), /could not resolve destination/);
});

test("a branch uuid passed as the destination moves the cart to that store, address and all", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [TIME_SLOTS_TOOL]: timeSlots(["2026-08-21T06:00:00+00:00", "2026-08-21T06:30:00+00:00", true]),
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "setup", "--to", STORE]);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);
  const named = Object.entries(sent?.arguments ?? {}).filter(([, value]) => value !== undefined);

  assert.deepEqual(new Map(named).get("branchId"), STORE);
  assert.deepEqual(new Map(named).get("shipments"), [{ companyId: STORE_COMPANY, branchId: STORE }]);
  assert.deepEqual(new Map(named).get("timeslot"), {
    start: "2026-08-21T06:00:00+00:00",
    end: "2026-08-21T06:30:00+00:00",
  });
  // A uuid names a store, and a store is collected from. The address is the branch's own, not a
  // leftover naming a different shop the cart is no longer fulfilled by.
  assert.deepEqual(new Map(named).get("deliveryType"), "SelfPickup");
  assert.ok(named.some(([key]) => key === "address"), "the store's own address was not written");
});

test("a store named as the destination refuses a courier delivery type", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [TIME_SLOTS_TOOL]: timeSlots(["2026-08-21T06:00:00+00:00", "2026-08-21T06:30:00+00:00", true]),
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  const message = await fails(["cart", "setup", "--to", STORE, "--delivery-type", "DeliveryHome"]);

  assert.match(message, /DeliveryHome does not serve this destination/);
  assert.deepEqual(toolCalls().filter((call) => call.name === UPDATE_TOOL), []);
});

test("--when and --delivery-type together select the slot under the named type, not the cart's own", async () => {
  setPayloads({
    [TIME_SLOTS_TOOL]: timeSlots(["2026-08-21T06:00:00+00:00", "2026-08-21T06:30:00+00:00", true]),
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await output(["cart", "setup", "--when", "tomorrow", "--delivery-type", "DeliveryHome"]);

  const slotsCall = toolCalls().find((call) => call.name === TIME_SLOTS_TOOL);

  assert.deepEqual(slotsCall?.arguments.deliveryTypes, ["DeliveryHome"]);
});

test("a branch the listing does not hold fails naming it, before any slot is looked up", async () => {
  setPayloads({ [LIST_BRANCHES_TOOL]: fixture("branches.branches") });
  clearToolCalls();

  assert.match(
    await fails(["cart", "setup", "--to", "1edb7345-2b99-62cc-9e83-000000000000"]),
    /no branch 1edb7345-2b99-62cc-9e83-000000000000/,
  );
  assert.deepEqual(toolCalls().filter((call) => call.name === TIME_SLOTS_TOOL), []);
});

test("--when alone takes the earliest available slot on the named day at the cart's own branch", async () => {
  setPayloads({
    [TIME_SLOTS_TOOL]: timeSlots(
      ["2026-08-21T10:00:00+00:00", "2026-08-21T10:30:00+00:00", true],
      ["2026-08-21T06:00:00+00:00", "2026-08-21T06:30:00+00:00", false],
      ["2026-08-21T09:00:00+00:00", "2026-08-21T09:30:00+00:00", true],
      ["2026-08-22T09:00:00+00:00", "2026-08-22T09:30:00+00:00", true],
    ),
    [UPDATE_TOOL]: { success: true, summary: "Cart updated", shoppingCartId: "x" },
    [CART_TOOL]: fixture("cart.details"),
  });
  clearToolCalls();

  await run(["cart", "setup", "--when", "2026-08-21"]);

  const [sent] = toolCalls().filter((call) => call.name === UPDATE_TOOL);
  const named = Object.entries(sent?.arguments ?? {}).filter(([, value]) => value !== undefined);

  assert.deepEqual(named, [
    [
      "timeslot",
      { start: "2026-08-21T09:00:00+00:00", end: "2026-08-21T09:30:00+00:00" },
    ],
  ]);
});

test("no slot on the day named by --when fails naming the day and the branch", async () => {
  setPayloads({ [TIME_SLOTS_TOOL]: timeSlots(["2026-08-22T09:00:00+00:00", "2026-08-22T09:30:00+00:00", true]) });
  clearToolCalls();

  assert.match(
    await fails(["cart", "setup", "--when", "2026-08-21"]),
    /offers no available time slot.*2026-08-21/,
  );
  assert.deepEqual(toolCalls().filter((call) => call.name === UPDATE_TOOL), []);
});

test("cart set takes several pairs and writes them in one call", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  await run(["cart", "set", CHICKEN, "3", SHRIMP, "1.7"]);

  const writes = toolCalls().filter((call) => call.name === ADD_TOOL);

  assert.equal(writes.length, 1, "the pairs were written one at a time");
  assert.deepEqual(
    (writes[0]?.arguments.products as { productId: string; quantity: number }[]).map(
      ({ productId, quantity }) => [productId, quantity],
    ),
    [
      [CHICKEN, 3],
      [SHRIMP, 1.7],
    ],
  );
});

test("a product left without a quantity fails before anything is written", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  assert.match(await fails(["cart", "set", CHICKEN, "3", SHRIMP]), /do not pair up/);
  assert.deepEqual(toolCalls().filter((call) => call.name === ADD_TOOL), []);
});

test("--comment with more than one pair fails rather than commenting every line", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  assert.match(
    await fails(["cart", "set", CHICKEN, "3", SHRIMP, "1.7", "--comment", "будь ласка"]),
    /pass it with a single pair/,
  );
  assert.deepEqual(toolCalls().filter((call) => call.name === ADD_TOOL), []);
});

test("one product named twice fails rather than letting the last quantity win", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  assert.match(await fails(["cart", "set", CHICKEN, "3", CHICKEN, "5"]), /named twice/);
  assert.deepEqual(toolCalls().filter((call) => call.name === ADD_TOOL), []);
});

test("a bad quantity anywhere in the pairs writes nothing at all", async () => {
  setPayloads({ [ADD_TOOL]: fixture("cart.add"), [CART_TOOL]: fixture("cart.details") });
  clearToolCalls();

  assert.match(await fails(["cart", "set", CHICKEN, "3", SHRIMP, "-1"]), /greater than 0/);
  assert.deepEqual(toolCalls().filter((call) => call.name === ADD_TOOL), []);
});
