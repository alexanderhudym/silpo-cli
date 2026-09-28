import type { DeliveryType } from "../mcp/entities/delivery.js";
import type { FoodRestriction } from "../mcp/entities/food-restriction.js";
import type { McpSession } from "../mcp/session.js";
import { parseItem, type ParsedItem } from "../resolve/normalize.js";
import { detectRestrictionConflicts } from "../resolve/restrictions.js";
import {
  QUESTION_OPTIONS,
  countedSteps,
  matchesSpecification,
  orderedCount,
  orderedWeight,
  readTieBreakSignals,
  searchTerms,
  settleTerm,
  type ProductCandidate,
  type ProductRequestContext,
  type QuantityNote,
  type TieBreakSignals,
} from "../resolve/products.js";
import { ceilToStep, floorToStep, isMultipleOfStep } from "../utils/step.js";
import { Cart, cartShipment } from "./cart.js";

export type ShortfallKind = "stock" | "alternatives";

export interface PickAnswer {
  readonly term: string;
  readonly productId: string;
  readonly shortfall?: ShortfallKind;
}

export interface StockAnswer {
  readonly term: string;
  readonly answer: "stock";
}

export interface AlternativesAnswer {
  readonly term: string;
  readonly answer: "alternatives";
}

export type ResolveAnswer = PickAnswer | StockAnswer | AlternativesAnswer;

function isPickAnswer(answer: ResolveAnswer): answer is PickAnswer {
  return "productId" in answer;
}

function shortfallKind(answer: ResolveAnswer): ShortfallKind | undefined {
  return isPickAnswer(answer) ? answer.shortfall : answer.answer;
}

export interface ResolvedCandidate {
  readonly productId: string;
  readonly name: string;
  readonly companyId: string;
  readonly weighted: boolean;
  readonly step: number;
}

export type { QuantityNote };

export interface ResolvedWrite {
  readonly product: ResolvedCandidate;
  readonly quantity: number;
  readonly note: QuantityNote | undefined;
}

export interface ResolvedShortfall {
  readonly product: ResolvedCandidate;
  readonly stock: number;
  readonly quantity: number;
}

export type ResolutionKind = "auto" | "ask" | "warn" | "miss";

export interface ResolvedLine {
  readonly term: string;
  readonly kind: ResolutionKind;
  readonly writes: readonly ResolvedWrite[];
  readonly candidates: readonly ResolvedCandidate[];
  readonly restrictions: readonly string[];
  readonly unavailable: ResolvedCandidate | undefined;
  readonly shortfall: ResolvedShortfall | undefined;
}

export interface ResolveListResult {
  readonly lines: readonly ResolvedLine[];
}

interface ShipmentContext {
  readonly branchId: string;
  readonly deliveryType: string;
  readonly timeslotStart: string;
  readonly timeslotEnd: string;
}

function asProductContext(context: ShipmentContext): ProductRequestContext {
  return { ...context, deliveryType: context.deliveryType as DeliveryType };
}

interface ResolvedProductLike {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly stock: number;
  readonly available: boolean;
  readonly companyId: string | null;
  readonly weighted: boolean;
  readonly displayRatio: string | null;
  readonly step: number;
}

function toCandidate(product: ResolvedProductLike): ResolvedCandidate {
  return {
    productId: product.id,
    name: product.name,
    companyId: product.companyId ?? "",
    weighted: product.weighted,
    step: product.step,
  };
}

function restrictionNames(restrictions: readonly FoodRestriction[]): readonly string[] {
  return restrictions.map((restriction) => restriction.name ?? restriction.slug);
}

function isAvailable(product: ResolvedProductLike): boolean {
  return product.available && product.stock > 0;
}

function miss(item: ParsedItem): ResolvedLine {
  return {
    term: item.term,
    kind: "miss",
    writes: [],
    candidates: [],
    restrictions: [],
    unavailable: undefined,
    shortfall: undefined,
  };
}

function ask(item: ParsedItem, candidates: readonly ResolvedCandidate[]): ResolvedLine {
  return {
    term: item.term,
    kind: "ask",
    writes: [],
    candidates: candidates.slice(0, QUESTION_OPTIONS),
    restrictions: [],
    unavailable: undefined,
    shortfall: undefined,
  };
}

function unavailableAsk(item: ParsedItem, product: ResolvedProductLike, alternatives: readonly ResolvedCandidate[]): ResolvedLine {
  return {
    term: item.term,
    kind: "ask",
    writes: [],
    candidates: alternatives,
    restrictions: [],
    unavailable: toCandidate(product),
    shortfall: undefined,
  };
}

export type OrderedAmount = { readonly quantity: number; readonly note: QuantityNote | undefined };

