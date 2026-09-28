import type { Command } from "commander";

import { resolveList, shoppingCart, silpo } from "../daemon/client.js";
import { cartShipment, type CartState } from "../daemon/cart.js";
import type {
  PickAnswer,
  QuantityNote,
  ResolveAnswer,
  ResolvedCandidate,
  ResolvedLine,
  ResolvedShortfall,
} from "../daemon/fill.js";
import { QUESTION_OPTIONS } from "../resolve/products.js";
import type * as tools from "../mcp/silpo.js";
import type { CartProduct, CartTimeslot } from "../mcp/entities/cart.js";
import type { ProductDetails } from "../mcp/entities/product.js";
import { formatList, formatRows, indent } from "../utils/list.js";
import { KILOGRAM, formatAmount, formatPricedName } from "../utils/price.js";
import { floorToStep } from "../utils/step.js";
import { toOneLine } from "../utils/text.js";
import {
  cartBodyText,
  cartLines,
  changesText,
  reduceTo,
  troublesOf,
  validationsText,
  type QuantityHint,
} from "./carts.js";

type Priced = {
  name: string;
  price: number;
  oldPrice: number | null;
  unit: string | null;
  size: string | null;
};

type Shipment = { branchId: string };
type CartLike = { deliveryType: string; timeslot: CartTimeslot };

function priced(
  name: string,
  price: number,
  oldPrice: number | null,
  weighted: boolean,
  size: string | null,
): Priced {
  return { name, price, oldPrice, unit: weighted ? KILOGRAM : null, size: weighted ? null : size };
}

function pricedFromCartProduct(product: CartProduct): Priced {
  return priced(product.name, product.price, product.oldPrice, product.weighted, product.ratio);
}

function pricedFromDetails(product: ProductDetails): Priced {
  return priced(product.name, product.price, product.oldPrice, product.weighted, product.displayRatio);
}

function readPick(raw: string): PickAnswer {
  const at = raw.indexOf("=");

  if (at < 0) throw new Error("expected <term>=<id>");

  const term = raw.slice(0, at).trim();
  const productId = raw.slice(at + 1).trim();

  if (term === "" || productId === "") throw new Error("expected <term>=<id>");

  return { term, productId };
}

function collect(value: string, seen: string[] = []): string[] {
  return [...seen, value];
}

function buildAnswers(
  picks: readonly PickAnswer[],
  acceptStock: readonly string[],
  fillWithAlternatives: readonly string[],
): ResolveAnswer[] {
  const shortfallByTerm = new Map<string, "stock" | "alternatives">();

  for (const term of acceptStock) shortfallByTerm.set(term, "stock");
  for (const term of fillWithAlternatives) shortfallByTerm.set(term, "alternatives");

  const pickedTerms = new Set(picks.map((pick) => pick.term));

  const pickAnswers: ResolveAnswer[] = picks.map((pick) => {
    const shortfall = shortfallByTerm.get(pick.term);

    return shortfall === undefined ? pick : { ...pick, shortfall };
  });

  const shortfallAnswers: ResolveAnswer[] = [...shortfallByTerm]
    .filter(([term]) => !pickedTerms.has(term))
    .map(([term, answer]) => ({ term, answer }));

  return [...pickAnswers, ...shortfallAnswers];
}

function forceAsk(line: ResolvedLine): ResolvedLine {
  if (line.kind === "miss" || line.candidates.length === 0) return line;

  return { ...line, kind: "ask", writes: [] };
}

function isSettled(line: ResolvedLine): boolean {
  return line.kind === "auto" || line.kind === "warn";
}

const SETTLED_TO = " → ";

const QUANTITY_NOTE_TEXT: Readonly<Record<QuantityNote, string>> = {
  raised: "raised to the step",
  steps: "count named steps",
  packs: "count covered by packs",
  chosen: "chosen for want of a step",
};

/**
 * A settled row names the term it answers. Without it the list is a flat set of products in an
 * order of its own, and which query produced which match is unrecoverable — so an auto-match the
 * caller would have rejected reads no differently from one it asked for, and `--pick`, which keys
 * on the term as the parser made it, has nothing to key on. The amount is printed for a weighted
 * product whatever it is, because there a quantity of one means a whole kilogram. Where the amount
 * is one the CLI chose rather than one the caller wrote, the line says so, so the caller can
 * correct what they cannot otherwise see.
 */
function settledLine(term: string, quantity: number, item: Priced, note: QuantityNote | undefined): string {
  const amount = item.unit !== null || quantity !== 1 ? ` ×${formatAmount(quantity, item.unit)}` : "";
  const stated = note === undefined ? "" : ` (${QUANTITY_NOTE_TEXT[note]})`;

  return `${toOneLine(term)}${SETTLED_TO}${formatPricedName(item)}${amount}${stated}`;
}

function candidateLine(candidate: ResolvedCandidate, item: Priced | undefined): string {
  return item === undefined
    ? candidate.productId
    : `${candidate.productId}: ${formatPricedName(item)}`;
}

