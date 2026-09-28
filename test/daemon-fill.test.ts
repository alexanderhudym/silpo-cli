import assert from "node:assert/strict";
import { test } from "node:test";

const { Filler } = await import("../dist/daemon/fill.js");

const COMPANY = "1ec88c5d-a050-669c-8467-570a157f3e31";
const BRANCH = "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468";
const MILK = "2f18a0dd-a1ff-6b16-936b-993049b0fabd";
const MILK_NAME = "Молоко Яготинське пастеризоване 2,5% 950г";
const MILK_TERM = "молоко яготинське пастеризоване";
const ALTERNATIVE = "3f18a0dd-a1ff-6b16-936b-993049b0fabd";
const ALTERNATIVE_NAME = "Молоко Селянське пастеризоване 2,5% 900г";

function emptyPage() {
  return { structured: { orders: [], meta: { total: 0 } } };
}

function emptyFavoritesPage() {
  return { structured: { products: [], meta: { total: 0 } } };
}

function milkProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: MILK,
    name: MILK_NAME,
    slug: "moloko-yagotynske",
    price: 32.5,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: false,
    step: 1,
    displayRatio: "950г",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
    ...overrides,
  };
}

function alternativeProduct(): Record<string, unknown> {
  return {
    id: ALTERNATIVE,
    name: ALTERNATIVE_NAME,
    slug: "moloko-selianske",
    price: 30,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: false,
    step: 1,
    displayRatio: "900г",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
  };
}

const CARROT = "4f18a0dd-a1ff-6b16-936b-993049b0fabd";
const CARROT_NAME = "Морква мита";
const CARROT_TERM = "морква";
const CARROT_ALT_A = "5f18a0dd-a1ff-6b16-936b-993049b0fabd";
const CARROT_ALT_A_NAME = "Морква мита фасована";
const CARROT_ALT_B = "6f18a0dd-a1ff-6b16-936b-993049b0fabd";
const CARROT_ALT_B_NAME = "Морква молода";

function carrotProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: CARROT,
    name: CARROT_NAME,
    slug: "morkva-myta",
    price: 30.99,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: true,
    step: 0.2,
    displayRatio: "1кг",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
    ...overrides,
  };
}

function carrotAlternative(id: string, name: string, step: number): Record<string, unknown> {
  return {
    id,
    name,
    slug: `${id}-slug`,
    price: 25,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: true,
    step,
    displayRatio: "1кг",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
  };
}

function carrotAlternatives() {
  return [carrotAlternative(CARROT_ALT_A, CARROT_ALT_A_NAME, 0.5), carrotAlternative(CARROT_ALT_B, CARROT_ALT_B_NAME, 0.35)];
}

function baseSession(overrides: Record<string, unknown> = {}) {
  return {
    async getMyFoodRestrictions() {
      return { structured: { success: true, summary: "", restrictions: [] } };
    },
    async getMyOnlineOrders() {
      return emptyPage();
    },
    async getMyOfflineOrders() {
      return emptyPage();
    },
    async getMyFavorites() {
      return emptyFavoritesPage();
    },
    async getSimilarProducts() {
      return {
        structured: { success: true, summary: "", products: [alternativeProduct()], meta: { totalQueries: 1, totalProducts: 1 } },
      };
    },
    ...overrides,
  };
}

const cart = {
  async current() {
    return {
      cart: {
        id: "cart-1",
        deliveryType: "SelfPickup",
        timeslot: { start: "2026-08-17T06:00:00+00:00", end: "2026-08-17T06:30:00+00:00" },
        shipments: [{ id: "s1", companyId: COMPANY, branchId: BRANCH, products: [] }],
      },
      loyalty: null,
    };
  },
};

function batchSession(products: readonly Record<string, unknown>[]) {
  return baseSession({
    async findProductsBatch({ products: probes }: { products: readonly string[] }) {
      return {
        structured: {
          success: true,
          summary: "",
          queries: probes.map((query) => ({ query, totalFound: products.length, products })),
          meta: { totalQueries: probes.length, totalProducts: products.length },
        },
      };
    },
  });
}

function batchSessionWithAlternatives(
  products: readonly Record<string, unknown>[],
  alternatives: readonly Record<string, unknown>[],
) {
  const session = batchSession(products);

  session.getSimilarProducts = async () => ({
    structured: { success: true, summary: "", products: alternatives, meta: { totalQueries: 1, totalProducts: alternatives.length } },
  });

  return session;
}

