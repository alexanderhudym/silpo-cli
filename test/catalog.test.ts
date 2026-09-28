import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { fails, renderTools, run, setPayloads, startDaemon, stopDaemon } from "./harness.ts";

const CATEGORIES_TOOL = "silpo_get_categories";
const TREE_TOOL = "silpo_get_categories_tree";
const PROMOTIONS_TOOL = "silpo_get_promotions";
const SETS_TOOL = "silpo_get_product_sets";
const POPULAR_TOOL = "silpo_get_popular_categories";

const SCOPE_TOOLS = {
  [CATEGORIES_TOOL]: "categories.list",
  [TREE_TOOL]: "categories.tree",
  [PROMOTIONS_TOOL]: "promotions",
  [SETS_TOOL]: "sets",
  [POPULAR_TOOL]: "categories.popular",
};

const EMPTY_PROMOTIONS = { success: true, summary: "Found 0 active promotions", promotions: [] };
const EMPTY_SETS = { success: true, summary: "Found 0 product sets", sets: [] };
const EMPTY_POPULAR = { success: true, summary: "Found 0 popular categories", categories: [] };

function flat(slug: string, title: string): Record<string, unknown> {
  return { id: `id-${slug}`, slug, title, parentId: null };
}

function categoriesPayload(entries: readonly Record<string, unknown>[]): Record<string, unknown> {
  return {
    success: true,
    summary: `Found ${entries.length} categories (total: ${entries.length})`,
    categories: entries,
    meta: { limit: 1000, offset: 0, total: entries.length },
  };
}

function node(
  slug: string,
  total: number | undefined,
  children: readonly Record<string, unknown>[] = [],
): Record<string, unknown> {
  return total === undefined ? { slug, children } : { slug, children, total };
}

function treePayload(tree: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { success: true, summary: `Found ${tree.length} top-level categories`, tree };
}

function popularPayload(rows: readonly { slug: string; title: string }[]): Record<string, unknown> {
  return {
    success: true,
    summary: `Found ${rows.length} popular categories`,
    categories: rows.map(({ slug, title }) => ({ id: `pop-${slug}`, slug, title, url: "" })),
  };
}

before(startDaemon);
after(stopDaemon);

test("the three kinds print as three groups, in order, the kind named once on the group and on no record", async () => {
  const text = await renderTools(SCOPE_TOOLS, ["catalog"]);

  const promotionsAt = text.indexOf("Found 10 promotions");
  const categoriesAt = text.indexOf("Found 6 categories");
  const setsAt = text.indexOf("Found 17 sets");

  assert.ok(promotionsAt === 0, text);
  assert.ok(categoriesAt > promotionsAt && setsAt > categoriesAt, text);
  assert.ok(!/^kind: /m.test(text), "a record carried its own kind");
});

test("a listing with no argument prints the whole hierarchy, nested, with no page size", async () => {
  const children = Array.from({ length: 12 }, (_, index) => node(`child-${index}`, index + 1));
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("root", "Корінь"),
      ...children.map((_, index) => flat(`child-${index}`, `Дитина ${index}`)),
    ]),
    [TREE_TOOL]: treePayload([node("root", 100, children)]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog"]);

  assert.match(text, /^Found 13 categories\n/m);
  assert.match(text, /\nroot Корінь \(100\)\n/);

  const printedChildren = text.match(/^ {2}child-\d+ Дитина \d+ \(\d+\)$/gm)?.length ?? 0;
  assert.equal(printedChildren, 12, "the page size trimmed the unbounded listing");
});

test("a ranked group is trimmed to the page size, and states its own kept count", async () => {
  const entries = Array.from({ length: 15 }, (_, index) => flat(`chai-${index}`, `Чай ${index}`));
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload(entries),
    [TREE_TOOL]: treePayload(entries.map(({ slug }) => node(slug as string, 3))),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "чай"]);

  assert.match(text, /^Found 15 categories\n/m);
  const printed = text.match(/^slug: /gm)?.length ?? 0;
  assert.equal(printed, 10, "the default page size of 10 did not trim the ranking");
});

