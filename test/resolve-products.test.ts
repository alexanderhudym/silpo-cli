import assert from "node:assert/strict";
import { test } from "node:test";

const {
  expandProbes,
  searchTerms,
  settleTerm,
  readTieBreakSignals,
  matchesSpecification,
  orderedWeight,
  orderedCount,
} = await import("../dist/resolve/products.js");

const CONTEXT = { branchId: "b-1", deliveryType: "SelfPickup", timeslotStart: "t0", timeslotEnd: "t1" };

function product(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "p-1",
    name: "Молоко Яготинське 2,5% 950г",
    slug: "moloko-yagotynske-2-5-950-1234",
    price: 45,
    oldPrice: null,
    stock: 10,
    available: true,
    image: null,
    weighted: false,
    step: 1,
    displayRatio: "950г",
    specialPrices: null,
    companyId: "c-1",
    branchId: "b-1",
    externalProductId: null,
    ...overrides,
  };
}

function candidate(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { product: product(), coordination: 1, position: 0, accounted: true, score: 1, ...overrides };
}

function batchClient(byProbe: Readonly<Record<string, readonly Record<string, unknown>[]>>) {
  const calls: Record<string, unknown>[] = [];

  return {
    calls,
    async findProductsBatch(args: Record<string, unknown>) {
      const probes = args.products as string[];

      calls.push(args);

      return {
        content: "",
        structured: {
          success: true,
          summary: "",
          queries: probes.map((query) => ({
            query,
            totalFound: (byProbe[query] ?? []).length,
            products: byProbe[query] ?? [],
          })),
          meta: { totalQueries: probes.length, totalProducts: 0 },
        },
      };
    },
  };
}

function onlineOrder(productIds: readonly string[]): Record<string, unknown> {
  return {
    orderId: "o-1",
    number: null,
    status: "done",
    createdAt: "2026-01-01T00:00:00+00:00",
    amount: 0,
    discount: 0,
    delivery: null,
    address: null,
    products: productIds.map((id) => ({
      id,
      name: "",
      price: 0,
      quantity: 1,
      subtotal: 0,
      removed: false,
      image: null,
      companyId: "c-1",
      branchId: "b-1",
    })),
  };
}

function offlineOrder(productIds: readonly string[]): Record<string, unknown> {
  return {
    filId: 1,
    filialName: "",
    cityName: "",
    createdAt: "2026-01-01T00:00:00+00:00",
    sumReg: 0,
    accruedBalaBonusesSum: 0,
    sumDiscount: 0,
    receiptUrl: null,
    chequeMagicName: null,
    chequePrediction: null,
    rewards: [],
    products: productIds.map((id) => ({
      lagerId: 1,
      name: "",
      unit: "",
      quantity: 1,
      price: 0,
      image: null,
      catalogProduct: {
        id,
        name: "",
        slug: "",
        price: 0,
        stock: 0,
        available: true,
        image: null,
        weighted: false,
        step: 1,
        companyId: "c-1",
        branchId: "b-1",
      },
    })),
  };
}

test("the full query, its words over two characters, and nothing purely numeric are the probes", () => {
  assert.deepEqual(expandProbes("молоко 950"), ["молоко 950", "молоко"]);
});

test("a query equal to its only word probes once", () => {
  assert.deepEqual(expandProbes("молоко"), ["молоко"]);
});

test("no pair, triple or leave-one-out combination is built", () => {
  const probes = expandProbes("куряче філе охолоджене преміум");

  assert.deepEqual(probes, [
    "куряче філе охолоджене преміум",
    "куряче",
    "філе",
    "охолоджене",
    "преміум",
  ]);
});

test("a typographic apostrophe and an ampersand are normalised out of every probe", () => {
  assert.deepEqual(expandProbes("м’ясо & сир"), ["мясо сир", "мясо", "сир"]);
});

test("a query carrying Latin characters is searched beside its Cyrillic transliteration", () => {
  const probes = expandProbes("lactel");

  assert.deepEqual(probes, ["lactel", "лактел"]);
});

test("a query carrying a letter the transliterator leaves in Latin script is fully transliterated", () => {
  assert.deepEqual(expandProbes("coca cola"), ["coca cola", "coca", "cola", "кока кола"]);
});

