import type { Command } from "commander";

import { requireBoolean } from "../utils/boolean.js";
import { requireInteger, requireNumber } from "../utils/number.js";
import { formatList, formatRows, indent } from "../utils/list.js";
import { KILOGRAM, formatAmount, formatPricedName, isWeightUnit } from "../utils/price.js";
import { formatEntryAsRow, formatEntryAsSection } from "../utils/record.js";
import { toOneLine } from "../utils/text.js";
import { toExternalId } from "../utils/slug.js";
import { shoppingCart, silpo } from "../daemon/client.js";
import { cartShipment } from "../daemon/cart.js";
import { type MatchCandidate } from "../resolve/matching.js";
import {
  PROBE_RESULT_LIMIT,
  QUESTION_OPTIONS,
  buildProductMatcher,
  productHasPromotion,
  searchTerms,
  tiedCandidates,
  type ProductCandidate,
  type ProductRequestContext,
  type TermSearch,
} from "../resolve/products.js";
import {
  isDescendantOf,
  rankCategories,
  readCategoryTable,
  type CategoryPathEntry,
  type CategoryRecord,
  type CategoryTable,
} from "../resolve/categories.js";
import { rankPromotions, readPromotionTable, type PromotionRecord, type PromotionTable } from "../resolve/promotions.js";
import { rankSets, readSetTable, type SetRecord, type SetTable } from "../resolve/sets.js";
import type * as tools from "../mcp/silpo.js";
import type {
  AddOrUpdateFavoriteProductsResult,
  FavoriteAction,
  GetProductDetailsResult,
} from "../mcp/silpo.js";
import type { DeliveryType } from "../mcp/entities/delivery.js";
import type { Product, SpecialPrice } from "../mcp/entities/product.js";

const COMMON = "common";
const UNAVAILABLE = "unavailable";

type CatalogKind = "category" | "promotion" | "set";

function dropCategoryDescendants(records: readonly CategoryRecord[]): readonly CategoryRecord[] {
  return records.filter(
    (record) => !records.some((other) => other !== record && isDescendantOf(record, other.slug)),
  );
}

const CATALOG_MATCH_MARGIN_RATIO = 0.3;
const PATH_SEPARATOR = " / ";

export type CatalogSettlement<T> =
  | { readonly kind: "miss" }
  | { readonly kind: "ask"; readonly candidates: readonly MatchCandidate<T>[] }
  | { readonly kind: "auto"; readonly record: T };

export function settleCatalog<T>(candidates: readonly MatchCandidate<T>[]): CatalogSettlement<T> {
  if (candidates.length === 0) return { kind: "miss" };

  const [top, second] = candidates;

  if (second !== undefined && !((top!.score - second.score) / top!.score > CATALOG_MATCH_MARGIN_RATIO)) {
    return { kind: "ask", candidates };
  }

  if (!top!.accounted) return { kind: "ask", candidates };

  return { kind: "auto", record: top!.record };
}

function pathText(path: readonly CategoryPathEntry[]): string {
  return path.map((entry) => entry.title ?? entry.slug).join(PATH_SEPARATOR);
}

function candidatesText(kind: string, rows: readonly string[]): string {
  return `${formatList([`Found ${rows.length} matching ${kind}`, formatList(rows)])}\n`;
}

function categoryCandidateRow(record: CategoryRecord): string {
  return formatRows([
    formatEntryAsRow("slug", record.slug),
    record.title !== undefined && formatEntryAsRow("title", record.title),
    record.count !== undefined && formatEntryAsRow("count", record.count),
    record.path.length > 0 && formatEntryAsRow("path", pathText(record.path)),
  ]);
}

function categoryCandidatesText(records: readonly CategoryRecord[]): string {
  return candidatesText("categories", records.map(categoryCandidateRow));
}

function promotionCandidateRow(record: PromotionRecord): string {
  return formatRows([
    formatEntryAsRow("code", record.code),
    formatEntryAsRow("title", record.title),
    formatEntryAsRow("products", record.count),
  ]);
}

function promotionCandidatesText(records: readonly PromotionRecord[]): string {
  return candidatesText("promotions", records.map(promotionCandidateRow));
}

function setCandidateRow(record: SetRecord): string {
  return formatRows([formatEntryAsRow("slug", record.slug), formatEntryAsRow("title", record.title)]);
}

function setCandidatesText(records: readonly SetRecord[]): string {
  return candidatesText("sets", records.map(setCandidateRow));
}

