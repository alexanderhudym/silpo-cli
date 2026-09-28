import { createRequire } from "node:module";

import type { DeliveryType } from "../mcp/entities/delivery.js";
import type { OfflineOrder, OnlineOrder } from "../mcp/entities/order.js";
import type { Product } from "../mcp/entities/product.js";
import type { SilpoSurface } from "../mcp/surface.js";
import { stem } from "../utils/stem.js";
import { readCapped } from "../utils/paginate.js";
import { ceilToStep, isMultipleOfStep, stepMultiple } from "../utils/step.js";
import { OFFLINE_ORDERS_CAP, ONLINE_ORDERS_CAP } from "../mcp/silpo.js";
import { buildMatcher, type Matcher } from "./matching.js";
import type { PackUnit, ParsedItem } from "./normalize.js";
import { parseProductName } from "./product-name.js";

export const QUESTION_OPTIONS = 8;

type CyrillicToTranslit = (config?: { preset: "ru" | "uk" | "mn" }) => {
  transform(input: string, spaceReplacement?: string): string;
  reverse(input: string, spaceReplacement?: string): string;
};

const require = createRequire(import.meta.url);
const cyrillicToTranslit = require("cyrillic-to-translit-js") as CyrillicToTranslit;
const productTransliterator = cyrillicToTranslit({ preset: "uk" });

const LATIN_LETTER = /\p{Script=Latin}/u;
const NORMALIZE_OUT = /[’&]/gu;
const NUMBER = "\\d+(?:[.,]\\d+)?";
const PURELY_NUMERIC = new RegExp(`^${NUMBER}$`, "u");
const MIN_PROBE_WORD_LENGTH = 2;

const UNMAPPED_LATIN_LETTERS = /[cjqwx]/gi;
const UNMAPPED_LATIN_REPLACEMENT: Readonly<Record<string, string>> = { c: "k", j: "y", q: "k", w: "v", x: "ks" };

function fillUnmappedLatin(text: string): string {
  return text.replace(UNMAPPED_LATIN_LETTERS, (letter) => {
    const lower = letter.toLowerCase();
    const replacement = UNMAPPED_LATIN_REPLACEMENT[lower]!;

    return letter === lower ? replacement : replacement.toUpperCase();
  });
}

function normalizeProbe(text: string): string {
  return text.replace(NORMALIZE_OUT, "").replace(/\s+/gu, " ").trim();
}

function probeWords(term: string): readonly string[] {
  return term
    .trim()
    .split(/\s+/u)
    .filter((word) => word.length > MIN_PROBE_WORD_LENGTH && !PURELY_NUMERIC.test(word));
}

export function expandProbes(term: string): readonly string[] {
  const trimmed = term.trim();

  if (trimmed === "") return [];

  const candidates = [
    trimmed,
    ...probeWords(trimmed),
    ...(LATIN_LETTER.test(trimmed) ? [productTransliterator.reverse(fillUnmappedLatin(trimmed))] : []),
  ];

  const seen = new Set<string>();
  const probes: string[] = [];

  for (const candidate of candidates) {
    const normalized = normalizeProbe(candidate);

    if (normalized === "" || seen.has(normalized)) continue;

    seen.add(normalized);
    probes.push(normalized);
  }

  return probes;
}

export type ProductClient = Pick<
  SilpoSurface,
  "findProductsBatch" | "getMyOnlineOrders" | "getMyOfflineOrders" | "getMyFavorites"
>;

export type ProductRequestContext = {
  readonly branchId: string;
  readonly deliveryType: DeliveryType;
  readonly timeslotStart: string;
  readonly timeslotEnd: string;
};

export type ProductCandidate = {
  readonly product: Product;
  readonly coordination: number;
  readonly position: number;
  readonly accounted: boolean;
  /** How well the product's own name answers the term, as the matcher scored it. */
  readonly score: number;
};

