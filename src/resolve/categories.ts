import { createRequire } from "node:module";

import { silpo } from "../daemon/client.js";
import type { CategoryListItem, CategoryTreeNode, PopularCategory } from "../mcp/entities/category.js";
import type { DeliveryType } from "../mcp/entities/delivery.js";
import { paginate } from "../utils/paginate.js";
import { buildMatcher, type MatchCandidate, type Matcher } from "./matching.js";

type CyrillicToTranslit = (config?: { preset: "ru" | "uk" | "mn" }) => {
  transform(input: string, spaceReplacement?: string): string;
  reverse(input: string, spaceReplacement?: string): string;
};

const require = createRequire(import.meta.url);
const cyrillicToTranslit = require("cyrillic-to-translit-js") as CyrillicToTranslit;
const categoryTransliterator = cyrillicToTranslit({ preset: "uk" });

function categoryHandleWords(slug: string): string {
  const segments = slug.split("-");
  const tail = segments[segments.length - 1];

  if (segments.length > 1 && tail !== undefined && /^\d+$/.test(tail)) segments.pop();

  return segments.join(" ");
}

function categoryTransliteratedWords(title: string): string {
  return categoryTransliterator.transform(title);
}

type CategoryMatchDocument = {
  readonly key: string;
  readonly title: string;
  readonly handle: string;
  readonly translit: string;
};

export type CategoryPathEntry = {
  readonly slug: string;
  readonly title: string | undefined;
};

export type CategoryRecord = {
  readonly identifier: string | undefined;
  readonly slug: string;
  readonly title: string | undefined;
  readonly parent: string | undefined;
  readonly count: number | undefined;
  readonly path: readonly CategoryPathEntry[];
  readonly popular: boolean;
  readonly popularRank: number | undefined;
};

export type CategoryTable = {
  readonly records: readonly CategoryRecord[];
  readonly roots: readonly CategoryRecord[];
  readonly bySlug: ReadonlyMap<string, CategoryRecord>;
  readonly byIdentifier: ReadonlyMap<string, CategoryRecord>;
  readonly byParent: ReadonlyMap<string, readonly CategoryRecord[]>;
  readonly droppedCount: number;
  readonly uncounted: boolean;
  readonly popularJoined: number;
};

function countTreeNodes(nodes: readonly CategoryTreeNode[]): number {
  let count = 0;
  for (const node of nodes) count += 1 + countTreeNodes(node.children);
  return count;
}

function anyNodeCounted(nodes: readonly CategoryTreeNode[]): boolean {
  return nodes.some((node) => node.total !== undefined || anyNodeCounted(node.children));
}

function walkTree(
  nodes: readonly CategoryTreeNode[],
  parent: string | undefined,
  path: readonly CategoryPathEntry[],
  flatBySlug: ReadonlyMap<string, CategoryListItem>,
  filterByCount: boolean,
  out: CategoryRecord[],
): number {
  let dropped = 0;

  for (const node of nodes) {
    if (filterByCount && node.total === undefined) {
      dropped += countTreeNodes([node]);
      continue;
    }

    const listed = flatBySlug.get(node.slug);

    out.push({
      identifier: listed?.id,
      slug: node.slug,
      title: listed?.title,
      parent,
      count: node.total,
      path,
      popular: false,
      popularRank: undefined,
    });

    const childPath = [...path, { slug: node.slug, title: listed?.title }];
    dropped += walkTree(node.children, node.slug, childPath, flatBySlug, filterByCount, out);
  }

  return dropped;
}

export function buildCategoryTable(
  flatItems: readonly CategoryListItem[],
  tree: readonly CategoryTreeNode[],
  popular: readonly PopularCategory[],
): CategoryTable {
  const flatBySlug = new Map(flatItems.map((item) => [item.slug, item] as const));
  const anyCounted = anyNodeCounted(tree);

  const walked: CategoryRecord[] = [];
  const droppedCount = walkTree(tree, undefined, [], flatBySlug, anyCounted, walked);

  const walkedBySlug = new Map(walked.map((record) => [record.slug, record] as const));
  const popularRankBySlug = new Map<string, number>();
  let popularJoined = 0;

  for (const row of popular) {
    if (!walkedBySlug.has(row.slug)) continue;
    popularJoined += 1;
    if (!popularRankBySlug.has(row.slug)) popularRankBySlug.set(row.slug, popularRankBySlug.size);
  }

  const records = walked.map((record) => {
    const rank = popularRankBySlug.get(record.slug);
    return rank === undefined ? record : { ...record, popular: true, popularRank: rank };
  });

  const bySlug = new Map(records.map((record) => [record.slug, record] as const));
  const byIdentifier = new Map<string, CategoryRecord>();
  const byParent = new Map<string, CategoryRecord[]>();
  const roots: CategoryRecord[] = [];

  for (const record of records) {
    if (record.identifier !== undefined) byIdentifier.set(record.identifier, record);

    if (record.parent === undefined) {
      roots.push(record);
    } else {
      const siblings = byParent.get(record.parent) ?? [];
      siblings.push(record);
      byParent.set(record.parent, siblings);
    }
  }

  return {
    records,
    roots,
    bySlug,
    byIdentifier,
    byParent,
    droppedCount,
    uncounted: !anyCounted,
    popularJoined,
  };
}