function resolveCatalogValues<T>(
  kind: CatalogKind,
  values: readonly string[],
  rankOne: (value: string) => readonly MatchCandidate<T>[],
  candidatesTextOf: (records: readonly T[]) => string,
): readonly T[] | undefined {
  if (values.length === 0) return [];

  const records: T[] = [];

  for (const value of values) {
    const settlement = settleCatalog(rankOne(value));

    if (settlement.kind === "miss") {
      throw new Error(`no ${kind} named ${JSON.stringify(value)}; catalog ${JSON.stringify(value)} finds it by title`);
    }
    if (settlement.kind === "ask") {
      process.stdout.write(
        candidatesTextOf(settlement.candidates.slice(0, QUESTION_OPTIONS).map((candidate) => candidate.record)),
      );
      process.exitCode = 1;
      return undefined;
    }

    records.push(settlement.record);
  }

  return records;
}

export const READ_CEILING = 500;
const SCOPE_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 10;
const ALTERNATIVES_LIMIT = 30;

const TRUNCATED_NOTE = `stopped after reading ${READ_CEILING} records`;
const PROBE_TRUNCATED_NOTE = `stopped after reading ${PROBE_RESULT_LIMIT} records of at least one query`;
const INTERSECTION_TRUNCATED_NOTE =
  "one side of the intersection was not read to its end, so this is a subset rather than the whole of it";

const NO_SELECTOR = "a listing needs a query or one of --category, --promotion, --set, --favorites";

type SelectorKind = "category" | "promotion" | "set" | "favorites";

type FindOptions = {
  category?: string[];
  promotion?: string[];
  set?: string[];
  favorites?: boolean;
  mustHavePromotion?: string;
  inStock?: string;
  fromPrice?: string;
  toPrice?: string;
  sortBy?: string;
  sortDirection?: string;
  limit?: string;
  details?: boolean;
};

type ParsedFilters = {
  mustHavePromotion: boolean | undefined;
  inStock: boolean | undefined;
  fromPrice: number | undefined;
  toPrice: number | undefined;
};

type Shipment = { branchId: string };
type CartLike = { deliveryType: string; timeslot: { start: string; end: string } };

function collectScope(value: string, previous: string[]): string[] {
  previous.push(value);
  return previous;
}

function parseFilters(options: FindOptions): ParsedFilters {
  return {
    mustHavePromotion:
      options.mustHavePromotion === undefined ? undefined : requireBoolean(options.mustHavePromotion),
    inStock: options.inStock === undefined ? undefined : requireBoolean(options.inStock),
    fromPrice: options.fromPrice === undefined ? undefined : requireNumber(options.fromPrice),
    toPrice: options.toPrice === undefined ? undefined : requireNumber(options.toPrice),
  };
}

function anyFilterActive(filters: ParsedFilters): boolean {
  return (
    filters.mustHavePromotion !== undefined ||
    filters.inStock !== undefined ||
    filters.fromPrice !== undefined ||
    filters.toPrice !== undefined
  );
}

function matchesFilters(product: Product, filters: ParsedFilters): boolean {
  return (
    (filters.mustHavePromotion === undefined || productHasPromotion(product) === filters.mustHavePromotion) &&
    (filters.inStock === undefined || product.available === filters.inStock) &&
    (filters.fromPrice === undefined || product.price >= filters.fromPrice) &&
    (filters.toPrice === undefined || product.price <= filters.toPrice)
  );
}

function sortFlag(options: FindOptions): string | undefined {
  if (options.sortBy !== undefined) return "--sort-by";
  if (options.sortDirection !== undefined) return "--sort-direction";
  return undefined;
}

function checkSort(
  options: FindOptions,
  kinds: readonly SelectorKind[],
  catalogCount: number,
  hasQuery: boolean,
): void {
  const flag = sortFlag(options);
  if (flag === undefined) return;

  const single = kinds.length === 1 && (kinds[0] === "category" || kinds[0] === "promotion" || kinds[0] === "set");
  if (single && catalogCount === 1 && !hasQuery) return;

  if (kinds.includes("favorites")) {
    throw new Error(`${flag} cannot be honoured: the saved products take no sort argument`);
  }
  if (hasQuery) {
    throw new Error(
      `${flag} conflicts with a query: the CLI ranks whatever a query was given for, and two orderings cannot both be the answer`,
    );
  }
  throw new Error(`${flag} cannot be honoured over a union: the order of a union is the CLI's own merge`);
}

function specialPricesText(prices: readonly SpecialPrice[]): string {
  return prices.map(({ type, price, count }) => `${type} ${price} for ${count}`).join(", ");
}

function sharedCompany(products: readonly { companyId: string | null }[]): string | null {
  const first = products[0];

  if (first === undefined || first.companyId === null) return null;

  return products.every(({ companyId }) => companyId === first.companyId) ? first.companyId : null;
}

function commonText(company: string | null): string | false {
  return (
    company !== null &&
    formatEntryAsSection(COMMON, indent(formatEntryAsRow("companyId", company)))
  );
}

function externalIdOf(product: Pick<Product, "slug" | "externalProductId">): number | undefined {
  if (product.externalProductId !== null) return product.externalProductId;

  const derived = toExternalId(product.slug);

  return derived === null ? undefined : derived;
}