export type TermSearch = {
  readonly term: string;
  readonly probes: readonly string[];
  readonly candidates: readonly ProductCandidate[];
  readonly truncated: boolean;
};

const PROBE_BATCH_SIZE = 30;
export const PROBE_RESULT_LIMIT = 100;

function chunk<T>(items: readonly T[], size: number): T[][] {
  const groups: T[][] = [];

  for (let index = 0; index < items.length; index += size) groups.push(items.slice(index, index + size));

  return groups;
}

type ProbeAnswer = { readonly products: readonly Product[]; readonly totalFound: number };

async function fetchProbeAnswers(
  client: ProductClient,
  context: ProductRequestContext,
  probes: readonly string[],
): Promise<ReadonlyMap<string, ProbeAnswer>> {
  const answers = new Map<string, ProbeAnswer>();

  await Promise.all(
    chunk(probes, PROBE_BATCH_SIZE).map(async (batch) => {
      const { structured } = await client.findProductsBatch({
        branchId: context.branchId,
        deliveryType: context.deliveryType,
        timeslotStart: context.timeslotStart,
        timeslotEnd: context.timeslotEnd,
        products: [...batch],
        limit: PROBE_RESULT_LIMIT,
      });

      for (const { query, products, totalFound } of structured.queries) {
        answers.set(query, { products, totalFound });
      }
    }),
  );

  return answers;
}

type RawCandidate = { readonly product: Product; readonly coordination: number; readonly position: number };

function mergeCandidates(
  probes: readonly string[],
  answers: ReadonlyMap<string, ProbeAnswer>,
): readonly RawCandidate[] {
  const byId = new Map<string, RawCandidate>();

  for (const probe of probes) {
    const answer = answers.get(probe);

    if (answer === undefined) continue;

    answer.products.forEach((product, position) => {
      const existing = byId.get(product.id);

      byId.set(product.id, {
        product,
        coordination: (existing?.coordination ?? 0) + 1,
        position: existing === undefined ? position : Math.min(existing.position, position),
      });
    });
  }

  return [...byId.values()];
}

type PackCategory = "mass" | "volume" | "count";

const PACK_SIZE_UNIT_SCALE: Readonly<Record<string, number>> = { "г": 1, "кг": 1000, "мл": 1, "л": 1000, "шт": 1 };
const PACK_SIZE_UNIT_CATEGORY: Readonly<Record<string, PackCategory>> = {
  "г": "mass",
  "кг": "mass",
  "мл": "volume",
  "л": "volume",
  "шт": "count",
};
const DISPLAY_RATIO = new RegExp(`^(${NUMBER})\\s*(кг|мл|г|л|шт)(?![\\p{L}]).*$`, "u");

type PayloadPackSize = { readonly value: number; readonly category: PackCategory };

function payloadPackSize(product: {
  readonly weighted: boolean;
  readonly displayRatio: string | null;
}): PayloadPackSize | undefined {
  if (product.weighted) return undefined;

  const match = DISPLAY_RATIO.exec((product.displayRatio ?? "").trim());

  if (match === null) return undefined;

  const unit = match[2]!;

  return {
    value: Number(match[1]!.replace(",", ".")) * PACK_SIZE_UNIT_SCALE[unit]!,
    category: PACK_SIZE_UNIT_CATEGORY[unit]!,
  };
}

function payloadPackCandidate(product: Product): { readonly value: number; readonly unit: PackUnit } | undefined {
  if (product.weighted) return undefined;

  const match = DISPLAY_RATIO.exec((product.displayRatio ?? "").trim());

  if (match === null) return undefined;

  const unit = match[2]!;

  if (unit === "шт") return undefined;

  return { value: Number(match[1]!.replace(",", ".")), unit: unit as PackUnit };
}