test("probes for several terms are batched at the server's limit of 30 per call, issued concurrently", async () => {
  const words = Array.from({ length: 31 }, (_, index) => `слово${index}`);
  const term = words.join(" ");
  const client = batchClient({});

  await searchTerms(client as never, CONTEXT, [term]);

  assert.equal(client.calls.length, 2);
  const sizes = client.calls.map((call) => (call.products as string[]).length).sort((a, b) => a - b);
  assert.deepEqual(sizes, [2, 30]);
  for (const call of client.calls) {
    assert.equal(call.limit, 100);
    assert.equal("offset" in call, false);
  }
});

test("candidates are ordered by coordination, then by the best position across the probes that returned them", async () => {
  const a = product({ id: "p-a", name: "Молоко Яготинське" });
  const b = product({ id: "p-b", name: "Молоко Селянське" });
  const d = product({ id: "p-d", name: "Молоко Простоквашино" });

  const client = batchClient({
    "молоко яготинське": [a],
    "молоко": [b, d, a],
    "яготинське": [a],
  });

  const [result] = await searchTerms(client as never, CONTEXT, ["молоко яготинське"]);

  assert.deepEqual(
    result.candidates.map((entry: { product: { id: string } }) => entry.product.id),
    ["p-a", "p-b", "p-d"],
  );
  assert.equal(result.candidates[0].coordination, 3);
  assert.equal(result.candidates[1].coordination, 1);
  assert.equal(result.candidates[2].coordination, 1);
});

test("a pack size scales the order only within a compatible unit", async () => {
  const kilo = product({ id: "p-kilo", name: "Молоко Яготинське", displayRatio: "1кг" });
  const gram = product({ id: "p-gram", name: "Молоко Яготинське", displayRatio: "500г" });

  const client = batchClient({ "молоко": [kilo], "яготинське": [gram] });

  const [result] = await searchTerms(client as never, CONTEXT, ["молоко яготинське"]);

  assert.deepEqual(
    result.candidates.map((entry: { product: { id: string } }) => entry.product.id),
    ["p-gram", "p-kilo"],
  );
});

test("a count and a volume tied on coordination and position are left in the order the catalogue gave them", async () => {
  const litre = product({ id: "p-litre", name: "Молоко Яготинське", displayRatio: "1л" });
  const pieces = product({ id: "p-pieces", name: "Молоко Яготинське", displayRatio: "5шт" });

  const client = batchClient({ "молоко": [litre], "яготинське": [pieces] });

  const [result] = await searchTerms(client as never, CONTEXT, ["молоко яготинське"]);

  assert.deepEqual(
    result.candidates.map((entry: { product: { id: string } }) => entry.product.id),
    ["p-litre", "p-pieces"],
  );
});

test("a weighted product's displayRatio is not read as a package to compare", async () => {
  const weighed = product({ id: "p-weighed", name: "Молоко Яготинське", weighted: true, displayRatio: "1кг" });
  const packaged = product({ id: "p-packaged", name: "Молоко Яготинське", displayRatio: "500г" });

  const client = batchClient({ "молоко": [weighed], "яготинське": [packaged] });

  const [result] = await searchTerms(client as never, CONTEXT, ["молоко яготинське"]);

  assert.deepEqual(
    result.candidates.map((entry: { product: { id: string } }) => entry.product.id),
    ["p-weighed", "p-packaged"],
  );
});

test("a product the matcher cannot account for is never dropped from the listing", async () => {
  const bread1 = product({ id: "p-bread-1", name: "Хліб білий" });
  const bread2 = product({ id: "p-bread-2", name: "Хліб чорний" });

  const client = batchClient({ "хлеб": [bread1, bread2] });

  const [result] = await searchTerms(client as never, CONTEXT, ["хлеб"]);

  assert.deepEqual(
    result.candidates.map((entry: { product: { id: string } }) => entry.product.id).sort(),
    ["p-bread-1", "p-bread-2"],
  );
});

test("a query written in Russian returning Ukrainian products lists all of them", async () => {
  const milk = product({ id: "p-milk", name: "Молоко Яготинське" });
  const client = batchClient({ "хлеб": [milk] });

  const [result] = await searchTerms(client as never, CONTEXT, ["хлеб"]);

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].product.id, "p-milk");
  assert.equal(result.candidates[0].accounted, false);
});