/**
 * Computed once, from one rule: the amount and what was done to reach it are read off the same
 * weight or the same count rather than asked of a second function that could answer differently.
 */
export function orderedAmount(item: ParsedItem, product: ResolvedProductLike): OrderedAmount {
  const weight = orderedWeight(item, product);

  if (weight !== undefined) return { quantity: weight.quantity, note: weight.note };

  const count = orderedCount(item, product);

  if (count !== undefined) return { quantity: count.quantity, note: count.note };

  const bare = item.quantity ?? 1;
  const stepped = countedSteps(bare, product.step);

  if (product.weighted) return { quantity: stepped, note: item.quantity !== undefined ? "steps" : undefined };

  const note: QuantityNote | undefined =
    Number.isInteger(bare) && isMultipleOfStep(bare, product.step) ? undefined : "raised";

  return { quantity: stepped, note };
}

export function orderedQuantity(item: ParsedItem, product: ResolvedProductLike): number {
  return orderedAmount(item, product).quantity;
}

function shortfallAsk(
  item: ParsedItem,
  product: ResolvedProductLike,
  stock: number,
  alternatives: readonly ResolvedCandidate[],
): ResolvedLine {
  return {
    term: item.term,
    kind: "ask",
    writes: [],
    candidates: alternatives,
    restrictions: [],
    unavailable: undefined,
    shortfall: { product: toCandidate(product), stock, quantity: orderedQuantity(item, product) },
  };
}

export class Filler {
  constructor(
    private readonly session: McpSession,
    private readonly cart: Cart,
  ) {}

  private async shipmentContext(): Promise<ShipmentContext> {
    const { cart } = await this.cart.current();
    const shipment = cartShipment(cart);

    return {
      branchId: shipment.branchId,
      deliveryType: cart.deliveryType,
      timeslotStart: cart.timeslot.start,
      timeslotEnd: cart.timeslot.end,
    };
  }

  async resolve(items: readonly string[], answers: readonly ResolveAnswer[]): Promise<ResolveListResult> {
    const context = await this.shipmentContext();

    const { structured: restrictionsPayload } = await this.session.getMyFoodRestrictions();
    const restrictions = restrictionsPayload.restrictions;
    const answerByTerm = new Map(answers.map((answer) => [answer.term, answer] as const));

    const parsed = items.map((raw) => parseItem(raw));
    const resolutions: (ResolvedLine | undefined)[] = new Array(parsed.length).fill(undefined);
    const pendingByTerm = new Map<string, number[]>();

    for (const [index, item] of parsed.entries()) {
      const answer = answerByTerm.get(item.term);

      if (answer !== undefined && isPickAnswer(answer)) {
        resolutions[index] = await this.resolvePicked(item, answer, context, restrictions);
        continue;
      }

      const indices = pendingByTerm.get(item.term) ?? [];
      indices.push(index);
      pendingByTerm.set(item.term, indices);
    }

    if (pendingByTerm.size > 0) {
      await this.resolveLive(parsed, pendingByTerm, resolutions, context, restrictions, answerByTerm);
    }

    const lines = resolutions.map((resolution) => resolution!);

    return { lines };
  }

  private async fetchAlternatives(slug: string, context: ShipmentContext): Promise<readonly ResolvedCandidate[]> {
    const { structured } = await this.session.getSimilarProducts({
      branchId: context.branchId,
      slug,
      deliveryType: context.deliveryType as DeliveryType,
      timeslotStart: context.timeslotStart,
      timeslotEnd: context.timeslotEnd,
      limit: QUESTION_OPTIONS,
    });

    return structured.products.map(toCandidate);
  }

  /**
   * `offers` are the candidates the term could have settled on. A settled line keeps them so that
   * `--ask-all` has a list to put back to the caller: recording only what was chosen left the flag
   * re-asking a question with a single answer, which is no question at all.
   */
  private async finalizeChoice(
    item: ParsedItem,
    product: ResolvedProductLike,
    context: ShipmentContext,
    restrictions: readonly FoodRestriction[],
    answer: ResolveAnswer | undefined,
    offers: readonly ResolvedCandidate[] = [toCandidate(product)],
  ): Promise<ResolvedLine> {
    if (!isAvailable(product)) {
      const alternatives = await this.fetchAlternatives(product.slug, context);

      return unavailableAsk(item, product, alternatives);
    }

    const { quantity: wanted, note } = orderedAmount(item, product);

    if (wanted <= 0) return miss(item);

    if (product.stock < wanted) {
      const alternatives = await this.fetchAlternatives(product.slug, context);
      const kind = answer !== undefined ? shortfallKind(answer) : undefined;

      if (kind !== undefined) {
        return this.applyShortfallAnswer(item, product, product.stock, alternatives, kind, restrictions);
      }

      return shortfallAsk(item, product, product.stock, alternatives);
    }

    const conflicts = detectRestrictionConflicts(product.name, restrictions);

    return {
      term: item.term,
      kind: conflicts.length > 0 ? "warn" : "auto",
      writes: [{ product: toCandidate(product), quantity: wanted, note }],
      candidates: offers,
      restrictions: restrictionNames(conflicts),
      unavailable: undefined,
      shortfall: undefined,
    };
  }