test("a name ranking fewer records than the page size prints them all and states that count", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("chai-zelenyi", "Чай зелений"), flat("moloko", "Молоко")]),
    [TREE_TOOL]: treePayload([node("chai-zelenyi", 3), node("moloko", 5)]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "чай", "--limit", "2"]);

  assert.match(text, /^Found 1 categories\n/m);
  assert.match(text, /slug: chai-zelenyi/);
  assert.ok(!text.includes("moloko"));
});

test("a popular category deeper than a root leads that root, and its row names the descendant", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("napoi", "Напої"),
      flat("moloko-yaitsia", "Молочні продукти"),
      flat("syr", "Сир"),
    ]),
    [TREE_TOOL]: treePayload([
      node("napoi", 40),
      node("moloko-yaitsia", 60, [node("syr", 12)]),
    ]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: popularPayload([{ slug: "syr", title: "Сир" }]),
  });

  const text = await run(["catalog"]);

  assert.match(text, /popular joined: 1/);

  const hierarchyStart = text.indexOf("popular joined: 1") + "popular joined: 1".length + 2;
  const body = text.slice(hierarchyStart);
  const firstLine = body.split("\n")[0];
  assert.match(firstLine!, /^moloko-yaitsia Молочні продукти \(60\) \(popular: syr Сир\)$/);
  assert.ok(body.indexOf("moloko-yaitsia") < body.indexOf("napoi"), "the led root did not come first");
});

test("two popular roots are ordered as the popular listing returned them, not as the tree walked them", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("napoi", "Напої"),
      flat("kava", "Кава"),
      flat("moloko-yaitsia", "Молочні продукти"),
      flat("syr", "Сир"),
    ]),
    [TREE_TOOL]: treePayload([
      node("napoi", 40, [node("kava", 8)]),
      node("moloko-yaitsia", 60, [node("syr", 12)]),
    ]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: popularPayload([
      { slug: "syr", title: "Сир" },
      { slug: "kava", title: "Кава" },
    ]),
  });

  const text = await run(["catalog"]);

  const hierarchyStart = text.indexOf("popular joined: 2") + "popular joined: 2".length + 2;
  const body = text.slice(hierarchyStart);
  assert.ok(
    body.indexOf("moloko-yaitsia") < body.indexOf("napoi"),
    "the popular listing's own order was not honoured among the leading roots",
  );
});

test("a popular category that is itself a root is marked, not merely left to lead by position", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("napoi", "Напої"), flat("ovochi-frukty", "Овочі та фрукти")]),
    [TREE_TOOL]: treePayload([node("napoi", 40), node("ovochi-frukty", 34)]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: popularPayload([{ slug: "ovochi-frukty", title: "Овочі та фрукти" }]),
  });

  const text = await run(["catalog"]);

  assert.match(text, /^ovochi-frukty Овочі та фрукти \(34\) \(popular\)$/m);
});

test("a popular read that joins nothing states a joined count of zero", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("napoi", "Напої")]),
    [TREE_TOOL]: treePayload([node("napoi", 40)]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: popularPayload([{ slug: "not-in-branch", title: "Ще щось" }]),
  });

  const text = await run(["catalog"]);

  assert.match(text, /popular joined: 0/);
});

test("a matched parent prints its children as slug, title and count", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("napoi-6001", "Напої"),
      flat("kava", "Кава"),
      flat("chai", "Чай"),
    ]),
    [TREE_TOOL]: treePayload([node("napoi-6001", 20, [node("kava", 5), node("chai", 3)])]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "напої"]);

  assert.match(text, /slug: napoi-6001/);
  assert.match(text, /count: 20/);
  assert.match(text, /children\n {2}slug: kava\n {2}title: Кава\n {2}count: 5/);
  assert.match(text, /slug: chai\n {2}title: Чай\n {2}count: 3/);
});