type ProductAttributes = {
  readonly attributes?: Record<string, string | number>;
  readonly unit?: string;
};

type RecordExtra = {
  queries?: readonly string[];
  alternativeTo?: string;
  staticHalf?: ProductAttributes;
};

function attributesSection(staticHalf: ProductAttributes | undefined): string | false {
  const named = Object.entries(staticHalf?.attributes ?? {});

  if (named.length === 0) return false;

  return formatEntryAsSection(
    "attributes",
    indent(formatRows(named.map(([key, value]) => formatEntryAsRow(key, value)))),
  );
}

function productText(product: Product, company: string | null, extra?: RecordExtra): string {
  const {
    id,
    slug,
    name,
    price,
    oldPrice,
    stock,
    available,
    weighted,
    step,
    displayRatio,
    specialPrices,
    companyId,
  } = product;

  const unit = weighted ? KILOGRAM : null;
  const externalId = externalIdOf(product);

  return formatRows([
    formatEntryAsRow("id", id),
    formatEntryAsRow("slug", slug),
    externalId !== undefined && formatEntryAsRow("externalId", externalId),
    formatEntryAsRow("stock", formatAmount(stock, unit)),
    !available && "unavailable",
    weighted && formatEntryAsRow("step", formatAmount(step, unit)),
    specialPrices !== null &&
      specialPrices.length > 0 &&
      formatEntryAsRow("special", specialPricesText(specialPrices)),
    extra?.staticHalf?.unit !== undefined && formatEntryAsRow("unit", extra.staticHalf.unit),
    attributesSection(extra?.staticHalf),
    companyId !== null && companyId !== company && formatEntryAsRow("companyId", companyId),
    extra?.alternativeTo !== undefined && formatEntryAsRow("alternativeTo", extra.alternativeTo),
    extra?.queries !== undefined && formatEntryAsRow("queries", extra.queries.join(", ")),
    formatPricedName({ name, price, oldPrice, unit, size: weighted ? null : displayRatio }),
  ]);
}

function missingCardsNote(missing: readonly string[]): string | false {
  return missing.length > 0 && `no card for: ${missing.join(", ")}`;
}

function listingText(
  summary: string,
  products: readonly Product[],
  staticById: ReadonlyMap<string, ProductAttributes> | undefined,
  missing: readonly string[],
): string {
  const company = sharedCompany(products);
  const records = products.map((product) =>
    productText(product, company, staticById && { staticHalf: staticById.get(product.id) }),
  );
  const note = missingCardsNote(missing);
  const fullSummary = note === false ? summary : formatRows([summary, note]);

  return `${formatList([fullSummary, commonText(company), formatList(records)])}\n`;
}

function assembledListingText(
  summary: string,
  company: string | null,
  records: readonly string[],
  missing: readonly string[],
): string {
  const note = missingCardsNote(missing);
  const fullSummary = note === false ? summary : formatRows([summary, note]);

  return `${formatList([fullSummary, commonText(company), formatList(records)])}\n`;
}

function findSummary(
  count: number,
  results: readonly TermSearch[],
  truncatedNote: string | false,
  intersectionTruncated: boolean,
): string {
  const queries = results.map((result) => result.term);
  const head =
    queries.length > 1
      ? `Found ${count} products across ${queries.length} queries`
      : `Found ${count} products`;

  const rows: (string | false)[] = [head];

  if (intersectionTruncated) rows.push(INTERSECTION_TRUNCATED_NOTE);
  else if (truncatedNote !== false) rows.push(truncatedNote);

  if (queries.length > 1) {
    for (const { term, candidates } of results) rows.push(indent(`${toOneLine(term)} (found ${candidates.length})`));
  }

  return formatRows(rows);
}

async function fetchStaticHalves(
  detailsRequested: boolean,
  shipment: Shipment,
  cart: CartLike,
  products: readonly { id: string }[],
): Promise<{ byId: ReadonlyMap<string, ProductAttributes> | undefined; missing: readonly string[] }> {
  if (!detailsRequested || products.length === 0) return { byId: undefined, missing: [] };

  const byId = new Map<string, ProductAttributes>();
  const missing: string[] = [];

  await Promise.all(
    products.map(async (product) => {
      try {
        const { structured } = await silpo.getProductDetails({
          branchId: shipment.branchId,
          slug: product.id,
          deliveryType: cart.deliveryType,
          timeslotStart: cart.timeslot.start,
          timeslotEnd: cart.timeslot.end,
        });

        byId.set(product.id, {
          attributes: structured.product.attributes ?? undefined,
          unit: structured.product.ratio ?? undefined,
        });
      } catch {
        missing.push(product.id);
      }
    }),
  );

  return { byId, missing };
}

function decisiveTop(candidates: readonly ProductCandidate[]): ProductCandidate | undefined {
  const tied = tiedCandidates(candidates);

  return tied.length === 1 ? tied[0] : undefined;
}