  private applyShortfallAnswer(
    item: ParsedItem,
    product: ResolvedProductLike,
    stock: number,
    alternatives: readonly ResolvedCandidate[],
    kind: ShortfallKind,
    restrictions: readonly FoodRestriction[],
  ): ResolvedLine {
    const kept = floorToStep(stock, product.step);

    if (kept <= 0) return miss(item);

    const conflicts = detectRestrictionConflicts(product.name, restrictions);
    const writes: ResolvedWrite[] = [{ product: toCandidate(product), quantity: kept, note: undefined }];
    let shortfall: ResolvedShortfall | undefined;

    if (kind === "alternatives") {
      const remainder = orderedQuantity(item, product) - kept;

      /**
       * The remainder is counted in the short product's own unit, so it can only be carried over
       * to an alternative counted the same way. Half a kilogram of a weighed cut is not half a
       * packet, and writing it as one would order an amount nobody asked for.
       */
      const match = alternatives.find((alternative) => alternative.weighted === product.weighted);

      if (remainder > 0) {
        if (match !== undefined) {
          writes.push({ product: match, quantity: ceilToStep(remainder, match.step), note: undefined });
        } else {
          shortfall = { product: toCandidate(product), stock, quantity: orderedQuantity(item, product) };
        }
      }
    }

    return {
      term: item.term,
      kind: conflicts.length > 0 ? "warn" : "auto",
      writes,
      candidates: [toCandidate(product)],
      restrictions: restrictionNames(conflicts),
      unavailable: undefined,
      shortfall,
    };
  }

  private async resolvePicked(
    item: ParsedItem,
    answer: PickAnswer,
    context: ShipmentContext,
    restrictions: readonly FoodRestriction[],
  ): Promise<ResolvedLine> {
    const { structured } = await this.session.getProductDetails({
      branchId: context.branchId,
      slug: answer.productId,
      deliveryType: context.deliveryType,
      timeslotStart: context.timeslotStart,
      timeslotEnd: context.timeslotEnd,
    });

    return this.finalizeChoice(item, structured.product, context, restrictions, answer);
  }

  private async settleLive(
    item: ParsedItem,
    candidates: readonly ProductCandidate[],
    signals: TieBreakSignals,
    context: ShipmentContext,
    restrictions: readonly FoodRestriction[],
    answer: ResolveAnswer | undefined,
  ): Promise<ResolvedLine> {
    if (candidates.length === 0) return miss(item);

    const settlement = settleTerm(candidates, signals);

    if (settlement.kind === "ask") return ask(item, candidates.map((candidate) => toCandidate(candidate.product)));

    if (!matchesSpecification(item, settlement.chosen.product)) {
      return ask(item, candidates.map((candidate) => toCandidate(candidate.product)));
    }

    return this.finalizeChoice(
      item,
      settlement.chosen.product,
      context,
      restrictions,
      answer,
      candidates.slice(0, QUESTION_OPTIONS).map((candidate) => toCandidate(candidate.product)),
    );
  }

  private async resolveLive(
    parsed: readonly ParsedItem[],
    pendingByTerm: ReadonlyMap<string, number[]>,
    resolutions: (ResolvedLine | undefined)[],
    context: ShipmentContext,
    restrictions: readonly FoodRestriction[],
    answerByTerm: ReadonlyMap<string, ResolveAnswer>,
  ): Promise<void> {
    const terms = [...pendingByTerm.keys()];

    const productContext = asProductContext(context);

    const [results, signals] = await Promise.all([
      searchTerms(this.session, productContext, terms),
      readTieBreakSignals(this.session, productContext),
    ]);

    const byTerm = new Map(results.map((result) => [result.term, result] as const));

    for (const term of terms) {
      const indices = pendingByTerm.get(term)!;
      const candidates = byTerm.get(term)?.candidates ?? [];
      const answer = answerByTerm.get(term);

      for (const index of indices) {
        const item = parsed[index]!;

        resolutions[index] = await this.settleLive(item, candidates, signals, context, restrictions, answer);
      }
    }
  }
}