test("a matched category's subtree prints three levels, a matched leaf prints no children section", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("napoi-8001", "Напої"),
      flat("chai", "Чай"),
      flat("chai-zelenyi", "Чай зелений"),
      flat("kava", "Кава"),
    ]),
    [TREE_TOOL]: treePayload([
      node("napoi-8001", 30, [node("chai", 10, [node("chai-zelenyi", 4)]), node("kava", 8)]),
    ]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "напої"]);

  assert.match(text, /slug: napoi-8001/);
  assert.match(text, / {2}slug: chai\n {2}title: Чай\n {2}count: 10/);
  assert.match(text, / {4}slug: chai-zelenyi\n {4}title: Чай зелений\n {4}count: 4/);
  assert.match(text, / {2}slug: kava\n {2}title: Кава\n {2}count: 8/);

  const leaf = await run(["catalog", "kava"]);
  assert.match(leaf, /^Found 1 categories/m);
  assert.match(leaf, /slug: kava/);
  assert.ok(!leaf.includes("children"), "a leaf category printed a children section");
});

test("a subtree larger than the page size is printed whole", async () => {
  const children = Array.from({ length: 25 }, (_, index) => node(`child-${index}`, 1));
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("napoi-9001", "Напої"),
      ...children.map((child) => flat(child.slug as string, `Дитина ${child.slug}`)),
    ]),
    [TREE_TOOL]: treePayload([node("napoi-9001", 25, children)]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "напої", "--limit", "1"]);

  assert.match(text, /^Found 1 categories/m);
  const printedChildren = text.match(/^ {2}slug: child-\d+$/gm)?.length ?? 0;
  assert.equal(printedChildren, 25, "the page size cut the subtree instead of bounding the matched roots");
});

test("a descendant printed inside a matched subtree carries no path, at every depth", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("napoi-8501", "Напої"),
      flat("hariachi-8501", "Гарячі напої"),
      flat("chai-8501", "Чай"),
      flat("chai-zelenyi-8501", "Чай зелений"),
      flat("chai-zelenyi-dobirka-8501", "Чай зелений добірка"),
    ]),
    [TREE_TOOL]: treePayload([
      node("napoi-8501", 10, [
        node("hariachi-8501", 8, [
          node("chai-8501", 6, [node("chai-zelenyi-8501", 2, [node("chai-zelenyi-dobirka-8501", 1)])]),
        ]),
      ]),
    ]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "chai-8501"]);

  assert.match(text, /^slug: chai-8501\ntitle: Чай\ncount: 6\npath: Напої \/ Гарячі напої/m);
  const bodyAfterParent = text.slice(text.indexOf("children"));
  assert.ok(!bodyAfterParent.includes("path:"), "a descendant printed a path the nesting already gave it");
  assert.match(
    bodyAfterParent,
    / {4}slug: chai-zelenyi-dobirka-8501\n {4}title: Чай зелений добірка\n {4}count: 1/,
  );
});

test("a matched parent and a matched descendant do not both reach the renderer", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("kava-chai-8601", "Кава і чай"), flat("chai-8601", "Чай")]),
    [TREE_TOOL]: treePayload([node("kava-chai-8601", 12, [node("chai-8601", 5)])]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "чай"]);

  assert.match(text, /^Found 1 categories/m);
  const printedSlugs = text.match(/^slug: /gm)?.length ?? 0;
  assert.equal(printedSlugs, 1, "the ancestor and the descendant both printed their own record");
  assert.match(text, /slug: chai-8601/);
  assert.ok(!text.includes("slug: kava-chai-8601"), "the pruned ancestor still reached the renderer");
});

test("a multi-word match keeps the ancestor that accounts for every word over descendants that account for one alone", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("voda-ta-napoi-9001", "Вода та напої"),
      flat("voda-pytna-9002", "Вода питна"),
      flat("voda-gazovana-9003", "Вода газована"),
    ]),
    [TREE_TOOL]: treePayload([
      node("voda-ta-napoi-9001", 20, [node("voda-pytna-9002", 10, [node("voda-gazovana-9003", 3)])]),
    ]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "вода напої"]);

  assert.match(text, /^Found 1 categories/m);
  const printedSlugs = text.match(/^slug: /gm)?.length ?? 0;
  assert.equal(
    printedSlugs,
    1,
    "the fully-accounted ancestor and one of its partially-matching descendants both reached the renderer",
  );
  assert.match(text, /^slug: voda-ta-napoi-9001\ntitle: Вода та напої\ncount: 20\nchildren$/m);
  assert.match(text, /^ {2}slug: voda-pytna-9002\n {2}title: Вода питна\n {2}count: 10\n {2}children$/m);
  assert.match(
    text,
    /^ {4}slug: voda-gazovana-9003\n {4}title: Вода газована\n {4}count: 3$/m,
  );
});