test("a term whose probe answer stopped short of the server's own count is reported truncated", async () => {
  const found = Array.from({ length: 50 }, (_, index) => product({ id: `p-${index}` }));

  const client = {
    async findProductsBatch(args: Record<string, unknown>) {
      const probes = args.products as string[];

      return {
        content: "",
        structured: {
          success: true,
          summary: "",
          queries: probes.map((query) => ({ query, totalFound: 66, products: found })),
          meta: { totalQueries: probes.length, totalProducts: 0 },
        },
      };
    },
  };

  const [result] = await searchTerms(client as never, CONTEXT, ["кава"]);

  assert.equal(result.truncated, true);
});

test("a term whose probe answer reached the server's own count is not reported truncated", async () => {
  const client = batchClient({ кава: [product({ id: "p-1" })] });

  const [result] = await searchTerms(client as never, CONTEXT, ["кава"]);

  assert.equal(result.truncated, false);
});

test("full coverage with no tie settles automatically on the top candidate", () => {
  const top = candidate({ product: product({ id: "p-1" }), coordination: 2, accounted: true });
  const second = candidate({ product: product({ id: "p-2" }), coordination: 1, accounted: true });

  const settlement = settleTerm([top, second] as never);

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-1");
});

test("a top candidate that does not cover every word of the term asks", () => {
  const top = candidate({ product: product({ id: "p-1" }), coordination: 2, accounted: false });
  const second = candidate({ product: product({ id: "p-2" }), coordination: 1, accounted: true });

  const settlement = settleTerm([top, second] as never);

  assert.equal(settlement.kind, "ask");
});

test("a lone candidate that does not cover the term still asks", () => {
  const only = candidate({ product: product({ id: "p-1" }), coordination: 1, accounted: false });

  assert.equal(settleTerm([only] as never).kind, "ask");
});

test("a tie between two fully covered candidates never asks", () => {
  const first = candidate({ product: product({ id: "p-1" }), coordination: 2, position: 0, accounted: true });
  const second = candidate({ product: product({ id: "p-2" }), coordination: 2, position: 1, accounted: true });

  const settlement = settleTerm([first, second] as never);

  assert.equal(settlement.kind, "auto");
});

test("tie-break step 1: a candidate the caller has bought before is preferred", () => {
  const first = candidate({ product: product({ id: "p-1" }), coordination: 2, position: 0, accounted: true });
  const second = candidate({ product: product({ id: "p-2" }), coordination: 2, position: 1, accounted: true });

  const settlement = settleTerm([first, second] as never, {
    bought: new Set(["p-2"]),
    saved: new Set(["p-1"]),
  });

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-2");
});

test("tie-break step 2: with nothing bought, a candidate the caller has saved is preferred", () => {
  const first = candidate({ product: product({ id: "p-1" }), coordination: 2, position: 0, accounted: true });
  const second = candidate({ product: product({ id: "p-2" }), coordination: 2, position: 1, accounted: true });

  const settlement = settleTerm([first, second] as never, {
    bought: new Set(),
    saved: new Set(["p-2"]),
  });

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-2");
});

test("tie-break step 3: with neither bought nor saved, a candidate the shop is promoting is preferred", () => {
  const first = candidate({ product: product({ id: "p-1" }), coordination: 2, position: 0, accounted: true });
  const second = candidate({
    product: product({ id: "p-2", oldPrice: 60 }),
    coordination: 2,
    position: 1,
    accounted: true,
  });

  const settlement = settleTerm([first, second] as never, { bought: new Set(), saved: new Set() });

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-2");
});

test("a previous price at or below the one it sells at now is not a promotion", () => {
  const first = candidate({ product: product({ id: "p-1" }), coordination: 2, position: 0, accounted: true });
  const second = candidate({
    product: product({ id: "p-2", price: 45, oldPrice: 40 }),
    coordination: 2,
    position: 1,
    accounted: true,
  });

  const settlement = settleTerm([first, second] as never, { bought: new Set(), saved: new Set() });

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-1");
});

test("a promotion carried as a specialPrices entry also settles the tie", () => {
  const first = candidate({ product: product({ id: "p-1" }), coordination: 2, position: 0, accounted: true });
  const second = candidate({
    product: product({ id: "p-2", specialPrices: [{ price: 30, count: 2, type: "count" }] }),
    coordination: 2,
    position: 1,
    accounted: true,
  });

  const settlement = settleTerm([first, second] as never, { bought: new Set(), saved: new Set() });

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-2");
});

