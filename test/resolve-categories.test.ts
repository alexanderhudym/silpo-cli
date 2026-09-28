import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { setPayloads, startDaemon, stopDaemon } from "./harness.ts";

const { buildCategoryTable, rankCategories, categoryMatcher, pruneCategoryLineage, readCategoryTable } =
  await import("../dist/resolve/categories.js");

const CATEGORIES_TOOL = "silpo_get_categories";
const TREE_TOOL = "silpo_get_categories_tree";
const POPULAR_TOOL = "silpo_get_popular_categories";

const EMPTY_CATEGORIES = {
  success: true,
  summary: "Found 0 categories",
  categories: [],
  meta: { limit: 1000, offset: 0, total: 0 },
};
const EMPTY_TREE = { success: true, summary: "Found 0 top-level categories", tree: [] };

before(startDaemon);
after(stopDaemon);

function categoryTable(records: readonly Record<string, unknown>[]): Record<string, unknown> {
  const bySlug = new Map(records.map((record) => [record.slug, record] as const));
  const byIdentifier = new Map(
    records
      .filter((record) => record.identifier !== undefined)
      .map((record) => [record.identifier, record] as const),
  );

  return {
    records,
    roots: records.filter((record) => record.parent === undefined),
    bySlug,
    byIdentifier,
    byParent: new Map(),
    droppedCount: 0,
    uncounted: false,
    popularJoined: 0,
  };
}

function category(fields: {
  slug: string;
  title?: string;
  identifier?: string;
  parent?: string;
  path?: readonly { slug: string; title: string | undefined }[];
}): Record<string, unknown> {
  const path = fields.path ?? [];

  return {
    identifier: fields.identifier,
    slug: fields.slug,
    title: fields.title,
    parent: fields.parent,
    depth: path.length,
    count: 1,
    path,
    popular: false,
  };
}

test("the count comes from the hierarchy and is joined to the flat listing's title by slug", () => {
  const tree = [{ slug: "frukty", children: [], total: 42 }];
  const flat = [{ id: "id-frukty", slug: "frukty", title: "Фрукти", parentId: null }];

  const table = buildCategoryTable(flat, tree, []);

  assert.equal(table.bySlug.get("frukty").count, 42);
  assert.equal(table.bySlug.get("frukty").title, "Фрукти");
  assert.equal(table.bySlug.get("frukty").identifier, "id-frukty");
});

test("a hierarchy node the flat listing lacks keeps its place, its count and its subtree, without a title", () => {
  const tree = [
    {
      slug: "counted",
      children: [],
      total: 5,
    },
    {
      slug: "stale-tile",
      children: [{ slug: "child-of-stale", children: [], total: 1 }],
      total: 2,
    },
  ];
  const flat = [
    { id: "id-counted", slug: "counted", title: "Порахована", parentId: null },
    { id: "id-child", slug: "child-of-stale", title: "Дитина", parentId: null },
  ];

  const table = buildCategoryTable(flat, tree, []);

  const staleTile = table.bySlug.get("stale-tile");
  assert.ok(staleTile !== undefined, "the node itself was dropped rather than kept");
  assert.equal(staleTile.title, undefined);
  assert.equal(staleTile.count, 2);

  const child = table.bySlug.get("child-of-stale");
  assert.ok(child !== undefined, "the child of an unlisted node was orphaned");
  assert.equal(child.parent, "stale-tile");
});

test("a category the hierarchy reports no count for is dropped with its subtree, and the drop is counted", () => {
  const tree = [
    { slug: "kept", children: [], total: 3 },
    {
      slug: "empty",
      children: [{ slug: "empty-child", children: [], total: 4 }],
    },
  ];
  const flat = [
    { id: "id-kept", slug: "kept", title: "Є", parentId: null },
    { id: "id-empty", slug: "empty", title: "Пусто", parentId: null },
    { id: "id-empty-child", slug: "empty-child", title: "Дитина пусто", parentId: null },
  ];

  const table = buildCategoryTable(flat, tree, []);

  assert.equal(table.uncounted, false);
  assert.equal(table.bySlug.has("empty"), false);
  assert.equal(table.bySlug.has("empty-child"), false, "the subtree of a dropped category was not dropped with it");
  assert.equal(table.droppedCount, 2);
  assert.ok(table.bySlug.has("kept"));
});