test("a multi-word match keeps the deepest of two equally-partial descendants, dropping the equally-partial ancestor between them", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("napoi-9101", "Напої"),
      flat("voda-pytna-9102", "Вода питна"),
      flat("voda-gazovana-9103", "Вода газована"),
    ]),
    [TREE_TOOL]: treePayload([
      node("napoi-9101", 20, [node("voda-pytna-9102", 10, [node("voda-gazovana-9103", 3)])]),
    ]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "вода напої"]);

  assert.match(text, /^Found 1 categories/m);
  const printedSlugs = text.match(/^slug: /gm)?.length ?? 0;
  assert.equal(printedSlugs, 1, "an ancestor and one of its descendants both reached the renderer");
  assert.match(text, /slug: voda-gazovana-9103/);
  assert.ok(!text.includes("slug: voda-pytna-9102"), "the middle ancestor still reached the renderer");
  assert.ok(!text.includes("slug: napoi-9101"), "the root ancestor still reached the renderer");
});

test("a lineage pair where neither end is accounted for the whole query still prints only the descendant", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("moloko", "Молоко"), flat("sir", "Сир")]),
    [TREE_TOOL]: treePayload([node("moloko", 5, [node("sir", 2)])]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "молоко сир"]);

  assert.match(text, /^Found 1 categories/m);
  assert.match(text, /slug: sir/);
  assert.ok(!text.includes("slug: moloko"), "the ancestor the descendant already collapsed into still printed");
});

test("a category found under an exact title is not dropped for an unrelated descendant matching one word", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("kyslomolochni-napoi-4983", "Кисломолочні напої"),
      flat("napoi-na-syrovattsi-4985", "Напої на сироватці"),
    ]),
    [TREE_TOOL]: treePayload([
      node("kyslomolochni-napoi-4983", 20, [node("napoi-na-syrovattsi-4985", 5)]),
    ]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "Кисломолочні напої"]);

  assert.match(text, /^Found 1 categories/m);
  const printedSlugs = text.match(/^slug: /gm)?.length ?? 0;
  assert.equal(printedSlugs, 1, "the exact ancestor and its weakly-matching descendant both reached the renderer");
  assert.match(text, /^slug: kyslomolochni-napoi-4983\ntitle: Кисломолочні напої\ncount: 20\nchildren$/m);
  assert.match(
    text,
    /^ {2}slug: napoi-na-syrovattsi-4985\n {2}title: Напої на сироватці\n {2}count: 5$/m,
  );
});

test("a category named by its slug heads the group with its path, count and children, as its title would", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([
      flat("napoi-6001", "Напої"),
      flat("kava", "Кава"),
      flat("chai", "Чай"),
    ]),
    [TREE_TOOL]: treePayload([node("napoi-6001", 20, [node("kava", 5), node("chai", 3)])]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "napoi-6001"]);

  assert.match(text, /^Found 1 categories/m);
  assert.match(text, /slug: napoi-6001/);
  assert.match(text, /count: 20/);
  assert.match(text, /children\n {2}slug: kava\n {2}title: Кава\n {2}count: 5/);
});

test("a promotion named by its code and a set named by its slug are found the same way a category is", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([]),
    [TREE_TOOL]: treePayload([]),
    [PROMOTIONS_TOOL]: {
      success: true,
      summary: "Found 1 active promotions",
      promotions: [{ code: "additional", title: "Додаткові пропозиції", productCount: 2979, url: "" }],
    },
    [SETS_TOOL]: {
      success: true,
      summary: "Found 1 product sets",
      sets: [{ slug: "klatsniznyzhky", title: "Тільки онлайн", description: null, link: "" }],
    },
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const byCode = await run(["catalog", "additional"]);
  assert.match(byCode, /^Found 0 categories/m);
  assert.match(byCode, /Found 1 promotions/);
  assert.match(byCode, /code: additional/);

  const bySlug = await run(["catalog", "klatsniznyzhky"]);
  assert.match(bySlug, /Found 1 sets/);
  assert.match(bySlug, /slug: klatsniznyzhky/);
});