function compareCandidates(a: RawCandidate, b: RawCandidate): number {
  if (a.coordination !== b.coordination) return b.coordination - a.coordination;
  if (a.position !== b.position) return a.position - b.position;

  const aPack = payloadPackSize(a.product);
  const bPack = payloadPackSize(b.product);

  return aPack !== undefined && bPack !== undefined && aPack.category === bPack.category
    ? aPack.value - bPack.value
    : 0;
}

function slugWords(slug: string): string {
  const segments = slug.split("-");
  const tail = segments[segments.length - 1];

  if (segments.length > 1 && tail !== undefined && /^\d+$/.test(tail)) segments.pop();

  return segments.join(" ");
}

type ProductMatchDocument = { readonly key: string; readonly name: string; readonly slugWords: string };

const PRODUCT_FIELDS = ["name", "slugWords"] as const;

export function buildProductMatcher(products: readonly Product[]): Matcher<Product> {
  return buildMatcher<Product, ProductMatchDocument>(
    products,
    (product) => product.id,
    PRODUCT_FIELDS,
    (product) => ({ key: product.id, name: product.name, slugWords: slugWords(product.slug) }),
    { prefix: false, processTerm: stem },
  );
}

type TermMatch = { readonly accounted: boolean; readonly score: number };

function matchMapFor(products: readonly Product[], term: string): ReadonlyMap<string, TermMatch> {
  const matcher = buildProductMatcher(products);
  const matches = new Map<string, TermMatch>();

  for (const candidate of matcher.search(term)) {
    matches.set(candidate.record.id, { accounted: candidate.accounted, score: candidate.score });
  }

  return matches;
}

function probeTruncated(answer: ProbeAnswer | undefined): boolean {
  return answer !== undefined && answer.products.length < answer.totalFound;
}

export async function searchTerms(
  client: ProductClient,
  context: ProductRequestContext,
  terms: readonly string[],
): Promise<readonly TermSearch[]> {
  const probesByTerm = new Map(terms.map((term) => [term, expandProbes(term)] as const));
  const allProbes = [...new Set([...probesByTerm.values()].flat())];

  const answers = await fetchProbeAnswers(client, context, allProbes);

  return terms.map((term) => {
    const probes = probesByTerm.get(term)!;
    const sorted = [...mergeCandidates(probes, answers)].sort(compareCandidates);
    const matches = matchMapFor(
      sorted.map((entry) => entry.product),
      term,
    );

    const candidates: ProductCandidate[] = sorted.map((entry) => ({
      product: entry.product,
      coordination: entry.coordination,
      position: entry.position,
      accounted: matches.get(entry.product.id)?.accounted ?? false,
      score: matches.get(entry.product.id)?.score ?? 0,
    }));

    const truncated = probes.some((probe) => probeTruncated(answers.get(probe)));

    return { term, probes, candidates, truncated };
  });
}

export type TermSettlement =
  | { readonly kind: "auto"; readonly chosen: ProductCandidate }
  | { readonly kind: "ask" };

export type TieBreakSignals = {
  readonly bought: ReadonlySet<string>;
  readonly saved: ReadonlySet<string>;
};

/** Kept as divisors: scaling grams by a reciprocal lands 950 г on 0.9500000000000001 kilograms. */
const MASS_PER_KILOGRAM: Readonly<Record<string, number>> = { "кг": 1, "г": 1000 };

export function countedSteps(count: number, step: number): number {
  const whole = ceilToStep(count, 1);

  return step > 0 ? stepMultiple(whole, step) : whole;
}

function convertedMass(item: ParsedItem, product: { readonly weighted: boolean }): number | undefined {
  if (!product.weighted || item.packCandidate === undefined) return undefined;

  const per = MASS_PER_KILOGRAM[item.packCandidate.unit];

  if (per === undefined) return undefined;

  return item.packCandidate.value / per;
}

export type QuantityNote = "raised" | "steps" | "packs" | "chosen";

export type OrderedWeight = { readonly quantity: number; readonly note: QuantityNote | undefined };