test("a promotion does not outrank what the caller has already bought", () => {
  const bought = candidate({ product: product({ id: "p-1" }), coordination: 2, position: 0, accounted: true });
  const promoted = candidate({
    product: product({ id: "p-2", oldPrice: 60 }),
    coordination: 2,
    position: 1,
    accounted: true,
  });

  const settlement = settleTerm([bought, promoted] as never, { bought: new Set(["p-1"]), saved: new Set() });

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-1");
});

test("a discounted candidate that answers only part of the term does not win the tie", () => {
  const full = candidate({ product: product({ id: "p-full" }), coordination: 2, position: 0, accounted: true });
  const partialDiscounted = candidate({
    product: product({ id: "p-partial", oldPrice: 60 }),
    coordination: 2,
    position: 1,
    accounted: false,
  });

  const settlement = settleTerm([full, partialDiscounted] as never);

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-full");
});

test("tie-break step 4: with nothing bought, saved or promoted, the candidate the catalogue put first wins", () => {
  const first = candidate({ product: product({ id: "p-1" }), coordination: 2, position: 0, accounted: true });
  const second = candidate({ product: product({ id: "p-2" }), coordination: 2, position: 1, accounted: true });

  const settlement = settleTerm([first, second] as never, { bought: new Set(), saved: new Set() });

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-1");
});

test("history reads are merged from online orders, offline receipts and saved products", async () => {
  const client = {
    async getMyOnlineOrders() {
      return { content: "", structured: { success: true, summary: "", orders: [onlineOrder(["p-1"])], meta: { limit: 50, offset: 0, total: 1 } } };
    },
    async getMyOfflineOrders() {
      return { content: "", structured: { success: true, summary: "", orders: [offlineOrder(["p-2"])], meta: { limit: 10, offset: 0, total: 1 } } };
    },
    async getMyFavorites() {
      return {
        content: "",
        structured: { success: true, summary: "", products: [product({ id: "p-3" })], meta: { limit: 500, offset: 0, total: 1 } },
      };
    },
  };

  const signals = await readTieBreakSignals(client as never, CONTEXT);

  assert.deepEqual([...signals.bought].sort(), ["p-1", "p-2"]);
  assert.deepEqual([...signals.saved], ["p-3"]);
});

test("a history read that throws leaves the tie-break with empty signals rather than failing", async () => {
  const client = {
    async getMyOnlineOrders() {
      throw new Error("boom");
    },
    async getMyOfflineOrders() {
      throw new Error("boom");
    },
    async getMyFavorites() {
      throw new Error("boom");
    },
  };

  const signals = await readTieBreakSignals(client as never, CONTEXT);

  assert.deepEqual([...signals.bought], []);
  assert.deepEqual([...signals.saved], []);
});

test("a history read that returns nothing leaves the resolution working, ordered by the catalogue", async () => {
  const client = {
    async getMyOnlineOrders() {
      return { content: "", structured: { success: true, summary: "", orders: [], meta: { limit: 50, offset: 0, total: 0 } } };
    },
    async getMyOfflineOrders() {
      return { content: "", structured: { success: true, summary: "", orders: [], meta: { limit: 10, offset: 0, total: 0 } } };
    },
    async getMyFavorites() {
      return { content: "", structured: { success: true, summary: "", products: [], meta: { limit: 500, offset: 0, total: 0 } } };
    },
  };

  const signals = await readTieBreakSignals(client as never, CONTEXT);

  const first = candidate({ product: product({ id: "p-1" }), coordination: 2, position: 0, accounted: true });
  const second = candidate({ product: product({ id: "p-2" }), coordination: 2, position: 1, accounted: true });

  const settlement = settleTerm([first, second] as never, signals);

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-1");
});

function item(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    term: "молоко",
    quantity: 1,
    specification: undefined,
    packCandidate: undefined,
    countCandidate: undefined,
    ...overrides,
  };
}

test("the pack size is read from the payload rather than parsed out of the name", () => {
  const it = item({ packCandidate: { value: 950, unit: "г" } });
  const matched = product({ name: "Молоко Яготинське", displayRatio: "950г" });

  assert.equal(matchesSpecification(it as never, matched as never), true);
});

test("the payload decides even where it disagrees with a size named in the product's own name", () => {
  const it = item({ packCandidate: { value: 950, unit: "г" } });
  const disagreeing = product({ name: "Молоко Яготинське 950г", displayRatio: "500г" });

  assert.equal(matchesSpecification(it as never, disagreeing as never), false);
});