function firstDecisiveUnavailable(
  results: readonly TermSearch[],
  pageIds: ReadonlySet<string>,
): Product | undefined {
  for (const { candidates } of results) {
    const top = decisiveTop(candidates);

    if (top === undefined) continue;
    if (!pageIds.has(top.product.id)) continue;
    if (!top.product.available || top.product.stock <= 0) return top.product;
  }

  return undefined;
}

/**
 * `perGroup` bounds what each query contributes. Bounding the merged list instead spends the whole
 * page on whichever query was written first: ten queries under a limit of four answered four of
 * them and returned nothing at all for the other six, while the summary above went on reporting a
 * count for every one.
 *
 * A product an earlier query already placed still spends the later query's allowance, so a query
 * repeated in other words does not double the page it is answered in. The residue of a selector the
 * queries ranked with it stays a filler: it reaches the page only where the queries left room.
 */
function flattenTermSearches(
  results: readonly TermSearch[],
  leftovers: readonly Product[] = [],
  perGroup = Number.POSITIVE_INFINITY,
): {
  order: readonly string[];
  productById: ReadonlyMap<string, Product>;
  matchedBy: ReadonlyMap<string, ReadonlySet<string>>;
} {
  const order: string[] = [];
  const productById = new Map<string, Product>();
  const matchedBy = new Map<string, Set<string>>();

  for (const { term, candidates } of results) {
    candidates.forEach((candidate, index) => {
      const id = candidate.product.id;
      // Which queries matched a product is recorded over all of them, not only over the ones the
      // allowance placed: a product another query put on the page was matched by this one too, and
      // the record has to say so wherever it appears.
      const set = matchedBy.get(id) ?? new Set<string>();
      set.add(term);
      matchedBy.set(id, set);

      if (index >= perGroup || productById.has(id)) return;

      productById.set(id, candidate.product);
      order.push(id);
    });
  }

  for (const product of leftovers) {
    if (order.length >= perGroup) break;
    if (productById.has(product.id)) continue;
    productById.set(product.id, product);
    order.push(product.id);
  }

  return { order, productById, matchedBy };
}

async function finishRankedListing(
  results: readonly TermSearch[],
  leftovers: readonly Product[],
  rawLimit: number | undefined,
  truncatedNote: string | false,
  intersectionTruncated: boolean,
  detailsRequested: boolean,
  shipment: Shipment,
  cart: CartLike,
): Promise<void> {
  const limit = rawLimit ?? DEFAULT_PAGE_SIZE;

  const { order, productById, matchedBy } = flattenTermSearches(results, leftovers, limit);
  const pageIds = order;
  const pageProducts = pageIds.map((id) => productById.get(id)!);

  const decisive = firstDecisiveUnavailable(results, new Set(pageIds));
  let alternatives: readonly Product[] = [];
  let alternativeHandle: string | undefined;

  if (decisive !== undefined) {
    const { structured } = await silpo.getSimilarProducts({
      branchId: shipment.branchId,
      slug: decisive.slug,
      deliveryType: cart.deliveryType,
      timeslotStart: cart.timeslot.start,
      timeslotEnd: cart.timeslot.end,
      limit: ALTERNATIVES_LIMIT,
    });

    alternatives = structured.products;
    alternativeHandle = decisive.slug;
  }

  const company = sharedCompany([...pageProducts, ...alternatives]);

  const { byId: staticById, missing } = await fetchStaticHalves(detailsRequested, shipment, cart, [
    ...pageProducts,
    ...alternatives,
  ]);

  const mainRecords = pageProducts.map((product) => {
    const matched = matchedBy.get(product.id);

    return productText(product, company, {
      queries: matched !== undefined && matched.size > 1 ? [...matched] : undefined,
      staticHalf: staticById?.get(product.id),
    });
  });

  const altRecords = alternatives.map((product) =>
    productText(product, company, { alternativeTo: alternativeHandle, staticHalf: staticById?.get(product.id) }),
  );

  const summary = findSummary(order.length, results, truncatedNote, intersectionTruncated);

  process.stdout.write(assembledListingText(summary, company, [...mainRecords, ...altRecords], missing));
}

async function runCatalogSearch(
  queries: readonly string[],
  filters: ParsedFilters,
  rawLimit: number | undefined,
  detailsRequested: boolean,
  shipment: Shipment,
  cart: CartLike,
): Promise<void> {
  const context: ProductRequestContext = {
    branchId: shipment.branchId,
    deliveryType: cart.deliveryType as DeliveryType,
    timeslotStart: cart.timeslot.start,
    timeslotEnd: cart.timeslot.end,
  };

  const results = await searchTerms(silpo, context, queries);

  const filtered = anyFilterActive(filters)
    ? results.map((result) => ({
        ...result,
        candidates: result.candidates.filter((candidate) => matchesFilters(candidate.product, filters)),
      }))
    : results;

  const truncatedNote = filtered.some((result) => result.truncated) ? PROBE_TRUNCATED_NOTE : false;

  await finishRankedListing(filtered, [], rawLimit, truncatedNote, false, detailsRequested, shipment, cart);
}