/**
 * The quantity and what to note about it come from one weight, read once: asking a second,
 * independent rule the same question let the two drift apart, which is how an amount already a
 * legal multiple of the step was moved by a whole step while the note beside it kept silent.
 * Where the payload names no usable step, the note is "chosen" unconditionally: the branch cannot
 * honour a fractional mass at all, so every such amount is one the CLI settled on rather than one
 * the step confirmed.
 */
export function orderedWeight(
  item: ParsedItem,
  product: { readonly weighted: boolean; readonly step: number },
): OrderedWeight | undefined {
  const weight = convertedMass(item, product);

  if (weight === undefined) return undefined;

  const quantity = ceilToStep(weight, product.step);
  const note: QuantityNote | undefined =
    product.step > 0 ? (isMultipleOfStep(weight, product.step) ? undefined : "raised") : "chosen";

  return { quantity, note };
}

export type OrderedCount = { readonly quantity: number; readonly note: QuantityNote | undefined };

export function orderedCount(
  item: ParsedItem,
  product: { readonly weighted: boolean; readonly displayRatio: string | null; readonly step: number },
): OrderedCount | undefined {
  if (item.countCandidate === undefined) return undefined;

  const pack = payloadPackSize(product);

  if (pack?.category === "count") {
    const packs = Math.ceil(item.countCandidate / pack.value);
    const note: QuantityNote | undefined = isMultipleOfStep(item.countCandidate, pack.value) ? undefined : "packs";

    return { quantity: countedSteps(packs, product.step), note };
  }

  if (product.weighted) {
    return { quantity: countedSteps(item.countCandidate, product.step), note: "steps" };
  }

  const quantity = countedSteps(item.countCandidate, product.step);
  const note: QuantityNote | undefined =
    Number.isInteger(item.countCandidate) && isMultipleOfStep(item.countCandidate, product.step)
      ? undefined
      : "raised";

  return { quantity, note };
}

export function matchesSpecification(item: ParsedItem, product: Product): boolean {
  const parsedName = parseProductName(product.name);

  if (item.specification !== undefined) {
    if (parsedName.specification === undefined || parsedName.specification.value !== item.specification.value) {
      return false;
    }
  }

  if (item.packCandidate !== undefined) {
    const isMassUnit = MASS_PER_KILOGRAM[item.packCandidate.unit] !== undefined;
    const appliesAsQuantity = product.weighted && isMassUnit;

    if (!appliesAsQuantity) {
      const pack =
        payloadPackCandidate(product) ??
        (!product.weighted && parsedName.packSize !== undefined && parsedName.packUnit !== undefined
          ? { value: parsedName.packSize, unit: parsedName.packUnit }
          : undefined);

      if (pack === undefined || pack.value !== item.packCandidate.value || pack.unit !== item.packCandidate.unit) {
        return false;
      }
    }
  }

  return true;
}

export function productHasPromotion(product: Product): boolean {
  const discounted = product.oldPrice !== null && product.oldPrice > product.price;

  return discounted || (product.specialPrices !== null && product.specialPrices.length > 0);
}

/**
 * The candidates a tie-break may choose between, the first of them being the one the ranking put
 * first. They must answer the term in full, be returned by as many of its expansions, and describe
 * it at least as well as that first candidate does.
 *
 * Coordination alone does not say any of that: a single-word term expands to a single probe, so
 * every candidate it returns shares a coordination of one and the whole hundred counted as tied —
 * which is how a promoted baby purée came to answer "морква" over the carrot the server had ranked
 * first. A tie-break may choose between products the term describes equally well; it may not trade
 * the term away for a discount.
 *
 * One rule, read from one place: the listing asks the same question to decide whether its own
 * ordering was decisive enough to fetch alternatives for an unavailable match.
 */