test("the name is the fallback only where the payload states nothing", () => {
  const it = item({ packCandidate: { value: 950, unit: "г" } });
  const noPayloadPack = product({ name: "Яловичина 950г", displayRatio: null });

  assert.equal(matchesSpecification(it as never, noPayloadPack as never), true);
});

test("a weight written beside a weighted product is how much to buy, not a package to match", () => {
  const it = item({ packCandidate: { value: 950, unit: "г" } });
  const weighed = product({ name: "Яловичина 950г", weighted: true, displayRatio: "1кг", step: 0.95 });

  assert.equal(matchesSpecification(it as never, weighed as never), true);
  assert.deepEqual(orderedWeight(it as never, weighed as never), { quantity: 0.95, note: undefined });
});

test("a weight given in kilograms that the step already divides is taken as it stands", () => {
  const it = item({ packCandidate: { value: 0.5, unit: "кг" } });
  const weighed = product({ name: "Куряче філе", weighted: true, displayRatio: "1кг", step: 0.5 });

  assert.deepEqual(orderedWeight(it as never, weighed as never), { quantity: 0.5, note: undefined });
});

test("a weight given in kilograms is raised to the product's own step", () => {
  const it = item({ packCandidate: { value: 0.3, unit: "кг" } });
  const weighed = product({ name: "Куряче філе", weighted: true, displayRatio: "1кг", step: 0.5 });

  assert.deepEqual(orderedWeight(it as never, weighed as never), { quantity: 0.5, note: "raised" });
});

test("a weight a floating-point step already divides is written unchanged, and the note says nothing was raised", () => {
  const it = item({ packCandidate: { value: 1.05, unit: "кг" } });
  const weighed = product({ name: "Ковбаса", weighted: true, displayRatio: "1кг", step: 0.35 });

  assert.deepEqual(orderedWeight(it as never, weighed as never), { quantity: 1.05, note: undefined });
});

test("a weight of zero is a legitimate, unraised amount rather than an absent one", () => {
  const it = item({ packCandidate: { value: 0, unit: "кг" } });
  const weighed = product({ name: "Морква", weighted: true, displayRatio: "1кг", step: 0.2 });

  assert.deepEqual(orderedWeight(it as never, weighed as never), { quantity: 0, note: undefined });
});

test("a weight against a product whose payload states no usable step is chosen rather than raised", () => {
  const it = item({ packCandidate: { value: 300, unit: "г" } });
  const noStep = product({ name: "Куряче філе", weighted: true, displayRatio: "1кг", step: 0 });

  assert.deepEqual(orderedWeight(it as never, noStep as never), { quantity: 1, note: "chosen" });
});

test("a volume beside a weighted product is not a weight, and still fails the pack comparison", () => {
  const it = item({ packCandidate: { value: 500, unit: "мл" } });
  const weighed = product({ name: "Молоко Яготинське", weighted: true, displayRatio: "1кг" });

  assert.equal(orderedWeight(it as never, weighed as never), undefined);
  assert.equal(matchesSpecification(it as never, weighed as never), false);
});

test("a mass beside a packaged product that counts its contents in pieces matches nothing", () => {
  const it = item({ packCandidate: { value: 600, unit: "г" } });
  const carton = product({ name: "Яйця курячі С1 10шт", weighted: false, displayRatio: "10шт" });

  assert.equal(matchesSpecification(it as never, carton as never), false);
});

test("a packaged product still matches on its pack size and orders no weight", () => {
  const it = item({ packCandidate: { value: 950, unit: "г" } });
  const packed = product({ name: "Молоко Яготинське 950г", weighted: false, displayRatio: "950г" });

  assert.equal(orderedWeight(it as never, packed as never), undefined);
  assert.equal(matchesSpecification(it as never, packed as never), true);
});

test("a promotion cannot reach a candidate that answers the term less well than the first", () => {
  const first = candidate({
    product: product({ id: "p-carrot", name: "Морква мита" }),
    coordination: 1,
    position: 0,
    accounted: true,
    score: 0.84,
  });
  const promoted = candidate({
    product: product({ id: "p-puree", name: "Пюре Gerber яблуко-слива-морква 90г", oldPrice: 60 }),
    coordination: 1,
    position: 11,
    accounted: true,
    score: 0.64,
  });

  const settlement = settleTerm([first, promoted] as never, { bought: new Set(), saved: new Set() });

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-carrot");
});