test("a decisive term with enough stock resolves auto and writes at the quantity asked", async () => {
  const filler = new Filler(batchSession([milkProduct()]), cart);

  const result = await filler.resolve([`${MILK_TERM} 2`], []);

  assert.equal(result.lines.length, 1);
  assert.equal(result.lines[0]!.kind, "auto");
  assert.deepEqual(result.lines[0]!.writes, [
    { product: { productId: MILK, name: MILK_NAME, companyId: COMPANY, weighted: false, step: 1 }, quantity: 2, note: undefined },
  ]);
});

test("a term nothing answers misses", async () => {
  const filler = new Filler(batchSession([]), cart);

  const result = await filler.resolve(["захалявний ніж"], []);

  assert.equal(result.lines[0]!.kind, "miss");
  assert.deepEqual(result.lines[0]!.writes, []);
});

test("a branch holding fewer than asked for resolves to a question naming the product, the stock and the ask", async () => {
  const filler = new Filler(batchSession([milkProduct({ stock: 1 })]), cart);

  const result = await filler.resolve([`${MILK_TERM} 3`], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "ask");
  assert.deepEqual(line.writes, []);
  assert.deepEqual(line.shortfall, {
    product: { productId: MILK, name: MILK_NAME, companyId: COMPANY, weighted: false, step: 1 },
    stock: 1,
    quantity: 3,
  });
  assert.deepEqual(
    line.candidates.map((candidate: { productId: string }) => candidate.productId),
    [ALTERNATIVE],
  );
});

test("an accept-stock answer takes what the branch holds, naming no identifier of its own", async () => {
  const filler = new Filler(batchSession([milkProduct({ stock: 1 })]), cart);

  const result = await filler.resolve([`${MILK_TERM} 3`], [{ term: MILK_TERM, answer: "stock" }]);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.deepEqual(line.writes, [
    { product: { productId: MILK, name: MILK_NAME, companyId: COMPANY, weighted: false, step: 1 }, quantity: 1, note: undefined },
  ]);
});

test("an alternatives answer takes what the branch holds and makes up the rest from the top alternative", async () => {
  const filler = new Filler(batchSession([milkProduct({ stock: 1 })]), cart);

  const result = await filler.resolve([`${MILK_TERM} 3`], [{ term: MILK_TERM, answer: "alternatives" }]);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.deepEqual(line.writes, [
    { product: { productId: MILK, name: MILK_NAME, companyId: COMPANY, weighted: false, step: 1 }, quantity: 1, note: undefined },
    { product: { productId: ALTERNATIVE, name: ALTERNATIVE_NAME, companyId: COMPANY, weighted: false, step: 1 }, quantity: 2, note: undefined },
  ]);
});

test("enough stock at the branch resolves automatically with no question put", async () => {
  const filler = new Filler(batchSession([milkProduct({ stock: 3 })]), cart);

  const result = await filler.resolve([`${MILK_TERM} 3`], []);

  assert.equal(result.lines[0]!.kind, "auto");
});

test("a pick is resolved by fetching the product, not from a stored record", async () => {
  const session = baseSession({
    async getProductDetails() {
      return {
        structured: {
          success: true,
          product: {
            id: MILK,
            name: MILK_NAME,
            slug: "moloko-yagotynske",
            price: 32.5,
            oldPrice: null,
            stock: 10,
            available: true,
            weighted: false,
            step: 1,
            ratio: null,
            displayRatio: "950г",
            url: "",
            images: [],
            attributes: null,
            companyId: COMPANY,
            branchId: BRANCH,
          },
        },
      };
    },
  });
  const filler = new Filler(session, cart);

  const result = await filler.resolve([`${MILK_TERM} 2`], [{ term: MILK_TERM, productId: MILK }]);

  assert.equal(result.lines[0]!.kind, "auto");
  assert.equal(result.lines[0]!.writes[0]!.product.productId, MILK);
  assert.equal(result.lines[0]!.writes[0]!.quantity, 2, "the picked term keeps the quantity it was written with");
});

test("a specification the item named blocks auto even where every word is covered", async () => {
  const filler = new Filler(batchSession([milkProduct()]), cart);

  const result = await filler.resolve(["молоко 1%"], []);

  assert.equal(result.lines[0]!.kind, "ask");
  assert.deepEqual(result.lines[0]!.writes, []);
});