function matchScopeTerm(products: readonly Product[], term: string): TermSearch {
  const positionById = new Map(products.map((product, index) => [product.id, index] as const));
  const matcher = buildProductMatcher(products);

  const candidates: ProductCandidate[] = matcher
    .search(term)
    .map(({ record, accounted, score }) => ({
      product: record,
      coordination: accounted ? 1 : 0,
      position: positionById.get(record.id) ?? 0,
      accounted,
      score,
    }))
    .sort((a, b) => (a.coordination !== b.coordination ? b.coordination - a.coordination : a.position - b.position));

  return { term, probes: [], candidates, truncated: false };
}

async function readPaged(
  ceiling: number,
  fetchPage: (limit: number, offset: number) => Promise<{ products: readonly Product[]; total: number }>,
): Promise<{ products: Product[]; truncated: boolean }> {
  const read: Product[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < ceiling) {
    const remaining = ceiling - offset;
    const { products, total: pageTotal } = await fetchPage(Math.min(SCOPE_PAGE_SIZE, remaining), offset);

    read.push(...products);
    offset += products.length;
    total = pageTotal;

    if (products.length === 0 || offset >= total) break;
  }

  return { products: read, truncated: offset < total };
}

type ScopeRequest = {
  branchId: string;
  deliveryType: DeliveryType;
  timeslotStart: string;
  timeslotEnd: string;
  category?: string;
  set?: string;
  promotionCode?: string;
  mustHavePromotion?: boolean;
  inStock?: boolean;
  fromPrice?: number;
  toPrice?: number;
  sortBy?: tools.ProductSortBy;
  sortDirection?: tools.SortDirection;
};

function scopeRequestFields(kind: CatalogKind, handle: string): Pick<ScopeRequest, "category" | "set" | "promotionCode"> {
  if (kind === "category") return { category: handle };
  if (kind === "promotion") return { promotionCode: handle };

  return { set: handle };
}

function scopeBase(
  kind: CatalogKind,
  handle: string,
  shipment: Shipment,
  cart: CartLike,
  filters: ParsedFilters,
): ScopeRequest {
  return {
    branchId: shipment.branchId,
    deliveryType: cart.deliveryType as DeliveryType,
    timeslotStart: cart.timeslot.start,
    timeslotEnd: cart.timeslot.end,
    ...scopeRequestFields(kind, handle),
    mustHavePromotion: filters.mustHavePromotion,
    inStock: filters.inStock,
    fromPrice: filters.fromPrice,
    toPrice: filters.toPrice,
  };
}

async function readAllPopulation(
  fetchPage: (
    limit: number,
    offset: number,
  ) => Promise<{ structured: { products: readonly Product[]; meta: { total: number } } }>,
): Promise<{ products: Product[]; truncated: boolean }> {
  return readPaged(READ_CEILING, (limit, offset) =>
    fetchPage(limit, offset).then(({ structured }) => ({
      products: structured.products,
      total: structured.meta.total,
    })),
  );
}

async function readAllScope(base: ScopeRequest): Promise<{ products: Product[]; truncated: boolean }> {
  return readAllPopulation((limit, offset) => silpo.getProducts({ ...base, limit, offset }));
}

async function readAllFavorites(
  shipment: Shipment,
  cart: CartLike,
): Promise<{ products: Product[]; truncated: boolean }> {
  return readAllPopulation((limit, offset) =>
    silpo.getMyFavorites({
      branchId: shipment.branchId,
      deliveryType: cart.deliveryType as DeliveryType,
      timeslotStart: cart.timeslot.start,
      limit,
      offset,
    }),
  );
}

function dedupeById(products: readonly Product[]): Product[] {
  const seen = new Set<string>();
  const result: Product[] = [];

  for (const product of products) {
    if (seen.has(product.id)) continue;
    seen.add(product.id);
    result.push(product);
  }

  return result;
}

async function runLonePopulation(
  fetchPage: () => Promise<{ structured: { summary: string; products: readonly Product[] } }>,
  detailsRequested: boolean,
  shipment: Shipment,
  cart: CartLike,
): Promise<void> {
  const { structured: payload } = await fetchPage();

  const { byId, missing } = await fetchStaticHalves(detailsRequested, shipment, cart, payload.products);

  process.stdout.write(listingText(payload.summary, payload.products, byId, missing));
}

type PopulationHandle = { kind: CatalogKind; handle: string } | { kind: "favorites" };

