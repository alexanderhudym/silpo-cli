import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  BRANCH,
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

const CATEGORIES_TOOL = "silpo_get_categories";
const TREE_TOOL = "silpo_get_categories_tree";
const PROMOTIONS_TOOL = "silpo_get_promotions";
const SETS_TOOL = "silpo_get_product_sets";
const POPULAR_TOOL = "silpo_get_popular_categories";
const PRODUCTS_TOOL = "silpo_get_products";
const BATCH_TOOL = "silpo_find_products_batch";
const SIMILAR_TOOL = "silpo_get_similar_products";
const FAVORITES_TOOL = "silpo_get_my_favorites";

const COMPANY = "1ec88c5d-a050-669c-8467-570a157f3e31";

const EMPTY_PROMOTIONS = { success: true, summary: "Found 0 active promotions", promotions: [] };
const EMPTY_SETS = { success: true, summary: "Found 0 product sets", sets: [] };
const EMPTY_POPULAR = { success: true, summary: "Found 0 popular categories", categories: [] };

function flatCategory(slug: string, title: string): Record<string, unknown> {
  return { id: `1edb13c0-69c3-6622-b5d4-${slug}`, slug, title, parentId: null };
}

function categoriesStub(entries: readonly Record<string, unknown>[]): Record<string, unknown> {
  return {
    success: true,
    summary: `Found ${entries.length} categories`,
    categories: entries,
    meta: { limit: 1000, offset: 0, total: entries.length },
  };
}

function treeNode(
  slug: string,
  total: number | undefined,
  children: readonly Record<string, unknown>[] = [],
): Record<string, unknown> {
  return total === undefined ? { slug, children } : { slug, children, total };
}

function treePayload(tree: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { success: true, summary: `Found ${tree.length} top-level categories`, tree };
}

type CategoryEntry = readonly [slug: string, title: string, count?: number];

function catalogStub(
  options: {
    categories?: readonly CategoryEntry[];
    promotions?: readonly Record<string, unknown>[];
    sets?: readonly Record<string, unknown>[];
  } = {},
): Record<string, unknown> {
  const categories = options.categories ?? [["yaitsia-528", "Яйця", 1]];
  const promotions = options.promotions ?? [];
  const sets = options.sets ?? [];

  return {
    [CATEGORIES_TOOL]: categoriesStub(categories.map(([slug, title]) => flatCategory(slug, title))),
    [TREE_TOOL]: treePayload(categories.map(([slug, , count]) => treeNode(slug, count))),
    [PROMOTIONS_TOOL]:
      promotions.length === 0
        ? EMPTY_PROMOTIONS
        : { success: true, summary: `Found ${promotions.length} active promotions`, promotions },
    [SETS_TOOL]: sets.length === 0 ? EMPTY_SETS : { success: true, summary: `Found ${sets.length} product sets`, sets },
    [POPULAR_TOOL]: EMPTY_POPULAR,
  };
}

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

function productsPage(products: readonly Record<string, unknown>[], total = products.length) {
  return {
    success: true,
    summary: `Found ${products.length} products`,
    products,
    meta: { limit: 500, offset: 0, total },
  };
}

function batchResponder(byProbe: Readonly<Record<string, readonly Record<string, unknown>[]>>): Responder {
  return (args) => {
    const probes = args.products as string[];
    const queries = probes.map((probe) => ({
      query: probe,
      totalFound: (byProbe[probe] ?? []).length,
      products: byProbe[probe] ?? [],
    }));

    return {
      success: true,
      summary: `Found products across ${queries.length} search queries`,
      queries,
      meta: { totalQueries: queries.length, totalProducts: 0 },
    };
  };
}

function asked(tool: string, field: string): unknown[] {
  return toolCalls()
    .filter((call) => call.name === tool)
    .map((call) => call.arguments[field]);
}

function idLines(text: string): string[] {
  return text.split("\n").filter((line) => line.startsWith("id: "));
}

before(startDaemon);
after(stopDaemon);

test("with neither a query nor a selector, the command fails before the call, naming the options", async () => {
  clearToolCalls();

  const message = await fails(["products", "find"]);

  assert.match(message, /a query/);
  assert.match(message, /--category/);
  assert.match(message, /--promotion/);
  assert.match(message, /--set/);
  assert.match(message, /--favorites/);
  assert.deepEqual(toolCalls(), []);
});