test("where no category anywhere carries a count, nothing is dropped and the table is marked uncounted", () => {
  const tree = [{ slug: "a", children: [{ slug: "b", children: [] }] }];
  const flat = [
    { id: "id-a", slug: "a", title: "А", parentId: null },
    { id: "id-b", slug: "b", title: "Б", parentId: null },
  ];

  const table = buildCategoryTable(flat, tree, []);

  assert.equal(table.uncounted, true);
  assert.equal(table.droppedCount, 0);
  assert.equal(table.records.length, 2);
});

test("the popular join marks a category it joins and drops a row that joins nothing, counting only the join", () => {
  const tree = [
    { slug: "a", children: [], total: 1 },
    { slug: "b", children: [], total: 1 },
  ];
  const flat = [
    { id: "id-a", slug: "a", title: "А", parentId: null },
    { id: "id-b", slug: "b", title: "Б", parentId: null },
  ];
  const popular = [
    { id: "p1", slug: "a", title: "А", url: "" },
    { id: "p2", slug: "not-in-branch", title: "Ще щось", url: "" },
  ];

  const table = buildCategoryTable(flat, tree, popular);

  assert.equal(table.popularJoined, 1);
  assert.equal(table.bySlug.get("a").popular, true);
  assert.equal(table.bySlug.get("b").popular, false);
});

test("the popular join carries the popular listing's own order as a rank, not the tree's walk order", () => {
  const tree = [
    { slug: "b", children: [], total: 1 },
    { slug: "a", children: [], total: 1 },
  ];
  const flat = [
    { id: "id-b", slug: "b", title: "Б", parentId: null },
    { id: "id-a", slug: "a", title: "А", parentId: null },
  ];
  const popular = [
    { id: "p1", slug: "a", title: "А", url: "" },
    { id: "p2", slug: "b", title: "Б", url: "" },
  ];

  const table = buildCategoryTable(flat, tree, popular);

  assert.equal(table.bySlug.get("a").popularRank, 0);
  assert.equal(table.bySlug.get("b").popularRank, 1);
});

test("a category is matched by title, by slug and by identifier", () => {
  const table = categoryTable([category({ slug: "yaitsia-528", title: "Яйця", identifier: "id-528" })]);

  const byTitle = rankCategories(table, "Яйця");
  assert.equal(byTitle.length, 1);
  assert.equal(byTitle[0].record.slug, "yaitsia-528");

  const bySlug = rankCategories(table, "yaitsia-528");
  assert.equal(bySlug.length, 1);
  assert.equal(bySlug[0].record.slug, "yaitsia-528");

  const byIdentifier = rankCategories(table, "id-528");
  assert.equal(byIdentifier.length, 1);
  assert.equal(byIdentifier[0].record.slug, "yaitsia-528");
});

test("the deepest match wins: a category ranked with its own descendant loses to it", () => {
  const parent = category({ slug: "vyno", title: "Вино" });
  const child = category({
    slug: "vyno-bile",
    title: "Вино біле",
    parent: "vyno",
    path: [{ slug: "vyno", title: "Вино" }],
  });
  const table = categoryTable([parent, child]);

  const ranked = rankCategories(table, "вино");

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].record.slug, "vyno-bile");
});

test("a fully-matching ancestor is not pruned away by a weak fragment match beneath it", () => {
  const parent = category({ slug: "kyslomolochni-napoi-4983", title: "Кисломолочні напої" });
  const child = category({
    slug: "napoi-na-syrovattsi-4985",
    title: "Напої на сироватці",
    parent: "kyslomolochni-napoi-4983",
    path: [{ slug: "kyslomolochni-napoi-4983", title: "Кисломолочні напої" }],
  });
  const sibling = category({
    slug: "kyslomolochni-napoi-dlia-ditei-4996",
    title: "Кисломолочні напої для дітей",
    parent: "dytiache-4990",
    path: [{ slug: "dytiache-4990", title: "Дитяче" }],
  });
  const table = categoryTable([parent, child, sibling]);

  const ranked = rankCategories(table, "Кисломолочні напої");
  const slugs = ranked.map((candidate: { record: Record<string, unknown> }) => candidate.record.slug);

  assert.ok(slugs.includes("kyslomolochni-napoi-4983"), "the exact title's own category was pruned away");
});

test("a hyphenated value naming no category matches nothing", () => {
  const table = categoryTable([category({ slug: "pet-nat-pet-nat-4518", title: "Пет-Нат (Pet-Nat)" })]);

  const ranked = rankCategories(table, "granat-4794");

  assert.equal(ranked.length, 0);
});