function singlePopulationHandle(
  kinds: readonly SelectorKind[],
  prunedCategories: readonly CategoryRecord[],
  promotionRecords: readonly PromotionRecord[],
  setRecords: readonly SetRecord[],
  queries: readonly string[],
  filters: ParsedFilters,
): PopulationHandle | undefined {
  if (queries.length !== 0 || kinds.length !== 1) return undefined;

  const [kind] = kinds;

  if (kind === "category" && prunedCategories.length === 1) {
    return { kind: "category", handle: prunedCategories[0]!.slug };
  }
  if (kind === "promotion" && promotionRecords.length === 1) {
    return { kind: "promotion", handle: promotionRecords[0]!.code };
  }
  if (kind === "set" && setRecords.length === 1) return { kind: "set", handle: setRecords[0]!.slug };
  if (kind === "favorites" && !anyFilterActive(filters)) return { kind: "favorites" };

  return undefined;
}

async function runSinglePopulation(
  population: PopulationHandle,
  options: FindOptions,
  filters: ParsedFilters,
  rawLimit: number | undefined,
  detailsRequested: boolean,
  shipment: Shipment,
  cart: CartLike,
): Promise<void> {
  const fetchPage =
    population.kind === "favorites"
      ? () =>
          silpo.getMyFavorites({
            branchId: shipment.branchId,
            deliveryType: cart.deliveryType as DeliveryType,
            timeslotStart: cart.timeslot.start,
            limit: rawLimit,
          })
      : () =>
          silpo.getProducts({
            ...scopeBase(population.kind, population.handle, shipment, cart, filters),
            sortBy: options.sortBy as tools.ProductSortBy | undefined,
            sortDirection: options.sortDirection as tools.SortDirection | undefined,
            limit: rawLimit,
          });

  await runLonePopulation(fetchPage, detailsRequested, shipment, cart);
}

async function readAllScopeUnion(
  kind: CatalogKind,
  handles: readonly string[],
  shipment: Shipment,
  cart: CartLike,
  filters: ParsedFilters,
): Promise<{ products: Product[]; truncated: boolean }> {
  const reads = await Promise.all(
    handles.map((handle) => readAllScope(scopeBase(kind, handle, shipment, cart, filters))),
  );

  return {
    products: dedupeById(reads.flatMap((read) => read.products)),
    truncated: reads.some((read) => read.truncated),
  };
}

async function runComposed(
  categoryHandles: readonly string[],
  promotionHandles: readonly string[],
  setHandles: readonly string[],
  favoritesActive: boolean,
  queries: readonly string[],
  filters: ParsedFilters,
  rawLimit: number | undefined,
  detailsRequested: boolean,
  shipment: Shipment,
  cart: CartLike,
): Promise<void> {
  const pools: { kind: SelectorKind; products: Product[]; truncated: boolean }[] = [];

  if (categoryHandles.length > 0) {
    const { products, truncated } = await readAllScopeUnion("category", categoryHandles, shipment, cart, filters);
    pools.push({ kind: "category", products, truncated });
  }

  if (promotionHandles.length > 0) {
    const { products, truncated } = await readAllScopeUnion("promotion", promotionHandles, shipment, cart, filters);
    pools.push({ kind: "promotion", products, truncated });
  }

  if (setHandles.length > 0) {
    const { products, truncated } = await readAllScopeUnion("set", setHandles, shipment, cart, filters);
    pools.push({ kind: "set", products, truncated });
  }

  if (favoritesActive) {
    const { products, truncated } = await readAllFavorites(shipment, cart);
    pools.push({ kind: "favorites", products, truncated });
  }

  const isIntersection = pools.length > 1;
  const primary = pools[0]!;

  let assembled: Product[];
  let truncated = false;
  let intersectionTruncated = false;

  if (isIntersection) {
    const idSets = pools.map((pool) => new Set(pool.products.map((product) => product.id)));

    assembled = primary.products.filter((product) => idSets.every((set) => set.has(product.id)));
    intersectionTruncated = pools.some((pool) => pool.truncated);
  } else {
    assembled = primary.products;
    truncated = primary.truncated;
  }

  const filtered = assembled.filter((product) => matchesFilters(product, filters));

  if (queries.length === 0) {
    const limit = rawLimit ?? DEFAULT_PAGE_SIZE;
    const page = filtered.slice(0, limit);

    const { byId, missing } = await fetchStaticHalves(detailsRequested, shipment, cart, page);
    const summary = findSummary(filtered.length, [], truncated ? TRUNCATED_NOTE : false, intersectionTruncated);

    process.stdout.write(listingText(summary, page, byId, missing));
    return;
  }

  const results = queries.map((term) => matchScopeTerm(filtered, term));

  await finishRankedListing(
    results,
    filtered,
    rawLimit,
    truncated ? TRUNCATED_NOTE : false,
    intersectionTruncated,
    detailsRequested,
    shipment,
    cart,
  );
}

