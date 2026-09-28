import type { Command } from "commander";

import { shoppingCart } from "../daemon/client.js";
import { cartShipment } from "../daemon/cart.js";
import type { DeliveryType } from "../mcp/entities/delivery.js";
import { formatList, formatRows, indent } from "../utils/list.js";
import { formatEntryAsRow, formatEntryAsSection } from "../utils/record.js";
import { requireInteger } from "../utils/number.js";
import {
  rankCategories,
  readCategoryTable,
  type CategoryPathEntry,
  type CategoryRecord,
  type CategoryTable,
} from "../resolve/categories.js";
import { rankPromotions, readPromotionTable, type PromotionRecord, type PromotionTable } from "../resolve/promotions.js";
import { rankSets, readSetTable, type SetRecord, type SetTable } from "../resolve/sets.js";

type CatalogTables = {
  readonly categories: CategoryTable;
  readonly promotions: PromotionTable;
  readonly sets: SetTable;
};

const DEFAULT_PAGE_SIZE = 10;
const PATH_SEPARATOR = " / ";

function pathText(path: readonly CategoryPathEntry[]): string {
  return path.map((entry) => entry.title ?? entry.slug).join(PATH_SEPARATOR);
}

type CatalogOptions = {
  limit?: string;
};

function hierarchyLine(record: CategoryRecord, extra: string | undefined): string {
  const titlePart = record.title === undefined ? "" : ` ${record.title}`;
  const countPart = record.count === undefined ? "" : ` (${record.count})`;
  const extraPart = extra === undefined ? "" : ` ${extra}`;

  return `${record.slug}${titlePart}${countPart}${extraPart}`;
}

function hierarchyNodeText(record: CategoryRecord, table: CategoryTable, extra?: string): string {
  const children = table.byParent.get(record.slug) ?? [];
  const childrenText = children.map((child) => hierarchyNodeText(child, table));
  const line = extra ?? (record.popular ? "(popular)" : undefined);

  return formatRows([hierarchyLine(record, line), children.length > 0 && indent(formatRows(childrenText))]);
}

function popularCauseName(record: CategoryRecord): string {
  return record.title === undefined ? record.slug : `${record.slug} ${record.title}`;
}

function leadingDescendant(
  rootSlug: string,
  records: readonly CategoryRecord[],
): CategoryRecord | undefined {
  return records.find((record) => record.popular && record.path[0]?.slug === rootSlug);
}

function orderedRoots(
  table: CategoryTable,
): readonly { readonly root: CategoryRecord; readonly extra: string | undefined }[] {
  const leaders: { readonly root: CategoryRecord; readonly extra: string | undefined; readonly rank: number }[] = [];
  const rest: CategoryRecord[] = [];

  for (const root of table.roots) {
    if (root.popular) {
      leaders.push({ root, extra: undefined, rank: root.popularRank ?? Number.POSITIVE_INFINITY });
      continue;
    }

    const cause = leadingDescendant(root.slug, table.records);

    if (cause !== undefined) {
      leaders.push({
        root,
        extra: `(popular: ${popularCauseName(cause)})`,
        rank: cause.popularRank ?? Number.POSITIVE_INFINITY,
      });
      continue;
    }

    rest.push(root);
  }

  leaders.sort((a, b) => a.rank - b.rank);

  return [
    ...leaders.map(({ root, extra }) => ({ root, extra })),
    ...rest.map((root) => ({ root, extra: undefined })),
  ];
}

function hierarchyBodyText(table: CategoryTable): string {
  return formatRows(orderedRoots(table).map(({ root, extra }) => hierarchyNodeText(root, table, extra)));
}

function categoriesHeader(count: number, table: CategoryTable): string {
  const rows: (string | false)[] = [`Found ${count} categories`];

  if (!table.uncounted) rows.push(`dropped for holding nothing: ${table.droppedCount}`);
  rows.push(`popular joined: ${table.popularJoined}`);

  return formatRows(rows);
}

function categoryDescendantText(record: CategoryRecord, table: CategoryTable): string {
  const children = table.byParent.get(record.slug) ?? [];
  const childRows = children.map((child) => categoryDescendantText(child, table));

  return formatRows([
    formatEntryAsRow("slug", record.slug),
    record.title !== undefined && formatEntryAsRow("title", record.title),
    record.count !== undefined && formatEntryAsRow("count", record.count),
    children.length > 0 && formatEntryAsSection("children", indent(formatList(childRows))),
  ]);
}