test("neither does a purchase the caller once made", () => {
  const first = candidate({
    product: product({ id: "p-carrot" }),
    coordination: 1,
    position: 0,
    accounted: true,
    score: 0.84,
  });
  const worse = candidate({
    product: product({ id: "p-puree" }),
    coordination: 1,
    position: 11,
    accounted: true,
    score: 0.64,
  });

  const settlement = settleTerm([first, worse] as never, {
    bought: new Set(["p-puree"]),
    saved: new Set(["p-puree"]),
  });

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-carrot");
});

test("a candidate answering the term as well as the first does is still reached", () => {
  const first = candidate({
    product: product({ id: "p-1" }),
    coordination: 1,
    position: 0,
    accounted: true,
    score: 0.5,
  });
  const equal = candidate({
    product: product({ id: "p-2", oldPrice: 60 }),
    coordination: 1,
    position: 1,
    accounted: true,
    score: 0.5,
  });

  const settlement = settleTerm([first, equal] as never, { bought: new Set(), saved: new Set() });

  assert.equal(settlement.kind, "auto");
  assert.equal(settlement.chosen.product.id, "p-2");
});

test("a count matching the product's own pack named the pack, and one of it is bought", () => {
  const it = item({ term: "яйця курячі", countCandidate: 10 });
  const carton = product({ name: "Яйця курячі «Премія»® столові 10шт", weighted: false, displayRatio: "10шт" });

  assert.deepEqual(orderedCount(it as never, carton as never), { quantity: 1, note: undefined });
});

test("a count larger than the pack buys as many packs as cover it, and says the count was covered by packs", () => {
  const it = item({ term: "яйця курячі", countCandidate: 20 });
  const carton = product({ name: "Яйця курячі «Премія»® столові 15шт", weighted: false, displayRatio: "15шт" });

  assert.deepEqual(orderedCount(it as never, carton as never), { quantity: 2, note: "packs" });
});

test("a count the product's pack does not carry is how many to buy", () => {
  const it = item({ term: "авокадо", countCandidate: 2 });
  const single = product({ name: "Авокадо Хасс стиглий шт", weighted: false, displayRatio: "1шт" });

  assert.deepEqual(orderedCount(it as never, single as never), { quantity: 2, note: undefined });
});

test("a count against a product with no pack at all is how many to buy", () => {
  const it = item({ term: "авокадо", countCandidate: 2 });
  const loose = product({ name: "Авокадо", weighted: false, displayRatio: null });

  assert.deepEqual(orderedCount(it as never, loose as never), { quantity: 2, note: undefined });
});

test("a count against a weighted product counts steps, a weighed thing having no pack", () => {
  const it = item({ term: "картопля", countCandidate: 3 });
  const weighed = product({ name: "Картопля Беллароса", weighted: true, displayRatio: "1кг", step: 0.2 });

  assert.deepEqual(orderedCount(it as never, weighed as never), { quantity: 0.6, note: "steps" });
});

test("a count against a weighted product counts steps even where an unrelated volume specification is also named", () => {
  const it = item({ term: "молоко", packCandidate: { value: 0.5, unit: "л" }, countCandidate: 2 });
  const weighed = product({ name: "Молоко розливне", weighted: true, displayRatio: "1кг", step: 0.2 });

  assert.deepEqual(orderedCount(it as never, weighed as never), { quantity: 0.4, note: "steps" });
});

test("a count matching the pack exactly is not stated as covered by packs", () => {
  const it = item({ term: "яйця курячі", countCandidate: 15 });
  const carton = product({ name: "Яйця курячі «Премія»® столові 15шт", weighted: false, displayRatio: "15шт" });

  assert.deepEqual(orderedCount(it as never, carton as never), { quantity: 1, note: undefined });
});

test("a fractional count against a packaged product with no matching pack is raised to a whole one", () => {
  const it = item({ term: "молоко", countCandidate: 1.5 });
  const milk = product({ name: "Молоко Яготинське", weighted: false, displayRatio: "950г" });

  assert.deepEqual(orderedCount(it as never, milk as never), { quantity: 2, note: "raised" });
});

test("an item that wrote no count reads none", () => {
  const carton = product({ displayRatio: "10шт" });

  assert.equal(orderedCount(item() as never, carton as never), undefined);
});