test("--category resolves a handle directly and forwards filters and sort with no query", async () => {
  setPayloads({ ...catalogStub(), [PRODUCTS_TOOL]: productsPage([product()]) });
  clearToolCalls();

  await run(["products", "find", "--category", "yaitsia-528", "--sort-by", "price", "--must-have-promotion", "true"]);

  assert.deepEqual(asked(PRODUCTS_TOOL, "category"), ["yaitsia-528"]);
  assert.deepEqual(asked(PRODUCTS_TOOL, "sortBy"), ["price"]);
  assert.deepEqual(asked(PRODUCTS_TOOL, "mustHavePromotion"), [true]);
});

test("--category resolves a title to its handle, and the title never reaches the server", async () => {
  setPayloads({ ...catalogStub(), [PRODUCTS_TOOL]: productsPage([product()]) });
  clearToolCalls();

  await run(["products", "find", "--category", "Яйця"]);

  assert.deepEqual(asked(PRODUCTS_TOOL, "category"), ["yaitsia-528"]);
});

test("--category reads only categories: no promotions call and no sets call", async () => {
  setPayloads({ ...catalogStub(), [PRODUCTS_TOOL]: productsPage([product()]) });
  clearToolCalls();

  await run(["products", "find", "--category", "yaitsia-528"]);

  assert.ok(toolCalls().some((call) => call.name === CATEGORIES_TOOL), "the categories were not read");
  assert.deepEqual(toolCalls().filter((call) => call.name === PROMOTIONS_TOOL), []);
  assert.deepEqual(toolCalls().filter((call) => call.name === SETS_TOOL), []);
});

test("a handle two kinds carry reaches the right one through each option", async () => {
  setPayloads({
    ...catalogStub({
      categories: [["shared-handle", "Спільна назва", 5]],
      promotions: [{ code: "shared-handle", title: "Спільна назва", productCount: 5, url: "" }],
    }),
    [PRODUCTS_TOOL]: productsPage([product()]),
  });
  clearToolCalls();

  await run(["products", "find", "--category", "shared-handle"]);
  assert.deepEqual(asked(PRODUCTS_TOOL, "category"), ["shared-handle"]);
  assert.deepEqual(asked(PRODUCTS_TOOL, "promotionCode"), [undefined]);

  clearToolCalls();
  await run(["products", "find", "--promotion", "shared-handle"]);
  assert.deepEqual(asked(PRODUCTS_TOOL, "promotionCode"), ["shared-handle"]);
  assert.deepEqual(asked(PRODUCTS_TOOL, "category"), [undefined]);
});

test("a lone promotion takes a server-side sort", async () => {
  setPayloads({
    ...catalogStub({ promotions: [{ code: "promo-a", title: "Промо А", productCount: 3, url: "" }] }),
    [PRODUCTS_TOOL]: productsPage([product()]),
  });
  clearToolCalls();

  await run(["products", "find", "--promotion", "promo-a", "--sort-by", "price"]);

  assert.deepEqual(asked(PRODUCTS_TOOL, "promotionCode"), ["promo-a"]);
  assert.deepEqual(asked(PRODUCTS_TOOL, "sortBy"), ["price"]);
});

test("a lone set takes a server-side sort", async () => {
  setPayloads({
    ...catalogStub({ sets: [{ slug: "set-a", title: "Набір А", description: null, link: "" }] }),
    [PRODUCTS_TOOL]: productsPage([product()]),
  });
  clearToolCalls();

  await run(["products", "find", "--set", "set-a", "--sort-by", "price"]);

  assert.deepEqual(asked(PRODUCTS_TOOL, "set"), ["set-a"]);
  assert.deepEqual(asked(PRODUCTS_TOOL, "sortBy"), ["price"]);
});

test("--category with a name matching two categories prints both and stops, calling no listing", async () => {
  setPayloads(
    catalogStub({
      categories: [
        ["cat-moloko-a", "Молоко", 3],
        ["cat-moloko-b", "Молоко", 4],
      ],
    }),
  );
  clearToolCalls();

  const { text, code } = await output(["products", "find", "--category", "Молоко"]);

  assert.notEqual(code, 0);
  assert.match(text, /slug: cat-moloko-a\ntitle: Молоко\ncount: 3/);
  assert.match(text, /slug: cat-moloko-b\ntitle: Молоко\ncount: 4/);
  assert.deepEqual(toolCalls().filter((call) => call.name === PRODUCTS_TOOL), []);
});