function outcomeRow(word: string, term: string, detail: string | false): string {
  const head = `${word} ${toOneLine(term)}`;

  return detail === false ? head : `${head}: ${detail}`;
}

function unavailableNote(candidate: ResolvedCandidate): string {
  return `unavailable ${candidate.productId} ${toOneLine(candidate.name)}`;
}

function shortfallNote(shortfall: ResolvedShortfall): string {
  const unit = shortfall.product.weighted ? KILOGRAM : null;
  const purchasable = floorToStep(shortfall.stock, shortfall.product.step);
  const held =
    purchasable === shortfall.stock
      ? formatAmount(purchasable, unit)
      : `${formatAmount(purchasable, unit)} (${formatAmount(shortfall.stock, unit)} on the shelf, step ${formatAmount(shortfall.product.step, unit)})`;

  return `holds ${held} of ${formatAmount(shortfall.quantity, unit)} ${shortfall.product.productId} ${toOneLine(shortfall.product.name)}`;
}

function askAnnotations(line: ResolvedLine): string {
  const parts: string[] = [];

  if (line.unavailable !== undefined) parts.push(unavailableNote(line.unavailable));
  if (line.shortfall !== undefined) parts.push(shortfallNote(line.shortfall));

  return parts.length === 0 ? "" : ` (${parts.join("; ")})`;
}

function askRow(line: ResolvedLine, priceOf: (productId: string) => Priced | undefined): string {
  const head = `${outcomeRow("ask", line.term, false)}${askAnnotations(line)}`;
  const candidates = line.candidates.map((candidate) => candidateLine(candidate, priceOf(candidate.productId)));

  return formatRows([head, candidates.length > 0 && indent(formatList(candidates))]);
}

function warnRow(line: ResolvedLine): string {
  return outcomeRow("warn", line.term, line.restrictions.join(", "));
}

function shortRow(line: ResolvedLine): string {
  return outcomeRow("short", line.term, shortfallNote(line.shortfall!));
}

function fillText(
  settledLines: readonly string[],
  changes: string | false,
  rows: readonly string[],
  validations: string | false,
  snapshot: string,
): string {
  const body = formatList([
    `${settledLines.length} settled`,
    settledLines.length > 0 && formatRows(settledLines),
    changes,
    rows.length > 0 && formatRows(rows),
    validations,
    snapshot,
  ]);

  return `${body}\n`;
}

async function fetchDetails(
  productIds: readonly string[],
  branchId: string,
  deliveryType: string,
  timeslot: CartTimeslot,
): Promise<Map<string, Priced>> {
  const priced = new Map<string, Priced>();

  await Promise.all(
    productIds.map(async (productId) => {
      const { structured } = await silpo.getProductDetails({
        branchId,
        slug: productId,
        deliveryType,
        timeslotStart: timeslot.start,
        timeslotEnd: timeslot.end,
      });

      priced.set(productId, pricedFromDetails(structured.product));
    }),
  );

  return priced;
}

async function slugFor(productId: string, shipment: Shipment, cart: CartLike): Promise<string> {
  const { structured } = await silpo.getProductDetails({
    branchId: shipment.branchId,
    slug: productId,
    deliveryType: cart.deliveryType,
    timeslotStart: cart.timeslot.start,
    timeslotEnd: cart.timeslot.end,
  });

  return structured.product.slug;
}

async function alternativesFor(
  slug: string,
  shipment: Shipment,
  cart: CartLike,
): Promise<ResolvedCandidate[]> {
  const { structured } = await silpo.getSimilarProducts({
    branchId: shipment.branchId,
    slug,
    deliveryType: cart.deliveryType,
    timeslotStart: cart.timeslot.start,
    timeslotEnd: cart.timeslot.end,
    limit: QUESTION_OPTIONS,
  });

  return structured.products.map((product) => ({
    productId: product.id,
    name: product.name,
    companyId: product.companyId ?? "",
    weighted: product.weighted,
    step: product.step,
  }));
}

async function askForUnfillable(
  line: ResolvedLine,
  unfillableIds: ReadonlySet<string>,
  shipment: Shipment,
  cart: CartLike,
): Promise<ResolvedLine> {
  const kept = line.writes.filter((write) => !unfillableIds.has(write.product.productId));
  const failing = line.writes.find((write) => unfillableIds.has(write.product.productId))!;
  const slug = await slugFor(failing.product.productId, shipment, cart);
  const candidates = await alternativesFor(slug, shipment, cart);

  return {
    ...line,
    kind: "ask",
    writes: kept,
    candidates,
    restrictions: [],
    unavailable: failing.product,
    shortfall: undefined,
  };
}