function rankedCategoryText(record: CategoryRecord, table: CategoryTable): string {
  const children = table.byParent.get(record.slug) ?? [];
  const childRows = children.map((child) => categoryDescendantText(child, table));

  return formatRows([
    formatEntryAsRow("slug", record.slug),
    record.title !== undefined && formatEntryAsRow("title", record.title),
    record.count !== undefined && formatEntryAsRow("count", record.count),
    record.path.length > 0 && formatEntryAsRow("path", pathText(record.path)),
    children.length > 0 && formatEntryAsSection("children", indent(formatList(childRows))),
  ]);
}

function promotionRecordText(record: PromotionRecord): string {
  return formatRows([
    formatEntryAsRow("code", record.code),
    formatEntryAsRow("title", record.title),
    formatEntryAsRow("products", record.count),
  ]);
}

function setRecordText(record: SetRecord): string {
  return formatRows([
    formatEntryAsRow("slug", record.slug),
    formatEntryAsRow("title", record.title),
    record.description !== undefined && formatEntryAsRow("description", record.description),
  ]);
}

export function catalogText(tables: CatalogTables, text: string, limit: number | undefined): string {
  const categories =
    text === ""
      ? tables.categories.records
      : rankCategories(tables.categories, text).map((candidate) => candidate.record);
  const promotions =
    text === ""
      ? tables.promotions.records
      : rankPromotions(tables.promotions, text).map((candidate) => candidate.record);
  const sets = text === "" ? tables.sets.records : rankSets(tables.sets, text).map((candidate) => candidate.record);

  const categoriesGroup = formatList([
    categoriesHeader(categories.length, tables.categories),
    limit === undefined
      ? hierarchyBodyText(tables.categories)
      : formatList(
          categories.slice(0, limit).map((record) => rankedCategoryText(record, tables.categories)),
        ),
  ]);

  const promotionsPage = limit === undefined ? promotions : promotions.slice(0, limit);
  const promotionsGroup = formatList([
    `Found ${promotions.length} promotions`,
    formatList(promotionsPage.map(promotionRecordText)),
  ]);

  const setsPage = limit === undefined ? sets : sets.slice(0, limit);
  const setsGroup = formatList([`Found ${sets.length} sets`, formatList(setsPage.map(setRecordText))]);

  return `${formatList([promotionsGroup, categoriesGroup, setsGroup])}\n`;
}

export function registerCatalogCommand(program: Command): void {
  program
    .command("catalog")
    .description(
      `Categories, promotions and sets in one listing, each matched within its own kind against an optional text and bounded by a page size of ${DEFAULT_PAGE_SIZE} taken over the CLI's own copy of the branch's tables, a text sharing no word with any record of a kind leaving that kind empty; with no text, the promotions are printed, then the whole hierarchy, then the sets, in that fixed order, and the page size does not apply`,
    )
    .argument(
      "[name...]",
      "text to match the categories, the promotions and the sets by, each within its own kind, by the words of their own names",
    )
    .option(
      "--limit <n>",
      `page size per group, default ${DEFAULT_PAGE_SIZE}, taken over the CLI's own copy of the branch's tables; applies only where a text was given`,
    )
    .action(async (nameParts: string[], options: CatalogOptions) => {
      const name = nameParts.join(" ");
      const rawLimit = options.limit === undefined ? DEFAULT_PAGE_SIZE : requireInteger(options.limit);
      const limit = name === "" ? undefined : rawLimit;

      const { cart } = await shoppingCart.current();
      const shipment = cartShipment(cart);
      const deliveryType = cart.deliveryType as DeliveryType;

      const [categories, promotions, sets] = await Promise.all([
        readCategoryTable(shipment.branchId, deliveryType, cart.timeslot),
        readPromotionTable(shipment.branchId, deliveryType, cart.timeslot),
        readSetTable(shipment.branchId, deliveryType),
      ]);

      process.stdout.write(catalogText({ categories, promotions, sets }, name, limit));
    });
}