test("two categories carrying one title under different parents print both candidates with their paths, and the command stops", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesStub([
      flatCategory("parent-a", "Молочні продукти"),
      flatCategory("parent-b", "Кондитерські вироби"),
      flatCategory("figurky-a", "Шоколадні фігурки"),
      flatCategory("figurky-b", "Шоколадні фігурки"),
    ]),
    [TREE_TOOL]: treePayload([
      treeNode("parent-a", 10, [treeNode("figurky-a", 3)]),
      treeNode("parent-b", 10, [treeNode("figurky-b", 4)]),
    ]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });
  clearToolCalls();

  const { text, code } = await output(["products", "find", "--category", "Шоколадні фігурки"]);

  assert.notEqual(code, 0);
  assert.match(text, /slug: figurky-a\ntitle: Шоколадні фігурки\ncount: 3\npath: Молочні продукти/);
  assert.match(text, /slug: figurky-b\ntitle: Шоколадні фігурки\ncount: 4\npath: Кондитерські вироби/);
  assert.deepEqual(toolCalls().filter((call) => call.name === PRODUCTS_TOOL), []);
});

test("--category on a lineage pair where neither end is accounted stops on the same one record the listing kept", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesStub([flatCategory("moloko", "Молоко"), flatCategory("sir", "Сир")]),
    [TREE_TOOL]: treePayload([treeNode("moloko", 5, [treeNode("sir", 2)])]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });
  clearToolCalls();

  const { text, code } = await output(["products", "find", "--category", "молоко сир"]);

  assert.notEqual(code, 0);
  assert.match(text, /slug: sir\ntitle: Сир/);
  assert.ok(!text.includes("slug: moloko"), "the resolution offered the ancestor the listing already dropped");
  assert.deepEqual(toolCalls().filter((call) => call.name === PRODUCTS_TOOL), []);
});

test("--category with a name matching nothing fails, naming the value", async () => {
  setPayloads(catalogStub({ categories: [] }));

  const message = await fails(["products", "find", "--category", "немає-такого"]);

  assert.match(message, /немає-такого/);
});

test("a category the branch stocks nothing under fails, naming the value, with no call made", async () => {
  setPayloads(
    catalogStub({
      categories: [
        ["stocked", "В наявності", 5],
        ["empty-cat", "Порожня", undefined],
      ],
    }),
  );
  clearToolCalls();

  const message = await fails(["products", "find", "--category", "empty-cat"]);

  assert.match(message, /empty-cat/);
  assert.deepEqual(toolCalls().filter((call) => call.name === PRODUCTS_TOOL), []);
});

test("two categories named together union, and the merge removes the duplicate", async () => {
  setPayloads({
    ...catalogStub({
      categories: [
        ["cat-a", "Категорія А", 2],
        ["cat-b", "Категорія Б", 2],
      ],
    }),
    [PRODUCTS_TOOL]: [
      productsPage([product({ id: "p1", slug: "p1" }), product({ id: "shared", slug: "shared" })]),
      productsPage([product({ id: "shared", slug: "shared" }), product({ id: "p2", slug: "p2" })]),
    ],
  });
  clearToolCalls();

  const text = await run(["products", "find", "--category", "cat-a", "--category", "cat-b"]);

  assert.ok(text.includes("id: p1"), text);
  assert.ok(text.includes("id: p2"), text);
  assert.equal(text.split("id: shared").length - 1, 1, "the shared product was printed more than once");
  assert.equal(toolCalls().filter((call) => call.name === PRODUCTS_TOOL).length, 2);
});

test("a category named together with its own child reads the parent once and does not also fetch the child", async () => {
  setPayloads({
    ...catalogStub(),
    [CATEGORIES_TOOL]: categoriesStub([flatCategory("parent", "Батько"), flatCategory("child", "Дитина")]),
    [TREE_TOOL]: treePayload([treeNode("parent", 10, [treeNode("child", 4)])]),
    [PRODUCTS_TOOL]: productsPage([product()]),
  });
  clearToolCalls();

  await run(["products", "find", "--category", "parent", "--category", "child"]);

  assert.deepEqual(asked(PRODUCTS_TOOL, "category"), ["parent"]);
});