test("a matching specification clears the gate and resolves auto", async () => {
  const filler = new Filler(batchSession([milkProduct()]), cart);

  const result = await filler.resolve(["молоко 2,5%"], []);

  assert.equal(result.lines[0]!.kind, "auto");
});

test("a restriction on a resolved product still writes, flagged warn", async () => {
  const session = batchSession([milkProduct()]);

  session.getMyFoodRestrictions = async () => ({
    structured: { success: true, summary: "", restrictions: [{ slug: "vegan", name: "Веган" }] },
  });

  const filler = new Filler(session, cart);
  const result = await filler.resolve([MILK_TERM], []);

  assert.equal(result.lines[0]!.kind, "warn");
  assert.deepEqual(result.lines[0]!.restrictions, ["Веган"]);
});

test("a weighted product short of a count read as steps asks, naming the shortfall in its own unit", async () => {
  const filler = new Filler(
    batchSessionWithAlternatives([carrotProduct({ stock: 0.2 })], carrotAlternatives()),
    cart,
  );

  const result = await filler.resolve([`${CARROT_TERM} 3`], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "ask");
  assert.deepEqual(line.writes, []);
  assert.deepEqual(line.shortfall, {
    product: { productId: CARROT, name: CARROT_NAME, companyId: COMPANY, weighted: true, step: 0.2 },
    stock: 0.2,
    quantity: 0.6,
  });
  assert.deepEqual(
    line.candidates.map((candidate: { productId: string }) => candidate.productId),
    [CARROT_ALT_A, CARROT_ALT_B],
  );
});

test("an accept-stock answer on a weighted product takes the largest whole number of steps within stock", async () => {
  const filler = new Filler(
    batchSessionWithAlternatives([carrotProduct({ stock: 0.5 })], carrotAlternatives()),
    cart,
  );

  const result = await filler.resolve([`${CARROT_TERM} 3`], [{ term: CARROT_TERM, answer: "stock" }]);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.deepEqual(line.writes, [
    { product: { productId: CARROT, name: CARROT_NAME, companyId: COMPANY, weighted: true, step: 0.2 }, quantity: 0.4, note: undefined },
  ]);
});

const APPLE = "7f18a0dd-a1ff-6b16-936b-993049b0fa01";
const APPLE_NAME = "Яблука Голден";

function appleProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: APPLE,
    name: APPLE_NAME,
    slug: "yabluka-golden",
    price: 45,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: true,
    step: 0.5,
    displayRatio: "1кг",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
    ...overrides,
  };
}

const BREAD = "7f18a0dd-a1ff-6b16-936b-993049b0fa02";
const BREAD_NAME = "Хліб пшеничний";

function breadProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: BREAD,
    name: BREAD_NAME,
    slug: "khlib-pshenychnyi",
    price: 28,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: true,
    step: 0.25,
    displayRatio: "1кг",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
    ...overrides,
  };
}

const CARTON_15 = "7f18a0dd-a1ff-6b16-936b-993049b0fa03";
const CARTON_15_NAME = "Яйця курячі С1 15шт/уп";

function carton15Product(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: CARTON_15,
    name: CARTON_15_NAME,
    slug: "yaitsia-kuriachi-15",
    price: 90,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: false,
    step: 1,
    displayRatio: "15шт/уп",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
    ...overrides,
  };
}

const CARTON_10 = "7f18a0dd-a1ff-6b16-936b-993049b0fa04";
const CARTON_10_NAME = "Яйця курячі С1 10шт";

function carton10Product(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: CARTON_10,
    name: CARTON_10_NAME,
    slug: "yaitsia-kuriachi-10",
    price: 65,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: false,
    step: 1,
    displayRatio: "10шт",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
    ...overrides,
  };
}

const COFFEE = "7f18a0dd-a1ff-6b16-936b-993049b0fa05";
const COFFEE_NAME = "Кава мелена";

function coffeeProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: COFFEE,
    name: COFFEE_NAME,
    slug: "kava-melena",
    price: 120,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: false,
    step: 1,
    displayRatio: "250г",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
    ...overrides,
  };
}

const AVOCADO = "7f18a0dd-a1ff-6b16-936b-993049b0fa06";
const AVOCADO_NAME = "Авокадо Хасс";

function avocadoProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: AVOCADO,
    name: AVOCADO_NAME,
    slug: "avokado-khass",
    price: 55,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: false,
    step: 1,
    displayRatio: "1шт",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
    ...overrides,
  };
}