test("a category matched outside the hierarchy carries its path, and the hierarchy never does", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("napoi-7001", "Напої"), flat("kava-mocha", "Кава мокко")]),
    [TREE_TOOL]: treePayload([node("napoi-7001", 20, [node("kava-mocha", 5)])]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const ranked = await run(["catalog", "мокко"]);
  assert.match(ranked, /slug: kava-mocha\ntitle: Кава мокко\ncount: 5\npath: Напої/);

  const whole = await run(["catalog"]);
  assert.ok(!whole.includes("path:"), "the nested hierarchy repeated a parent as a path");
});

test("a set prints its description only where it carries one", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([]),
    [TREE_TOOL]: treePayload([]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: {
      success: true,
      summary: "Found 2 product sets",
      sets: [
        { slug: "with-desc", title: "Смачний вибір", description: "Найкраще для вечері", link: "" },
        { slug: "no-desc", title: "Без опису", description: null, link: "" },
      ],
    },
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog"]);

  assert.match(text, /slug: with-desc\ntitle: Смачний вибір\ndescription: Найкраще для вечері/);
  assert.ok(text.endsWith("slug: no-desc\ntitle: Без опису\n"), text);
});

test("categories dropped for holding nothing are counted, including when the count is zero", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("kept", "Є"), flat("empty", "Пусто"), flat("empty-child", "Дитина")]),
    [TREE_TOOL]: treePayload([
      node("kept", 3),
      node("empty", undefined, [node("empty-child", 4)]),
    ]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog"]);

  assert.match(text, /dropped for holding nothing: 2/);
  assert.ok(!text.includes("empty-child"), "the subtree of a dropped category survived");

  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("only", "Одна")]),
    [TREE_TOOL]: treePayload([node("only", 1)]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const noneDropped = await run(["catalog"]);
  assert.match(noneDropped, /dropped for holding nothing: 0/);
});

test("where the table is marked uncounted, no dropped count is stated but the join still is", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("a", "А"), flat("b", "Б")]),
    [TREE_TOOL]: treePayload([node("a", undefined), node("b", undefined)]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog"]);

  assert.ok(!text.includes("dropped for holding nothing"), "an uncounted table still reported a drop");
  assert.match(text, /popular joined: 0/);
  assert.match(text, /\na А\n/);
  assert.match(text, /\nb Б\n/);
});

test("--tree, --popular and --offset are removed and fail as unknown options", async () => {
  assert.match(await fails(["catalog", "--tree"]), /unknown option '--tree'/);
  assert.match(await fails(["catalog", "--popular"]), /unknown option '--popular'/);
  assert.match(await fails(["catalog", "--offset", "1"]), /unknown option '--offset'/);
});

test("promotions, sets and categories print no price range and no web address", async () => {
  const text = await renderTools(SCOPE_TOOLS, ["catalog"]);

  assert.ok(!text.includes("silpo.ua"), "a page address survived");
  assert.ok(!text.includes("prices:"), "a price range survived");
  assert.ok(text.includes("code: additional"), "a promotion lost its code");
  assert.ok(text.includes("products: 2979"), "a promotion lost its product count");
});

test("no catalog output prints whether the call succeeded", async () => {
  const text = await renderTools(SCOPE_TOOLS, ["catalog"]);
  assert.ok(!text.includes("success"));
});

test("nothing matching a text still succeeds, reporting each group empty", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("moloko", "Молоко")]),
    [TREE_TOOL]: treePayload([node("moloko", 5)]),
    [PROMOTIONS_TOOL]: EMPTY_PROMOTIONS,
    [SETS_TOOL]: EMPTY_SETS,
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "ххххнетакогохххх"]);

  assert.match(text, /Found 0 categories/);
  assert.match(text, /Found 0 promotions/);
  assert.match(text, /Found 0 sets/);
});