test("a category and a promotion intersecting lists only the products in both", async () => {
  setPayloads({
    ...catalogStub({
      categories: [["cat-a", "Категорія А", 5]],
      promotions: [{ code: "promo-a", title: "Промо А", productCount: 5, url: "" }],
    }),
    [PRODUCTS_TOOL]: (args: Record<string, unknown>) =>
      args.category !== undefined
        ? productsPage([product({ id: "shared", slug: "shared" }), product({ id: "cat-only", slug: "cat-only" })])
        : productsPage([product({ id: "shared", slug: "shared" }), product({ id: "promo-only", slug: "promo-only" })]),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--category", "cat-a", "--promotion", "promo-a"]);

  assert.ok(text.includes("id: shared"), text);
  assert.ok(!text.includes("id: cat-only"), text);
  assert.ok(!text.includes("id: promo-only"), text);
});

test("a sort cannot be honoured over a union", async () => {
  setPayloads(
    catalogStub({
      categories: [
        ["cat-a", "Категорія А", 2],
        ["cat-b", "Категорія Б", 2],
      ],
    }),
  );

  const message = await fails(["products", "find", "--category", "cat-a", "--category", "cat-b", "--sort-by", "price"]);

  assert.match(message, /--sort-by/);
});

test("a sort conflicts with a query", async () => {
  setPayloads(catalogStub({ categories: [["cat-a", "Категорія А", 2]] }));

  const message = await fails(["products", "find", "--category", "cat-a", "--sort-by", "price", "молоко"]);

  assert.match(message, /--sort-by/);
});

test("a sort over the saved products is refused", async () => {
  const message = await fails(["products", "find", "--favorites", "--sort-by", "price"]);
  assert.match(message, /--sort-by/);
});

test("saved products intersect with a category", async () => {
  setPayloads({
    ...catalogStub({ categories: [["cat-a", "Категорія А", 2]] }),
    [FAVORITES_TOOL]: productsPage([product({ id: "fav-shared", slug: "fav-shared" }), product({ id: "fav-only", slug: "fav-only" })]),
    [PRODUCTS_TOOL]: productsPage([product({ id: "fav-shared", slug: "fav-shared" }), product({ id: "scope-only", slug: "scope-only" })]),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--favorites", "--category", "cat-a"]);

  assert.ok(text.includes("id: fav-shared"), text);
  assert.ok(!text.includes("id: fav-only"), text);
  assert.ok(!text.includes("id: scope-only"), text);
});

test("an intersection with a truncated side says so", async () => {
  const bigFavorites = Array.from({ length: 500 }, (_, index) =>
    product({ id: `fav-${index}`, slug: `fav-${index}`, name: `Товар ${index}` }),
  );

  setPayloads({
    ...catalogStub({ categories: [["cat-a", "Категорія А", 2]] }),
    [FAVORITES_TOOL]: productsPage(bigFavorites, 1000),
    [PRODUCTS_TOOL]: productsPage([product({ id: "fav-0", slug: "fav-0" })]),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--favorites", "--category", "cat-a"]);

  assert.match(text, /subset/);
});

test("a query orders a chosen population without a further call", async () => {
  const name = "Молоко Яготинське пастеризоване 2,5% 950г";

  setPayloads({
    ...catalogStub({ categories: [["cat-a", "Категорія А", 2]] }),
    [PRODUCTS_TOOL]: productsPage([
      product({ id: "target", slug: "target", name }),
      product({ id: "other", slug: "other", name: "Хліб Український подовий 500г" }),
    ]),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--category", "cat-a", name]);

  const lines = idLines(text);
  assert.equal(lines[0], "id: target");
  assert.equal(toolCalls().filter((call) => call.name === PRODUCTS_TOOL).length, 1);
});

test("an unavailable decisive top match brings its alternatives, marked as such", async () => {
  const name = "Молоко Яготинське пастеризоване 2,5% 950г";

  setPayloads({
    ...catalogStub({ categories: [["cat-a", "Категорія А", 2]] }),
    [PRODUCTS_TOOL]: productsPage([product({ id: "target", slug: "target-slug", name, available: false, stock: 0 })]),
    [SIMILAR_TOOL]: productsPage([product({ id: "alt-1", slug: "alt-1", name: "Замінник" })]),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--category", "cat-a", name]);

  assert.deepEqual(asked(SIMILAR_TOOL, "slug"), ["target-slug"]);
  assert.match(text, /id: alt-1[\s\S]*alternativeTo: target-slug/);
});

test("a decisive top match kept off the printed page entirely fetches no alternatives for it", async () => {
  const name = "Молоко Яготинське пастеризоване 2,5% 950г";

  setPayloads({
    ...catalogStub({ categories: [["cat-a", "Категорія А", 1]] }),
    [PRODUCTS_TOOL]: productsPage([product({ id: "target", slug: "target-slug", name, available: false, stock: 0 })]),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--category", "cat-a", "--limit", "0", "молоко"]);

  assert.deepEqual(toolCalls().filter((call) => call.name === SIMILAR_TOOL), []);
  assert.ok(!text.includes("alternativeTo"), text);
  assert.ok(!text.includes("id: target"), text);
});

test("the decisive top of a query is on the page whatever the page size, and its alternatives are fetched", async () => {
  const name = "Молоко Яготинське пастеризоване 2,5% 950г";

  setPayloads({
    ...catalogStub({ categories: [["cat-a", "Категорія А", 2]] }),
    [PRODUCTS_TOOL]: productsPage([
      product({ id: "target", slug: "target-slug", name, available: false, stock: 0 }),
      product({ id: "other", slug: "other", name: "Хліб Український подовий 500г", available: true, stock: 5 }),
    ]),
    [SIMILAR_TOOL]: productsPage([product({ id: "alt-1", slug: "alt-1", name: "Замінник" })]),
  });
  clearToolCalls();

  const text = await run(["products", "find", "--category", "cat-a", "--limit", "1", name]);

  assert.equal(toolCalls().filter((call) => call.name === SIMILAR_TOOL).length, 1);
  assert.ok(text.includes("id: target"), text);
});

test("an available decisive top match fetches no alternatives", async () => {
  const name = "Молоко Яготинське пастеризоване 2,5% 950г";

  setPayloads({
    ...catalogStub({ categories: [["cat-a", "Категорія А", 2]] }),
    [PRODUCTS_TOOL]: productsPage([product({ id: "target", slug: "target-slug", name, available: true, stock: 5 })]),
  });
  clearToolCalls();

  await run(["products", "find", "--category", "cat-a", name]);

  assert.deepEqual(toolCalls().filter((call) => call.name === SIMILAR_TOOL), []);
});

test("a page size of ten over three queries answers each of them, not just the first", async () => {
  function group(word: string, count: number) {
    return Array.from({ length: count }, (_, index) =>
      product({ id: `${word}-${index}`, slug: `${word}-${index}`, name: `Товар ${word} номер ${index}` }),
    );
  }

  setPayloads({
    [BATCH_TOOL]: batchResponder({
      молоко: group("молоко", 5),
      хліб: group("хліб", 5),
      сир: group("сир", 5),
    }),
  });

  const text = await run(["products", "find", "молоко", "хліб", "сир", "--limit", "10"]);

  assert.equal(idLines(text).length, 15);

  for (const word of ["молоко", "хліб", "сир"]) {
    assert.equal(idLines(text).filter((line) => line.includes(word)).length, 5, word);
  }
});

test("a page size under what a query found bounds that query alone, and every query is answered", async () => {
  function group(word: string, count: number) {
    return Array.from({ length: count }, (_, index) =>
      product({ id: `${word}-${index}`, slug: `${word}-${index}`, name: `Товар ${word} номер ${index}` }),
    );
  }

  setPayloads({
    [BATCH_TOOL]: batchResponder({
      молоко: group("молоко", 9),
      хліб: group("хліб", 9),
      сир: group("сир", 9),
    }),
  });

  const text = await run(["products", "find", "молоко", "хліб", "сир", "--limit", "2"]);

  assert.equal(idLines(text).length, 6);

  for (const word of ["молоко", "хліб", "сир"]) {
    assert.equal(idLines(text).filter((line) => line.includes(word)).length, 2, word);
  }
});

test("a ranked reading is not capped by the caller's page size, so the best match still surfaces", async () => {
  const name = "Молоко Яготинське";

  const noise = Array.from({ length: 9 }, (_, index) =>
    product({ id: `noise-${index}`, slug: `noise-${index}`, name: `Зовсім інший товар без збігів ${index}` }),
  );
  const target = product({ id: "target", slug: "target", name });

  setPayloads({
    [BATCH_TOOL]: batchResponder({
      "Молоко Яготинське": [...noise, target],
      Молоко: [target],
      Яготинське: [target],
    }),
  });
  clearToolCalls();

  const text = await run(["products", "find", name, "--limit", "1"]);

  assert.deepEqual(idLines(text), ["id: target"]);
});

test("one product matched by two queries prints once, naming both", async () => {
  const shared = product({ id: "shared", slug: "shared", name: "Молоко Яготинське пастеризоване 2,5% 950г" });

  setPayloads({
    [BATCH_TOOL]: batchResponder({ молоко: [shared], яготинське: [shared] }),
  });

  const text = await run(["products", "find", "молоко", "яготинське"]);

  assert.equal(idLines(text).length, 1);
  assert.match(text, /queries: молоко, яготинське/);
});

test("a pack size scales the order only within a compatible unit", async () => {
  const name = "Молоко Яготинське";
  const kilo = product({ id: "kilo", slug: "kilo", name, displayRatio: "1кг" });
  const gram = product({ id: "gram", slug: "gram", name, displayRatio: "500г" });

  setPayloads({ [BATCH_TOOL]: batchResponder({ Молоко: [kilo], Яготинське: [gram] }) });

  const text = await run(["products", "find", name]);

  assert.deepEqual(idLines(text), ["id: gram", "id: kilo"]);
});

test("a count and a volume tied on coordination and position are left in the catalogue's own order", async () => {
  const name = "Молоко Яготинське";
  const litre = product({ id: "litre", slug: "litre", name, displayRatio: "1л" });
  const pieces = product({ id: "pieces", slug: "pieces", name, displayRatio: "5шт" });

  setPayloads({ [BATCH_TOOL]: batchResponder({ Молоко: [litre], Яготинське: [pieces] }) });

  const text = await run(["products", "find", name]);

  assert.deepEqual(idLines(text), ["id: litre", "id: pieces"]);
});

test("a promotion is printed on its record and does not move it above the other in the listing's order", async () => {
  const term = "молоко";
  const first = product({ id: "first", slug: "first", name: "Молоко Перше" });
  const promoted = product({ id: "second", slug: "second", name: "Молоко Друге", oldPrice: 60, price: 45 });

  setPayloads({ [BATCH_TOOL]: batchResponder({ [term]: [first, promoted] }) });

  const text = await run(["products", "find", term]);

  assert.deepEqual(idLines(text), ["id: first", "id: second"]);
});

test("a single query names none", async () => {
  setPayloads({
    [BATCH_TOOL]: batchResponder({ молоко: [product({ id: "a", slug: "a" })] }),
  });

  const text = await run(["products", "find", "молоко"]);

  assert.ok(!text.includes("queries:"), text);
});

test("a query that matched nothing is accounted for in the summary", async () => {
  const molokoName = "Молоко Яготинське пастеризоване 2,5% 950г";

  setPayloads({
    [BATCH_TOOL]: batchResponder({
      [molokoName]: [product({ id: "a", slug: "a", name: molokoName })],
      Молоко: [product({ id: "a", slug: "a", name: molokoName })],
      Яготинське: [product({ id: "a", slug: "a", name: molokoName })],
      пастеризоване: [product({ id: "a", slug: "a", name: molokoName })],
      "950г": [product({ id: "a", slug: "a", name: molokoName })],
      апельсини: [],
    }),
  });

  const text = await run(["products", "find", molokoName, "апельсини"]);

  assert.match(text, /апельсини \(found 0\)/);
});

test("a probe answer capped below the server's own count is reported as truncated", async () => {
  const found = Array.from({ length: 50 }, (_, index) => product({ id: `p-${index}`, slug: `p-${index}` }));

  setPayloads({
    [BATCH_TOOL]: ((args: Record<string, unknown>) => {
      const probes = args.products as string[];

      return {
        success: true,
        summary: `Found products across ${probes.length} search queries`,
        queries: probes.map((query) => ({ query, totalFound: 66, products: found })),
        meta: { totalQueries: probes.length, totalProducts: 0 },
      };
    }) as Responder,
  });
  clearToolCalls();

  const text = await run(["products", "find", "кава"]);

  assert.match(text, /stopped after reading 100 records of at least one query/);
});

test("a probe answer that reached the server's own count is not reported as truncated", async () => {
  setPayloads({
    [BATCH_TOOL]: batchResponder({ кава: [product({ id: "p-1", slug: "p-1" })] }),
  });
  clearToolCalls();

  const text = await run(["products", "find", "кава"]);

  assert.ok(!text.includes("stopped after reading"), text);
});

test("--favorites lists the saved products", async () => {
  setPayloads({ [FAVORITES_TOOL]: productsPage([product({ id: "fav-1", slug: "fav-1" })]) });

  const text = await run(["products", "find", "--favorites"]);

  assert.ok(text.includes("id: fav-1"), text);
});

test("a query in Russian reaches Ukrainian products returned by the server, and lists them", async () => {
  const name = "Сир кисломолочний Яготинський 5% 350г";
  const curd = product({ id: "curd-yagotynskyi", slug: "curd-yagotynskyi", name });

  setPayloads({ [BATCH_TOOL]: batchResponder({ творог: [curd] }) });

  const text = await run(["products", "find", "творог"]);

  assert.ok(text.includes("id: curd-yagotynskyi"), text);
});

test("--to-price narrows a bare-query search over what the server returned", async () => {
  const cheap = product({ id: "cheap", slug: "cheap", price: 10 });
  const expensive = product({ id: "expensive", slug: "expensive", price: 100 });

  setPayloads({ [BATCH_TOOL]: batchResponder({ молоко: [cheap, expensive] }) });

  const text = await run(["products", "find", "--to-price", "20", "молоко"]);

  assert.ok(text.includes("id: cheap"), text);
  assert.ok(!text.includes("id: expensive"), text);
});

test("an external product id is printed from the numeric tail of the slug when the payload carries no id of its own", async () => {
  setPayloads({
    [BATCH_TOOL]: batchResponder({
      молоко: [product({ id: "p-1", slug: "moloko-yagotynske-864122", externalProductId: null })],
    }),
  });

  const text = await run(["products", "find", "молоко"]);

  assert.match(text, /externalId: 864122/);
});

test("every handle the payload carries is printed, each on its own line", async () => {
  setPayloads({
    [BATCH_TOOL]: batchResponder({
      молоко: [product({ id: "p-1", slug: "moloko-864122", externalProductId: 864122 })],
    }),
  });

  const text = await run(["products", "find", "молоко"]);

  assert.match(text, /id: p-1/);
  assert.match(text, /slug: moloko-864122/);
  assert.match(text, /externalId: 864122/);
});

test("a selector's residue fills only what the queries left", async () => {
  setPayloads({
    ...catalogStub({ categories: [["cat-a", "Категорія А", 3]] }),
    [PRODUCTS_TOOL]: productsPage([
      product({ id: "matched", slug: "matched", name: "Молоко Яготинське 2,5% 950г" }),
      product({ id: "rest-1", slug: "rest-1", name: "Хліб Український подовий 500г" }),
      product({ id: "rest-2", slug: "rest-2", name: "Сир Пирятин твердий 50%" }),
    ]),
  });

  const answered = await run(["products", "find", "--category", "cat-a", "--limit", "1", "молоко"]);

  assert.deepEqual(idLines(answered).length, 1);
  assert.ok(answered.includes("id: matched"), answered);

  const roomy = await run(["products", "find", "--category", "cat-a", "--limit", "3", "молоко"]);

  assert.deepEqual(idLines(roomy).length, 3);
});

test("a query matching past its own allowance is still named on the record another query placed", async () => {
  const shared = product({ id: "shared", slug: "shared", name: "Молоко Яготинське пастеризоване 950г" });
  const other = product({ id: "other", slug: "other", name: "Яготинське масло 82%" });

  setPayloads({
    [BATCH_TOOL]: batchResponder({ молоко: [shared], яготинське: [other, shared] }),
  });

  const text = await run(["products", "find", "молоко", "яготинське", "--limit", "1"]);

  assert.ok(text.includes("id: shared"), text);
  assert.match(text, /queries:.*молоко/);
  assert.match(text, /queries:.*яготинське/);
});