async function runFind(options: FindOptions, queryArgs: readonly string[]): Promise<void> {
  const categoryValues = options.category ?? [];
  const promotionValues = options.promotion ?? [];
  const setValues = options.set ?? [];
  const favoritesActive = options.favorites === true;
  const queries = [...queryArgs];

  const kinds: SelectorKind[] = [];
  if (categoryValues.length > 0) kinds.push("category");
  if (promotionValues.length > 0) kinds.push("promotion");
  if (setValues.length > 0) kinds.push("set");
  if (favoritesActive) kinds.push("favorites");

  if (kinds.length === 0 && queries.length === 0) throw new Error(NO_SELECTOR);

  const catalogCount = categoryValues.length + promotionValues.length + setValues.length;
  checkSort(options, kinds, catalogCount, queries.length > 0);

  const filters = parseFilters(options);
  const rawLimit = options.limit === undefined ? undefined : requireInteger(options.limit);
  const detailsRequested = options.details === true;

  const { cart } = await shoppingCart.current();
  const shipment = cartShipment(cart);

  if (kinds.length === 0) {
    await runCatalogSearch(queries, filters, rawLimit, detailsRequested, shipment, cart);
    return;
  }

  const deliveryType = cart.deliveryType as DeliveryType;

  const [categoryTable, promotionTable, setTable]: [
    CategoryTable | undefined,
    PromotionTable | undefined,
    SetTable | undefined,
  ] = await Promise.all([
    categoryValues.length === 0
      ? undefined
      : readCategoryTable(shipment.branchId, deliveryType, cart.timeslot),
    promotionValues.length === 0
      ? undefined
      : readPromotionTable(shipment.branchId, deliveryType, cart.timeslot),
    setValues.length === 0 ? undefined : readSetTable(shipment.branchId, deliveryType),
  ]);

  const categoryRecords = resolveCatalogValues(
    "category",
    categoryValues,
    (value) => rankCategories(categoryTable!, value),
    categoryCandidatesText,
  );
  if (categoryRecords === undefined) return;

  const promotionRecords = resolveCatalogValues(
    "promotion",
    promotionValues,
    (value) => rankPromotions(promotionTable!, value),
    promotionCandidatesText,
  );
  if (promotionRecords === undefined) return;

  const setRecords = resolveCatalogValues(
    "set",
    setValues,
    (value) => rankSets(setTable!, value),
    setCandidatesText,
  );
  if (setRecords === undefined) return;

  const prunedCategories = dropCategoryDescendants(categoryRecords);

  const population = singlePopulationHandle(kinds, prunedCategories, promotionRecords, setRecords, queries, filters);

  if (population !== undefined) {
    await runSinglePopulation(population, options, filters, rawLimit, detailsRequested, shipment, cart);
    return;
  }

  await runComposed(
    prunedCategories.map((record) => record.slug),
    promotionRecords.map((record) => record.code),
    setRecords.map((record) => record.slug),
    favoritesActive,
    queries,
    filters,
    rawLimit,
    detailsRequested,
    shipment,
    cart,
  );
}

export function productCardText(payload: GetProductDetailsResult): string {
  const {
    id,
    name,
    slug,
    price,
    oldPrice,
    stock,
    available,
    step,
    ratio,
    displayRatio,
    attributes,
    companyId,
  } = payload.product;

  const unit = isWeightUnit(ratio) ? ratio : null;
  const externalId = toExternalId(slug);

  const card = formatRows([
    formatEntryAsRow("id", id),
    formatEntryAsRow("slug", slug),
    externalId !== null && formatEntryAsRow("externalId", externalId),
    formatEntryAsRow("stock", formatAmount(stock, unit)),
    !available && UNAVAILABLE,
    unit !== null && formatEntryAsRow("step", formatAmount(step, unit)),
    formatEntryAsRow("companyId", companyId),
    formatPricedName({ name, price, oldPrice, unit, size: unit === null ? displayRatio : null }),
  ]);

  const body = formatList([card, attributesSection({ attributes: attributes ?? undefined, unit: undefined })]);

  return `${body}\n`;
}

type LookupContext = {
  shipment: Shipment;
  deliveryType: string;
  timeslot: { start: string; end: string };
};

type ResolvedFavorite = {
  productId: string;
  externalProductId: number;
};

async function resolveFavorite(
  handle: string,
  context: () => Promise<LookupContext>,
): Promise<ResolvedFavorite> {
  const { shipment, deliveryType, timeslot } = await context();
  const { structured } = await silpo.getProductDetails({
    branchId: shipment.branchId,
    slug: handle,
    deliveryType,
    timeslotStart: timeslot.start,
    timeslotEnd: timeslot.end,
  });

  const externalProductId = toExternalId(structured.product.slug);

  if (externalProductId === null) {
    throw new Error(`${handle} resolves to no external product id`);
  }

  return { productId: structured.product.id, externalProductId };
}