test("a filter reaching all three kinds prints each within its own group and orders none against another", async () => {
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("promo-cat", "Акційні товари")]),
    [TREE_TOOL]: treePayload([node("promo-cat", 4)]),
    [PROMOTIONS_TOOL]: {
      success: true,
      summary: "Found 1 active promotions",
      promotions: [{ code: "promo-code", title: "Акційні товари знижка", productCount: 5, url: "" }],
    },
    [SETS_TOOL]: {
      success: true,
      summary: "Found 1 product sets",
      sets: [{ slug: "promo-set", title: "Акційні товари набір", description: null, link: "" }],
    },
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const text = await run(["catalog", "акційні товари"]);

  assert.match(text, /^Found 1 categories/m);
  assert.match(text, /Found 1 promotions/);
  assert.match(text, /Found 1 sets/);
  assert.match(text, /slug: promo-cat/);
  assert.match(text, /code: promo-code/);
  assert.match(text, /slug: promo-set/);

  const promotionsAt = text.indexOf("Found 1 promotions");
  const categoriesAt = text.indexOf("Found 1 categories");
  const setsAt = text.indexOf("Found 1 sets");
  assert.ok(promotionsAt === 0, text);
  assert.ok(categoriesAt > promotionsAt && setsAt > categoriesAt, text);
});

test("the fixed order does not follow which group holds the most or the fewest records", async () => {
  const manyPromotions = Array.from({ length: 8 }, (_, index) => ({
    code: `rozprodazh-${index}`,
    title: `Розпродаж ${index}`,
    productCount: 3,
    url: "",
  }));

  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload([flat("rozprodazh-cat", "Розпродаж")]),
    [TREE_TOOL]: treePayload([node("rozprodazh-cat", 2)]),
    [PROMOTIONS_TOOL]: { success: true, summary: "Found 8 active promotions", promotions: manyPromotions },
    [SETS_TOOL]: {
      success: true,
      summary: "Found 1 product sets",
      sets: [{ slug: "rozprodazh-set", title: "Розпродаж набір", description: null, link: "" }],
    },
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const promotionsLargest = await run(["catalog", "розпродаж"]);
  assert.match(promotionsLargest, /^Found 8 promotions/);
  const largePromotionsAt = promotionsLargest.indexOf("Found 8 promotions");
  const largeCategoriesAt = promotionsLargest.indexOf("Found 1 categories");
  const largeSetsAt = promotionsLargest.indexOf("Found 1 sets");
  assert.ok(largePromotionsAt === 0, promotionsLargest);
  assert.ok(largeCategoriesAt > largePromotionsAt && largeSetsAt > largeCategoriesAt, promotionsLargest);

  const manyCategories = Array.from({ length: 6 }, (_, index) => flat(`rozprodazh-cat-${index}`, `Розпродаж ${index}`));
  setPayloads({
    [CATEGORIES_TOOL]: categoriesPayload(manyCategories),
    [TREE_TOOL]: treePayload(manyCategories.map(({ slug }) => node(slug as string, 2))),
    [PROMOTIONS_TOOL]: {
      success: true,
      summary: "Found 1 active promotions",
      promotions: [{ code: "rozprodazh-code", title: "Розпродаж", productCount: 3, url: "" }],
    },
    [SETS_TOOL]: {
      success: true,
      summary: "Found 1 product sets",
      sets: [{ slug: "rozprodazh-set", title: "Розпродаж набір", description: null, link: "" }],
    },
    [POPULAR_TOOL]: EMPTY_POPULAR,
  });

  const promotionsSmallest = await run(["catalog", "розпродаж"]);
  assert.match(promotionsSmallest, /^Found 1 promotions/);
  const smallPromotionsAt = promotionsSmallest.indexOf("Found 1 promotions");
  const smallCategoriesAt = promotionsSmallest.indexOf("Found 6 categories");
  const smallSetsAt = promotionsSmallest.indexOf("Found 1 sets");
  assert.ok(smallPromotionsAt === 0, promotionsSmallest);
  assert.ok(
    smallCategoriesAt > smallPromotionsAt && smallSetsAt > smallCategoriesAt,
    promotionsSmallest,
  );
});