export function registerCartFillCommand(cartCommand: Command): void {
  cartCommand
    .command("fill")
    .description("Resolve a shopping list and write what resolved automatically to the cart")
    .argument("<item...>", "list items written the way a person writes them")
    .option(
      "--pick <term=id>",
      "answer an ask row, the term as it was printed and the id the server issued for the chosen candidate, repeatable",
      (value: string, seen: PickAnswer[] = []) => [...seen, readPick(value)],
    )
    .option(
      "--accept-stock <term>",
      "answer an ask that the branch holds fewer than were asked for: take what there is, repeatable",
      collect,
    )
    .option(
      "--fill-with-alternatives <term>",
      "answer that same ask: take what there is and make up the rest from the ranked alternatives, repeatable",
      collect,
    )
    .option("--dry-run", "resolve without writing to the cart")
    .option("--ask-all", "put every item to the caller instead of deciding")
    .action(
      async (
        items: string[],
        options: {
          pick?: PickAnswer[];
          acceptStock?: string[];
          fillWithAlternatives?: string[];
          dryRun?: boolean;
          askAll?: boolean;
        },
      ) => {
        const answers = buildAnswers(
          options.pick ?? [],
          options.acceptStock ?? [],
          options.fillWithAlternatives ?? [],
        );

        const { lines: resolved } = await resolveList(items, answers);
        const preWrite = options.askAll ? resolved.map(forceAsk) : resolved;

        const initial = await shoppingCart.current();
        const { cart } = initial;
        const shipment = cartShipment(cart);
        const already = cartLines(cart);

        const pendingWrites = options.dryRun
          ? []
          : preWrite.flatMap((line) =>
              isSettled(line)
                ? line.writes.filter((write) => !already.has(write.product.productId))
                : [],
            );

        const products: tools.CartProductInput[] = pendingWrites.map((write) => ({
          productId: write.product.productId,
          companyId: write.product.companyId,
          branchId: shipment.branchId,
          quantity: write.quantity,
        }));

        let finalState: CartState = initial;
        let finalLines = already;
        let changes: string | false = false;
        let failed = false;
        let unfillableIds = new Set<string>();

        if (products.length > 0) {
          const sent = new Map(products.map((product) => [product.productId, product]));
          const hints = new Map<string, QuantityHint>(
            pendingWrites.map((write) => [
              write.product.productId,
              { weighted: write.product.weighted, step: write.product.step },
            ]),
          );
          const { confirmed: written, state: seen } = await shoppingCart.addProducts(products);
          const trouble = troublesOf(seen, sent, hints);
          const seenLines = cartLines(seen.cart);

          const resulting =
            trouble.reduced.length > 0
              ? (await shoppingCart.addProducts(reduceTo(trouble.reduced, seenLines, sent))).state
              : seen;

          unfillableIds = new Set(trouble.unfillable);
          changes = changesText({ reduced: trouble.reduced, unfillable: [] });
          finalState = resulting;
          finalLines = cartLines(resulting.cart);
          failed = !written.success;
        }

        const validations = validationsText(finalState.cart.calculation.validations);

        const lines = await Promise.all(
          preWrite.map((line) =>
            isSettled(line) && line.writes.some((write) => unfillableIds.has(write.product.productId))
              ? askForUnfillable(line, unfillableIds, shipment, cart)
              : Promise.resolve(line),
          ),
        );

        const askItems = lines.filter((line) => line.kind === "ask");
        const warnItems = lines.filter((line) => line.kind === "warn");
        const missItems = lines.filter((line) => line.kind === "miss");
        const shortItems = lines.filter((line) => isSettled(line) && line.shortfall !== undefined);

        const settledWrites = lines.flatMap((line) =>
          line.writes.map((write) => ({ term: line.term, write })),
        );
        const missingWrites = settledWrites.filter(
          ({ write }) => !finalLines.has(write.product.productId),
        );
        const askCandidateIds = askItems.flatMap((line) =>
          line.candidates.map((candidate) => candidate.productId),
        );
        const needed = [
          ...new Set([...askCandidateIds, ...missingWrites.map(({ write }) => write.product.productId)]),
        ];

        const fetched: Map<string, Priced> =
          needed.length > 0
            ? await fetchDetails(needed, shipment.branchId, cart.deliveryType, cart.timeslot)
            : new Map<string, Priced>();

        const priceOf = (productId: string): Priced | undefined => {
          const line = finalLines.get(productId);

          return line === undefined ? fetched.get(productId) : pricedFromCartProduct(line);
        };

        // What the cart holds, not what was asked for: a quantity the branch could not honour is
        // reduced on the way in, and a line reading the asked-for amount beside the price the cart
        // came back with states two different moments as one.
        const heldQuantity = (productId: string, asked: number): number =>
          finalLines.get(productId)?.quantity ?? asked;

        const settledLines = settledWrites.map(({ term, write }) =>
          settledLine(
            term,
            heldQuantity(write.product.productId, write.quantity),
            priceOf(write.product.productId)!,
            write.note,
          ),
        );

        const rows = [
          ...askItems.map((line) => askRow(line, priceOf)),
          ...warnItems.map((line) => warnRow(line)),
          ...missItems.map((line) => outcomeRow("miss", line.term, false)),
          ...shortItems.map((line) => shortRow(line)),
        ];

        process.stdout.write(
          fillText(settledLines, changes, rows, validations, cartBodyText(finalState)),
        );

        if (failed) process.exitCode = 1;
      },
    );
}