export function favoritesUpdateText(payload: AddOrUpdateFavoriteProductsResult): string {
  const actions = payload.actions.map(({ productId, toDelete }) =>
    formatEntryAsRow(toDelete ? "removed" : "added", productId),
  );

  return `${formatList([payload.summary, formatRows(actions)])}\n`;
}

async function runFavoriteWrite(handles: readonly string[], toDelete: boolean): Promise<void> {
  let lookup: Promise<LookupContext> | undefined;

  const context = (): Promise<LookupContext> => {
    lookup ??= shoppingCart.current().then(({ cart }) => ({
      shipment: cartShipment(cart),
      deliveryType: cart.deliveryType,
      timeslot: cart.timeslot,
    }));

    return lookup;
  };

  const resolved = await Promise.all(handles.map((handle) => resolveFavorite(handle, context)));

  const actions: FavoriteAction[] = resolved.map(({ productId, externalProductId }) => ({
    productId,
    externalProductId,
    toDelete,
  }));

  const { structured: payload } = await silpo.addOrUpdateFavoriteProducts({ actions });

  process.stdout.write(favoritesUpdateText(payload));

  if (!payload.success) process.exitCode = 1;
}

export function registerProductsCommand(program: Command): void {
  const products = program
    .command("products")
    .description("The product listing, the single card, and the saved-products writes");

  products
    .command("find")
    .description(
      `List products: a free-text query, or --category/--promotion/--set/--favorites composed by kind — repeated within one kind unions, different kinds intersect. A query with no selector orders the catalogue's own answer to it and its expansions — each of its words, and a transliteration where it carries Latin characters — sent together in one round of calls, batched at the server's limit of 30 probes per call; a product the catalogue returned is never dropped, whatever the CLI's own matching made of it. Everywhere the CLI narrows a population itself — a catalogue population, the saved products, a union, an intersection — it reads through at most ${READ_CEILING} records and says so if that stopped it short. A bare query's own probes are a population the CLI cannot page past ${PROBE_RESULT_LIMIT} records each, and the listing says so where that cap is what stopped it, rather than reporting the ${READ_CEILING} ceiling it never approached. With --details, it fetches a card for every printed product, concurrently, and names any it could not get one for; the rest of the page is unaffected.`,
    )
    .argument(
      "[query...]",
      "one or more free-text queries; each is matched over the chosen population, or chooses the catalogue itself where no selector is given",
    )
    .option(
      "--category <name>",
      "a category, by slug, identifier or title; names its whole subtree; repeatable, unions; intersects with --promotion or --set",
      collectScope,
      [],
    )
    .option(
      "--promotion <name>",
      "a promotion, by code or title; repeatable, unions; intersects with --category or --set",
      collectScope,
      [],
    )
    .option(
      "--set <name>",
      "a curated set, by slug or title; repeatable, unions; intersects with --category or --promotion",
      collectScope,
      [],
    )
    .option("--favorites", "the caller's saved products")
    .option("--must-have-promotion <bool>", "only products carrying a promotion")
    .option("--in-stock <bool>", "only products in stock")
    .option("--from-price <amount>", "lowest price")
    .option("--to-price <amount>", "highest price")
    .option(
      "--sort-by <field>",
      "popularity, score, title, price, promotion, productsList, slugsList, guestRating, carouselList; honoured only over one category, one promotion or one set, with no query",
    )
    .option(
      "--sort-direction <dir>",
      "asc or desc; honoured only over one category, one promotion or one set, with no query",
    )
    .option("--limit <n>", "how many products each query is answered with, 10 by default")
    .option("--details", "print each product's static half beside it — its attributes and the unit it is counted in")
    .action(async (query: string[], options: FindOptions) => {
      await runFind(options, query);
    });

  products
    .command("card")
    .description("Full product card: composition, nutrition, attributes")
    .argument("<product>", "product uuid, slug or external product id")
    .action(async (product: string) => {
      const { cart } = await shoppingCart.current();
      const { structured: payload } = await silpo.getProductDetails({
        branchId: cartShipment(cart).branchId,
        slug: product,
        deliveryType: cart.deliveryType,
        timeslotStart: cart.timeslot.start,
        timeslotEnd: cart.timeslot.end,
      });

      process.stdout.write(productCardText(payload));
    });

  products
    .command("favorite")
    .description("Save products, named by uuid, slug or external product id, up to 5 per call")
    .argument("<product...>", "products to save")
    .action(async (handles: string[]) => {
      await runFavoriteWrite(handles, false);
    });

  products
    .command("unfavorite")
    .description("Remove products from the saved list, named by uuid, slug or external product id, up to 5 per call")
    .argument("<product...>", "products to remove")
    .action(async (handles: string[]) => {
      await runFavoriteWrite(handles, true);
    });
}