test("a hyphenated Latin value approximating a real title matches it", () => {
  const table = categoryTable([
    category({ slug: "kyslomolochna-produktsiia-9001", title: "Кисломолочна продукція" }),
  ]);

  const ranked = rankCategories(table, "kyslomolochna-produktsiia");

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].record.slug, "kyslomolochna-produktsiia-9001");
});

test("a word many titles share matches every title that carries it", () => {
  const table = categoryTable([
    category({ slug: "molochna-produktsiia", title: "Молочна продукція" }),
    category({ slug: "kyslomolochna-produktsiia", title: "Кисломолочна продукція" }),
  ]);

  const ranked = rankCategories(table, "продукція");
  const slugs = ranked.map((candidate: { record: Record<string, unknown> }) => candidate.record.slug);

  assert.ok(slugs.includes("molochna-produktsiia"));
  assert.ok(slugs.includes("kyslomolochna-produktsiia"));
});

test("a shortened word still reaches the category it names approximately", () => {
  const table = categoryTable([
    category({ slug: "molochna-produktsiia", title: "Молочна продукція" }),
    category({ slug: "kyslomolochna-produktsiia", title: "Кисломолочна продукція" }),
  ]);

  const ranked = rankCategories(table, "Молочна");

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].record.slug, "molochna-produktsiia");
});

test("a value sharing a character fragment but no word with a title matches nothing", () => {
  const table = categoryTable([category({ slug: "pet-nat-pet-nat-4518", title: "Пет-Нат (Pet-Nat)" })]);

  const direct = categoryMatcher(table.records).search("гранат");
  assert.equal(direct.length, 0, "the fragment 'нат' inside 'Нат' produced a candidate");

  const ranked = rankCategories(table, "гранат");
  assert.equal(ranked.length, 0);
});

test("a one-record table returns its record for a value that names it", () => {
  const table = categoryTable([category({ slug: "yaitsia-528", title: "Яйця" })]);

  const ranked = rankCategories(table, "Яйця");

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].record.slug, "yaitsia-528");
});

function filler(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, index) =>
    category({ slug: `filler-${index}`, title: `Наповнювач ${index}` }),
  );
}

test("the same values reach the same outcomes against a table of seventeen and a table of several hundred", () => {
  const target = category({ slug: "yaitsia-528", title: "Яйця" });
  const small = categoryTable([target, ...filler(16)]);
  const large = categoryTable([target, ...filler(300)]);

  for (const table of [small, large]) {
    const found = rankCategories(table, "Яйця");
    assert.equal(found.length, 1);
    assert.equal(found[0].record.slug, "yaitsia-528");

    const missing = rankCategories(table, "нікогонема");
    assert.equal(missing.length, 0);
  }
});

test("a table growing by records the value does not name does not change the outcome", () => {
  const target = category({ slug: "yaitsia-528", title: "Яйця" });
  const before = rankCategories(categoryTable([target]), "Яйця");
  const after = rankCategories(categoryTable([target, ...filler(50)]), "Яйця");

  assert.equal(before.length, 1);
  assert.equal(after.length, 1);
  assert.equal(before[0].record.slug, after[0].record.slug);
});

test("an exact handle is answered by the probe, before the matcher is ever asked", () => {
  const table = categoryTable([category({ slug: "ryba-4430", title: "Риба" })]);

  const ranked = rankCategories(table, "ryba-4430");
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].record.slug, "ryba-4430");
  assert.equal(ranked[0].accounted, true);

  const withoutTheProbe = categoryMatcher(table.records).search("ryba-4430");
  assert.ok(
    withoutTheProbe.length === 0 || withoutTheProbe.some((candidate) => !candidate.accounted),
    "the matcher alone settled the numeric tail the same way the probe does, so the probe is not load-bearing here",
  );
});

test("a two-word value matched on one word is not fully accounted for", () => {
  const table = categoryTable([category({ slug: "shkarpetky-100", title: "Шкарпетки" })]);

  const ranked = rankCategories(table, "дитячі шкарпетки");

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].record.slug, "shkarpetky-100");
  assert.equal(ranked[0].accounted, false);
});

test("a lineage pair where neither end is accounted still collapses to one record", () => {
  const moloko = category({ slug: "moloko", title: "Молоко" });
  const sir = category({
    slug: "sir",
    title: "Сир",
    parent: "moloko",
    path: [{ slug: "moloko", title: "Молоко" }],
  });
  const table = categoryTable([moloko, sir]);

  const ranked = rankCategories(table, "молоко сир");
  assert.deepEqual(
    ranked.map((candidate: { record: Record<string, unknown> }) => candidate.record.slug),
    ["sir"],
  );
});