const CATEGORY_PAGE = 1000;

async function readPopularCategories(
  branchId: string,
  deliveryType: DeliveryType,
): Promise<readonly PopularCategory[]> {
  try {
    const { structured } = await silpo.getPopularCategories({ branchId, deliveryType });
    return structured.categories;
  } catch {
    return [];
  }
}

export async function readCategoryTable(
  branchId: string,
  deliveryType: DeliveryType,
  timeslot: { readonly start: string; readonly end: string },
): Promise<CategoryTable> {
  const categoriesPromise = paginate<CategoryListItem>(CATEGORY_PAGE, (limit, offset) =>
    silpo.getCategories({ branchId, limit, offset }).then(({ structured }) => ({
      rows: structured.categories,
      total: structured.meta.total,
    })),
  );
  const treePromise = silpo.getCategoriesTree({
    branchId,
    deliveryType,
    timeslotStart: timeslot.start,
    timeslotEnd: timeslot.end,
  });
  const popularPromise = readPopularCategories(branchId, deliveryType);

  const [categoryItems, tree, popular] = await Promise.all([categoriesPromise, treePromise, popularPromise]);

  return buildCategoryTable(categoryItems, tree.structured.tree, popular);
}

const CATEGORY_FIELDS = ["title", "handle", "translit"] as const;

export type CategoryMatcher = Matcher<CategoryRecord>;

export function categoryMatcher(records: readonly CategoryRecord[]): CategoryMatcher {
  return buildMatcher<CategoryRecord, CategoryMatchDocument>(
    records,
    (record) => record.slug,
    CATEGORY_FIELDS,
    (record) => {
      const title = record.title ?? "";

      return {
        key: record.slug,
        title,
        handle: categoryHandleWords(record.slug),
        translit: categoryTransliteratedWords(title),
      };
    },
    { prefix: true },
  );
}

export function isDescendantOf(record: CategoryRecord, ancestorSlug: string): boolean {
  return record.path.some((entry) => entry.slug === ancestorSlug);
}

function lineageWinner(
  ancestor: MatchCandidate<CategoryRecord>,
  descendant: MatchCandidate<CategoryRecord>,
): MatchCandidate<CategoryRecord> {
  return ancestor.accounted && !descendant.accounted ? ancestor : descendant;
}

function relatedByLineage(
  a: MatchCandidate<CategoryRecord>,
  b: MatchCandidate<CategoryRecord>,
): boolean {
  return isDescendantOf(a.record, b.record.slug) || isDescendantOf(b.record, a.record.slug);
}

function beatsInLineage(
  winner: MatchCandidate<CategoryRecord>,
  loser: MatchCandidate<CategoryRecord>,
): boolean {
  if (isDescendantOf(loser.record, winner.record.slug)) return lineageWinner(winner, loser) === winner;
  if (isDescendantOf(winner.record, loser.record.slug)) return lineageWinner(loser, winner) === winner;
  return false;
}

function soleBeneficiary(
  candidates: readonly MatchCandidate<CategoryRecord>[],
  loser: MatchCandidate<CategoryRecord>,
): MatchCandidate<CategoryRecord> | undefined {
  let winner: MatchCandidate<CategoryRecord> | undefined;

  for (const other of candidates) {
    if (other === loser || !relatedByLineage(loser, other) || !beatsInLineage(other, loser)) continue;
    if (winner !== undefined && winner !== other) return undefined;
    winner = other;
  }

  return winner;
}

function lineageFamilyScore(
  candidates: readonly MatchCandidate<CategoryRecord>[],
  survivor: MatchCandidate<CategoryRecord>,
): number {
  return candidates.reduce((best, other) => {
    if (other === survivor || other.score <= best) return best;
    return soleBeneficiary(candidates, other) === survivor ? other.score : best;
  }, survivor.score);
}

export function pruneCategoryLineage(
  candidates: readonly MatchCandidate<CategoryRecord>[],
): readonly MatchCandidate<CategoryRecord>[] {
  const survivors = candidates.filter((candidate) =>
    candidates.every((other) => {
      if (other === candidate) return true;
      if (isDescendantOf(other.record, candidate.record.slug)) {
        return lineageWinner(candidate, other) === candidate;
      }
      if (isDescendantOf(candidate.record, other.record.slug)) {
        return lineageWinner(other, candidate) === candidate;
      }
      return true;
    }),
  );

  return survivors
    .map((survivor) => ({ ...survivor, score: lineageFamilyScore(candidates, survivor) }))
    .sort((a, b) => b.score - a.score);
}

function exactCategory(table: CategoryTable, value: string): CategoryRecord | undefined {
  return table.bySlug.get(value) ?? table.byIdentifier.get(value);
}

export function rankCategories(
  table: CategoryTable,
  text: string,
): readonly MatchCandidate<CategoryRecord>[] {
  const exact = exactCategory(table, text);
  if (exact !== undefined) return [{ record: exact, score: Number.POSITIVE_INFINITY, accounted: true }];

  return pruneCategoryLineage(categoryMatcher(table.records).search(text));
}