export function tiedCandidates(candidates: readonly ProductCandidate[]): readonly ProductCandidate[] {
  const top = candidates[0];

  if (top === undefined || !top.accounted) return [];

  return candidates.filter(
    (candidate) =>
      candidate.accounted && candidate.coordination === top.coordination && candidate.score >= top.score,
  );
}

export function settleTerm(
  candidates: readonly ProductCandidate[],
  signals: TieBreakSignals = { bought: new Set(), saved: new Set() },
): TermSettlement {
  const tied = tiedCandidates(candidates);
  const top = tied[0];

  if (top === undefined) return { kind: "ask" };

  if (tied.length === 1) return { kind: "auto", chosen: top };

  const bought = tied.find((candidate) => signals.bought.has(candidate.product.id));
  if (bought !== undefined) return { kind: "auto", chosen: bought };

  const saved = tied.find((candidate) => signals.saved.has(candidate.product.id));
  if (saved !== undefined) return { kind: "auto", chosen: saved };

  const promoted = tied.find((candidate) => productHasPromotion(candidate.product));
  if (promoted !== undefined) return { kind: "auto", chosen: promoted };

  return { kind: "auto", chosen: tied[0]! };
}

const HISTORY_PAGE_LIMIT = 5;
const ONLINE_ORDERS_PAGE_SIZE = ONLINE_ORDERS_CAP;
const OFFLINE_ORDERS_PAGE_SIZE = OFFLINE_ORDERS_CAP;
const FAVORITES_PAGE_SIZE = 500;

async function readOnlineOrderIds(client: ProductClient): Promise<ReadonlySet<string>> {
  const orders = await readCapped<OnlineOrder>(
    ONLINE_ORDERS_PAGE_SIZE,
    HISTORY_PAGE_LIMIT * ONLINE_ORDERS_PAGE_SIZE,
    async (limit, offset) => {
      const { structured } = await client.getMyOnlineOrders({ limit, offset });

      return { rows: structured.orders, total: structured.meta.total };
    },
  );

  return new Set(orders.flatMap((order) => order.products.map((product) => product.id)));
}

async function readOfflineOrderIds(client: ProductClient): Promise<ReadonlySet<string>> {
  const orders = await readCapped<OfflineOrder>(
    OFFLINE_ORDERS_PAGE_SIZE,
    HISTORY_PAGE_LIMIT * OFFLINE_ORDERS_PAGE_SIZE,
    async (limit, offset) => {
      const { structured } = await client.getMyOfflineOrders({
        branchId: "",
        deliveryType: "",
        timeslotStart: "",
        timeslotEnd: "",
        limit,
        offset,
      });

      return { rows: structured.orders, total: structured.meta.total };
    },
  );

  return new Set(
    orders.flatMap((order) =>
      order.products.flatMap((line) => (line.catalogProduct === null ? [] : [line.catalogProduct.id])),
    ),
  );
}

async function readSavedIds(client: ProductClient, context: ProductRequestContext): Promise<ReadonlySet<string>> {
  const favorites = await readCapped<Product>(
    FAVORITES_PAGE_SIZE,
    HISTORY_PAGE_LIMIT * FAVORITES_PAGE_SIZE,
    async (limit, offset) => {
      const { structured } = await client.getMyFavorites({
        branchId: context.branchId,
        deliveryType: context.deliveryType,
        timeslotStart: context.timeslotStart,
        limit,
        offset,
      });

      return { rows: structured.products, total: structured.meta.total };
    },
  );

  return new Set(favorites.map((product) => product.id));
}

function empty(): ReadonlySet<string> {
  return new Set();
}

export async function readTieBreakSignals(
  client: ProductClient,
  context: ProductRequestContext,
): Promise<TieBreakSignals> {
  const [online, offline, saved] = await Promise.all([
    readOnlineOrderIds(client).catch(empty),
    readOfflineOrderIds(client).catch(empty),
    readSavedIds(client, context).catch(empty),
  ]);

  return { bought: new Set([...online, ...offline]), saved };
}
