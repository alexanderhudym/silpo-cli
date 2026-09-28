import assert from "node:assert/strict";
import { test } from "node:test";

const { settleCatalog } = await import("../dist/commands/products.js");
const { rankCategories, pruneCategoryLineage } = await import("../dist/resolve/categories.js");

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

test("no candidates settles to miss", () => {
  const settled = settleCatalog([]);
  assert.equal(settled.kind, "miss");
});

test("a lone accounted candidate settles to auto, the margin having nothing to compare", () => {
  const settled = settleCatalog([{ record: { slug: "a" }, score: 1, accounted: true }]);
  assert.equal(settled.kind, "auto");
  assert.equal(settled.record.slug, "a");
});

test("a lone candidate that has not accounted for every word settles to ask rather than auto", () => {
  const table = categoryTable([category({ slug: "shkarpetky-100", title: "Шкарпетки" })]);

  const ranked = rankCategories(table, "дитячі шкарпетки");
  const settled = settleCatalog(ranked);

  assert.equal(settled.kind, "ask");
  assert.equal(settled.candidates.length, 1);
  assert.equal(settled.candidates[0].record.slug, "shkarpetky-100");
});

test("an exact title too close to a weakly-related sibling to separate is asked about rather than chosen", () => {
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

  const settled = settleCatalog(rankCategories(table, "Кисломолочні напої"));

  assert.equal(
    settled.kind,
    "ask",
    "the caller's own exact title was silently resolved to an unrelated sibling",
  );
  const slugs = settled.candidates.map((candidate: { record: Record<string, unknown> }) => candidate.record.slug);
  assert.ok(slugs.includes("kyslomolochni-napoi-4983"), "the exact title's own category was pruned away");
});

test("a weak best match, too close to the runner-up to separate, is asked about", () => {
  const table = categoryTable([
    category({ slug: "molochna-produktsiia", title: "Молочна продукція" }),
    category({ slug: "kyslomolochna-produktsiia", title: "Кисломолочна продукція" }),
  ]);

  const settled = settleCatalog(rankCategories(table, "продукція"));

  assert.equal(settled.kind, "ask");
  const slugs = settled.candidates.map((candidate: { record: Record<string, unknown> }) => candidate.record.slug);
  assert.ok(slugs.includes("molochna-produktsiia"));
  assert.ok(slugs.includes("kyslomolochna-produktsiia"));
});

test("a lineage pair where neither end is accounted settles to ask on the same one record the listing keeps", () => {
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

  const settled = settleCatalog(ranked);
  assert.equal(settled.kind, "ask", "the ancestor the listing already dropped still reached the caller");
  const slugs = settled.candidates.map((candidate: { record: Record<string, unknown> }) => candidate.record.slug);
  assert.deepEqual(slugs, ["sir"], "the resolution kept a different record from the one the listing kept");
});

test("a short word many records carry is offered rather than chosen", () => {
  const table = categoryTable([
    category({ slug: "ryba-100", title: "Риба" }),
    category({ slug: "rys-200", title: "Рис" }),
  ]);

  const settled = settleCatalog(rankCategories(table, "ри"));

  assert.equal(settled.kind, "ask", "a short word many records carry was chosen rather than offered");
  const slugs = settled.candidates.map((candidate: { record: Record<string, unknown> }) => candidate.record.slug);
  assert.ok(slugs.includes("ryba-100"));
  assert.ok(slugs.includes("rys-200"));
});

test("a genuine tie between two unrelated categories is asked about even where one of them has a matched descendant", () => {
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
  const settled = settleCatalog(pruned);

  assert.equal(
    settled.kind,
    "ask",
    "dropping the tied ancestor for its own descendant let an unrelated record win the tie by default",
  );
  const slugs = settled.candidates.map((candidate: { record: Record<string, unknown> }) => candidate.record.slug);
  assert.deepEqual([...slugs].sort(), ["chai-9001", "chai-zelenyi-4002"]);
});

test("a weak descendant does not displace a fully-matching ancestor, which settles to auto", () => {
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
  const settled = settleCatalog(pruned);

  assert.equal(settled.kind, "auto");
  assert.equal(settled.record.slug, "kyslomolochni-napoi-4983");
});