test("a one-character and a two-character text reach every record whose title begins with them", () => {
  const table = categoryTable([
    category({ slug: "ryba-100", title: "Риба" }),
    category({ slug: "rys-200", title: "Рис" }),
  ]);

  const oneChar = categoryMatcher(table.records).search("р");
  assert.equal(oneChar.length, 2, "a query below the rejected four-character minimum reached no candidate");

  const twoChar = categoryMatcher(table.records).search("ри");
  assert.equal(twoChar.length, 2, "a query below the rejected four-character minimum reached no candidate");

  const ranked = rankCategories(table, "ри");
  assert.equal(ranked.length, 2, "a short word many records carry was chosen rather than offered");
});

test("a genuine tie between two unrelated categories keeps both even where one of them has a matched descendant", () => {
  const chaiRoot = category({ slug: "chai-4001", title: "Чай" });
  const chaiChild = category({
    slug: "chai-zelenyi-4002",
    title: "Чай зелений байховий листовий крупнолистовий преміум",
    parent: "chai-4001",
    path: [{ slug: "chai-4001", title: "Чай" }],
  });
  const chaiOther = category({ slug: "chai-9001", title: "Чай" });

  const candidates = [
    { record: chaiRoot, score: 0.242, accounted: true },
    { record: chaiOther, score: 0.242, accounted: true },
    { record: chaiChild, score: 0.157, accounted: true },
  ];

  const pruned = pruneCategoryLineage(candidates);
  const prunedSlugs = pruned.map((candidate: { record: Record<string, unknown> }) => candidate.record.slug);
  assert.deepEqual(
    [...prunedSlugs].sort(),
    ["chai-9001", "chai-zelenyi-4002"],
    "the tied ancestor must not vanish from the field, and its subtree must not print twice",
  );
});

test("a weak descendant does not displace a fully-matching ancestor even once the family's score is carried forward", () => {
  const ancestor = category({ slug: "kyslomolochni-napoi-4983", title: "Кисломолочні напої" });
  const descendant = category({
    slug: "napoi-na-syrovattsi-4985",
    title: "Напої на сироватці",
    parent: "kyslomolochni-napoi-4983",
    path: [{ slug: "kyslomolochni-napoi-4983", title: "Кисломолочні напої" }],
  });

  const candidates = [
    { record: descendant, score: 12, accounted: false },
    { record: ancestor, score: 8, accounted: true },
  ];

  const pruned = pruneCategoryLineage(candidates);
  assert.equal(pruned.length, 1);
  assert.equal(pruned[0].record.slug, "kyslomolochni-napoi-4983");
  assert.equal(pruned[0].score, 12, "the family's own best score was not carried to its winner");
});

test("a three-level subtree collapses to its one deepest winner however the scores are ordered along the chain", () => {
  const root = category({ slug: "voda-ta-napoi-9001", title: "Вода та напої" });
  const middle = category({
    slug: "voda-pytna-9002",
    title: "Вода питна",
    parent: "voda-ta-napoi-9001",
    path: [{ slug: "voda-ta-napoi-9001", title: "Вода та напої" }],
  });
  const leaf = category({
    slug: "voda-gazovana-9003",
    title: "Вода газована",
    parent: "voda-pytna-9002",
    path: [
      { slug: "voda-ta-napoi-9001", title: "Вода та напої" },
      { slug: "voda-pytna-9002", title: "Вода питна" },
    ],
  });

  const candidates = [
    { record: root, score: 9, accounted: true },
    { record: middle, score: 4, accounted: true },
    { record: leaf, score: 1, accounted: true },
  ];

  const pruned = pruneCategoryLineage(candidates);
  assert.equal(pruned.length, 1, "the subtree printed more than one of its own records");
  assert.equal(pruned[0].record.slug, "voda-gazovana-9003");
});

test("a rejected popular read yields no flags, and the category table still comes back", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: EMPTY_CATEGORIES,
    [TREE_TOOL]: EMPTY_TREE,
    [POPULAR_TOOL]: { isError: true, content: "the popular endpoint fell over" },
  });

  const table = await readCategoryTable("branch-1", "SelfPickup", {
    start: "2026-09-06T17:00:00+00:00",
    end: "2026-09-06T17:30:00+00:00",
  });

  assert.equal(table.popularJoined, 0);
  assert.ok(table.records.every((record: Record<string, unknown>) => record.popular === false));
});