const WINGS = "7f18a0dd-a1ff-6b16-936b-993049b0fa07";
const WINGS_NAME = "Курячі крила охолоджені";

function wingsProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: WINGS,
    name: WINGS_NAME,
    slug: "kuriachi-kryla",
    price: 110,
    oldPrice: null,
    stock: 2,
    available: true,
    image: null,
    weighted: true,
    step: 0.5,
    displayRatio: "1кг",
    specialPrices: null,
    companyId: COMPANY,
    branchId: BRANCH,
    externalProductId: null,
    ...overrides,
  };
}

test("a count against a weighted product counts steps: яблука голден 3 шт", async () => {
  const filler = new Filler(batchSession([appleProduct()]), cart);

  const result = await filler.resolve(["яблука голден 3 шт"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.deepEqual(line.writes, [
    { product: { productId: APPLE, name: APPLE_NAME, companyId: COMPANY, weighted: true, step: 0.5 }, quantity: 1.5, note: "steps" },
  ]);
});

test("a bare quantity against a weighted product counts steps and says so, the same as the count form: яблука голден 3", async () => {
  const filler = new Filler(batchSession([appleProduct()]), cart);

  const result = await filler.resolve(["яблука голден 3"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.deepEqual(line.writes, [
    { product: { productId: APPLE, name: APPLE_NAME, companyId: COMPANY, weighted: true, step: 0.5 }, quantity: 1.5, note: "steps" },
  ]);
});

test("an item naming no quantity against a weighted product buys one step, not one kilogram: хліб", async () => {
  const filler = new Filler(batchSession([breadProduct()]), cart);

  const result = await filler.resolve(["хліб"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 0.25);
});

test("a count against a carton whose contents are stated with trailing text still names the pack, and says the count was covered by packs: яйця курячі 10 шт", async () => {
  const filler = new Filler(batchSession([carton15Product()]), cart);

  const result = await filler.resolve(["яйця курячі 10 шт"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 1);
  assert.equal(line.writes[0]!.note, "packs");
});

test("a count larger than the pack buys as many packs as cover it, and says so: яйця курячі 20 шт", async () => {
  const filler = new Filler(batchSession([carton15Product()]), cart);

  const result = await filler.resolve(["яйця курячі 20 шт"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 2);
  assert.equal(line.writes[0]!.note, "packs");
});

test("a fractional count against a weighted product is raised to a whole step: морква 1.5 шт", async () => {
  const filler = new Filler(batchSession([carrotProduct()]), cart);

  const result = await filler.resolve([`${CARROT_TERM} 1.5 шт`], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 0.4);
});

test("a quantity of zero writes no line and is reported among misses: морква 0 шт", async () => {
  const filler = new Filler(batchSession([carrotProduct()]), cart);

  const result = await filler.resolve([`${CARROT_TERM} 0 шт`], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "miss");
  assert.deepEqual(line.writes, []);
});

test("a mass against a product whose contents are stated in pieces matches nothing and asks: яйця курячі 600 г", async () => {
  const filler = new Filler(batchSession([carton10Product()]), cart);

  const result = await filler.resolve(["яйця курячі 600 г"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "ask");
  assert.deepEqual(line.writes, []);
});

test("a fractional count against a packaged product with no matching pack rounds up to a whole unit, and says it was raised: молоко 1.5 шт", async () => {
  const filler = new Filler(batchSession([milkProduct()]), cart);

  const result = await filler.resolve([`${MILK_TERM} 1.5 шт`], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 2);
  assert.equal(line.writes[0]!.note, "raised");
});

test("a fractional bare quantity against a packaged product with no matching pack rounds up to a whole unit, and says it was raised, the same as the count form: молоко яготинське пастеризоване 1.5", async () => {
  const filler = new Filler(batchSession([milkProduct()]), cart);

  const result = await filler.resolve([`${MILK_TERM} 1.5`], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 2);
  assert.equal(line.writes[0]!.note, "raised");
});

test("a mass the step does not divide is raised to the step: морква 0.5 кг", async () => {
  const filler = new Filler(batchSession([carrotProduct()]), cart);

  const result = await filler.resolve([`${CARROT_TERM} 0.5 кг`], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 0.6);
  assert.equal(line.writes[0]!.note, "raised");
});

test("a mass against a weighted product whose payload states no usable step says the amount was chosen: куряче філе 300 г", async () => {
  const filler = new Filler(batchSession([carrotProduct({ step: 0 })]), cart);

  const result = await filler.resolve([`${CARROT_TERM} 300 г`], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 1);
  assert.equal(line.writes[0]!.note, "chosen");
});

test("a shortfall measured in kilograms is not compared against a count of pieces: курячі крила 5 шт", async () => {
  const filler = new Filler(batchSessionWithAlternatives([wingsProduct()], []), cart);

  const result = await filler.resolve(["курячі крила 5 шт"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "ask");
  assert.deepEqual(line.shortfall, {
    product: { productId: WINGS, name: WINGS_NAME, companyId: COMPANY, weighted: true, step: 0.5 },
    stock: 2,
    quantity: 2.5,
  });
});

test("a mass the step already divides is written unchanged: яблука 2 кг", async () => {
  const filler = new Filler(batchSession([appleProduct()]), cart);

  const result = await filler.resolve(["яблука 2 кг"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 2);
  assert.equal(line.writes[0]!.note, undefined);
});

test("a mass beside a packaged product still names its own pack: кава 250 г", async () => {
  const filler = new Filler(batchSession([coffeeProduct()]), cart);

  const result = await filler.resolve(["кава 250 г"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 1);
});

test("a count matching a ten-egg carton still buys one of it: яйця курячі 10 шт", async () => {
  const filler = new Filler(batchSession([carton10Product()]), cart);

  const result = await filler.resolve(["яйця курячі 10 шт"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 1);
});

test("a count a product's pack does not carry is how many to buy: авокадо 2 шт", async () => {
  const filler = new Filler(batchSession([avocadoProduct()]), cart);

  const result = await filler.resolve(["авокадо 2 шт"], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 2);
});

test("a count against a packaged product with no matching pack is how many to buy: молоко 2 шт", async () => {
  const filler = new Filler(batchSession([milkProduct()]), cart);

  const result = await filler.resolve([`${MILK_TERM} 2 шт`], []);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.equal(line.writes[0]!.quantity, 2);
});

test("an alternatives answer on a weighted product raises the remainder to the matched alternative's own step, not the short product's", async () => {
  const filler = new Filler(
    batchSessionWithAlternatives([carrotProduct({ stock: 0.2 })], carrotAlternatives()),
    cart,
  );

  const result = await filler.resolve([`${CARROT_TERM} 3`], [{ term: CARROT_TERM, answer: "alternatives" }]);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.deepEqual(line.writes, [
    { product: { productId: CARROT, name: CARROT_NAME, companyId: COMPANY, weighted: true, step: 0.2 }, quantity: 0.2, note: undefined },
    { product: { productId: CARROT_ALT_A, name: CARROT_ALT_A_NAME, companyId: COMPANY, weighted: true, step: 0.5 }, quantity: 0.5, note: undefined },
  ]);
});

test("an alternatives answer leaves the remainder unfilled where no alternative shares the product's own unit, and reports it as a shortfall", async () => {
  const filler = new Filler(
    batchSessionWithAlternatives([carrotProduct({ stock: 0.2 })], [milkProduct()]),
    cart,
  );

  const result = await filler.resolve([`${CARROT_TERM} 3`], [{ term: CARROT_TERM, answer: "alternatives" }]);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.deepEqual(line.writes, [
    { product: { productId: CARROT, name: CARROT_NAME, companyId: COMPANY, weighted: true, step: 0.2 }, quantity: 0.2, note: undefined },
  ]);
  assert.deepEqual(line.shortfall, {
    product: { productId: CARROT, name: CARROT_NAME, companyId: COMPANY, weighted: true, step: 0.2 },
    stock: 0.2,
    quantity: 0.6,
  });
});

test("an alternatives answer floors the short product's own write to a whole step where the reported stock is not one", async () => {
  const filler = new Filler(
    batchSessionWithAlternatives([carrotProduct({ stock: 0.45 })], carrotAlternatives()),
    cart,
  );

  const result = await filler.resolve([`${CARROT_TERM} 3`], [{ term: CARROT_TERM, answer: "alternatives" }]);
  const line = result.lines[0]!;

  assert.equal(line.kind, "auto");
  assert.deepEqual(line.writes, [
    { product: { productId: CARROT, name: CARROT_NAME, companyId: COMPANY, weighted: true, step: 0.2 }, quantity: 0.4, note: undefined },
    { product: { productId: CARROT_ALT_A, name: CARROT_ALT_A_NAME, companyId: COMPANY, weighted: true, step: 0.5 }, quantity: 0.5, note: undefined },
  ]);
});
