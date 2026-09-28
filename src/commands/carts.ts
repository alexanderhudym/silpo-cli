import type { Command } from "commander";

import { requireNumber } from "../utils/number.js";
import { floorToStep, isMultipleOfStep } from "../utils/step.js";
import { shoppingCart, silpo } from "../daemon/client.js";
import * as tools from "../mcp/silpo.js";
import { cartShipment, reportsBadSlot, type CartState } from "../daemon/cart.js";
import type {
  CartAddress,
  CartProduct,
  CartTimeslot,
  CartValidation,
} from "../mcp/entities/cart.js";
import type { AddOrUpdateCertificatesResult } from "../mcp/silpo.js";
import { formatAddress } from "../utils/address.js";
import { parseTime, toLocalTime } from "../utils/datetime.js";
import { DELIVERY_TYPES, requireDeliveryType } from "../utils/delivery-type.js";
import { formatList, formatRows, indent } from "../utils/list.js";
import { KILOGRAM, formatAmount, formatPricedName } from "../utils/price.js";
import { formatEntryAsRow, formatEntryAsSection } from "../utils/record.js";
import { addressCandidateText, findBranch } from "../resolve/stores.js";
import { resolveCartDestination, selectSlot } from "../resolve/delivery.js";

const LIST_SEPARATOR = ", ";
const NONE = "none";
const STOCK_MAX = "product.offer.stock.max";
const OFFER_MISSING = "product.offer.not_found";
const PRODUCT = "product";
const ERROR = "error";

type Validation = {
  level: string;
  type: string;
  message: string;
  context?: unknown;
};

function contextValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(contextValue).join(LIST_SEPARATOR);

  return typeof value === "object" && value !== null ? JSON.stringify(value) : String(value);
}

function validationText({ level, type, message, context }: Validation): string {
  const named =
    typeof context === "object" && context !== null && !Array.isArray(context)
      ? Object.entries(context)
      : [];

  return formatRows([
    `${level} ${type}: ${message}`,
    named.length > 0 &&
      indent(formatRows(named.map(([key, value]) => formatEntryAsRow(key, contextValue(value))))),
  ]);
}

export function validationsText(validations: readonly Validation[]): string | false {
  return (
    validations.length > 0 &&
    formatEntryAsSection("validations", indent(formatRows(validations.map(validationText))))
  );
}

export function cartBodyText(payload: CartState): string {
  const { cart, loyalty, checkoutWebLink, checkoutMobileLink } = payload;
  const { calculation } = cart;

  const shipments = cart.shipments.map(({ companyId, branchId, products }) => {
    const lines = products.map(
      ({
        productId,
        slug,
        name,
        quantity,
        price,
        oldPrice,
        total,
        subDiscount,
        stock,
        ratio,
        weighted,
        addToBasketStep,
        comment,
      }) => {
        const unit = weighted ? KILOGRAM : null;

        return formatRows([
          formatEntryAsRow("id", productId),
          formatEntryAsRow("slug", slug),
          formatEntryAsRow("quantity", formatAmount(quantity, unit)),
          total !== undefined && formatEntryAsRow("total", total),
          subDiscount > 0 && formatEntryAsRow("discount", subDiscount),
          formatEntryAsRow("stock", formatAmount(stock, unit)),
          weighted && formatEntryAsRow("step", formatAmount(addToBasketStep, unit)),
          comment && formatEntryAsRow("comment", comment),
          formatPricedName({ name, price, oldPrice, unit, size: weighted ? null : ratio }),
        ]);
      },
    );

    return formatRows([
      formatEntryAsRow("companyId", companyId),
      formatEntryAsRow("branchId", branchId),
      lines.length > 0 && formatEntryAsSection("products", indent(formatList(lines))),
    ]);
  });

  return formatRows([
    formatEntryAsRow("delivery", cart.deliveryType),
    formatEntryAsRow(
      "slot",
      `${toLocalTime(cart.timeslot.start)} - ${toLocalTime(cart.timeslot.end)}`,
    ),
    formatEntryAsRow(
      "address",
      formatAddress({
        city: cart.address.city,
        street: cart.address.street,
        building: cart.address.house,
      }),
    ),
    cart.promoCode && formatEntryAsRow("promoCode", cart.promoCode),
    calculation.totalAfterDiscounts !== undefined &&
      formatEntryAsRow("total", calculation.totalAfterDiscounts),
    calculation.subTotal !== undefined && formatEntryAsRow("subTotal", calculation.subTotal),
    calculation.subDiscount > 0 && formatEntryAsRow("discount", calculation.subDiscount),
    calculation.certificatesTotal > 0 &&
      formatEntryAsRow("certificates", calculation.certificatesTotal),
    calculation.delivery.total > 0 && formatEntryAsRow("deliveryCost", calculation.delivery.total),
    calculation.delivery.totalWeight > 0 &&
      formatEntryAsRow("weight", calculation.delivery.totalWeight),
    loyalty && formatEntryAsRow("bonus", `${loyalty.bonusAvailable} of ${loyalty.bonusTotal}`),
    loyalty?.bonusRequested !== null &&
      loyalty !== null &&
      formatEntryAsRow("bonusRequested", loyalty.bonusRequested as number),
    checkoutWebLink !== undefined && formatEntryAsRow("checkout", checkoutWebLink),
    checkoutMobileLink !== undefined && formatEntryAsRow("checkoutMobile", checkoutMobileLink),
    shipments.length > 0 && formatEntryAsSection("shipments", indent(formatList(shipments))),
  ]);
}

function cartText(payload: CartState): string {
  return formatRows([
    cartBodyText(payload),
    validationsText(payload.cart.calculation.validations as Validation[]),
  ]);
}

export function detailsText(payload: CartState): string {
  return `${cartText(payload)}\n`;
}

export function writeText(
  summary: string,
  changes: string | false,
  cart: CartState,
  place: string | false = false,
): string {
  return `${formatList([place, summary, changes, cartText(cart)])}\n`;
}

export function certificatesText(payload: AddOrUpdateCertificatesResult): string {
  const added = payload.added.map(({ barcode, faceValue, validations }) =>
    formatRows([
      formatEntryAsRow("barcode", barcode),
      faceValue !== null && formatEntryAsRow("value", faceValue),
      validationsText(validations),
    ]),
  );

  const removed = payload.removed.map((barcode) => formatEntryAsRow("removed", barcode));

  return formatList([payload.summary, formatList(added), formatRows(removed)]);
}

function readNullable(raw: string): string | null {
  return raw === NONE ? null : raw;
}

type ResolvedDeliveryChange = {
  deliveryType?: string;
  address?: CartAddress;
  branchId?: string;
  shipments?: tools.CartShipmentRef[];
  timeslot?: CartTimeslot;
};

export type Reduction = {
  productId: string;
  wanted: number;
  kept: number;
  weighted: boolean;
};

export type Trouble = {
  reduced: Reduction[];
  unfillable: string[];
};

export type QuantityHint = {
  readonly weighted: boolean;
  readonly step: number;
};

function namedContext(validation: CartValidation): Record<string, unknown> | undefined {
  const { context } = validation;

  return typeof context === "object" && context !== null && !Array.isArray(context)
    ? (context as Record<string, unknown>)
    : undefined;
}

export function cartLines(cart: CartState["cart"]): Map<string, CartProduct> {
  return new Map(
    cart.shipments.flatMap(({ products }) =>
      products.map((product) => [product.productId, product] as const),
    ),
  );
}

export function troublesOf(
  payload: CartState,
  sent: ReadonlyMap<string, tools.CartProductInput>,
  hints: ReadonlyMap<string, QuantityHint> = new Map(),
): Trouble {
  if (reportsBadSlot(payload)) return { reduced: [], unfillable: [] };

  const lines = cartLines(payload.cart);
  const reduced: Reduction[] = [];
  const unfillable: string[] = [];

  for (const validation of payload.cart.calculation.validations) {
    if (validation.level !== ERROR || validation.type !== PRODUCT) continue;

    const named = namedContext(validation);
    const productId = typeof named?.productId === "string" ? named.productId : undefined;

    if (productId === undefined || !sent.has(productId)) continue;

    const line = lines.get(productId);
    const hint = hints.get(productId);
    const stock = typeof named?.stock === "number" ? named.stock : 0;

    if (validation.message === OFFER_MISSING || (validation.message === STOCK_MAX && stock <= 0)) {
      unfillable.push(productId);
    } else if (validation.message === STOCK_MAX) {
      const weighted = line?.weighted ?? hint?.weighted ?? false;
      const kept = weighted ? floorToStep(stock, line?.addToBasketStep ?? hint?.step) : stock;

      if (kept <= 0) {
        unfillable.push(productId);
      } else {
        reduced.push({
          productId,
          wanted: line?.quantity ?? (sent.get(productId) as tools.CartProductInput).quantity,
          kept,
          weighted,
        });
      }
    }
  }

  return { reduced, unfillable };
}

export function reduceTo(
  reductions: readonly Reduction[],
  lines: ReadonlyMap<string, CartProduct>,
  sent: ReadonlyMap<string, tools.CartProductInput>,
): tools.CartProductInput[] {
  return reductions.map(({ productId, kept }) => {
    const line = lines.get(productId);
    const asked = sent.get(productId) as tools.CartProductInput;

    return {
      productId,
      companyId: line?.companyId ?? asked.companyId,
      branchId: line?.branchId ?? asked.branchId,
      quantity: kept,
      ...(asked.comment === undefined ? {} : { comment: asked.comment }),
    };
  });
}

export function changesText({ reduced, unfillable }: Trouble): string | false {
  const rows = reduced.map(({ productId, wanted, kept, weighted }) => {
    const unit = weighted ? KILOGRAM : null;

    return formatEntryAsRow(
      "reduced",
      `${productId} from ${formatAmount(wanted, unit)} to ${formatAmount(kept, unit)}`,
    );
  });

  const blocked = unfillable.map((productId) => formatEntryAsRow("unfillable", productId));

  const body = formatList([formatRows(rows), formatRows(blocked)]);

  return body !== "" && body;
}

export function registerCartCommands(program: Command): Command {
  const cart = program.command("cart").description("Shopping cart of the authorized user");

  cart
    .command("details")
    .description("Full cart snapshot: products, totals, delivery context")
    .action(async () => {
      process.stdout.write(detailsText(await shoppingCart.current()));
    });

  cart
    .command("set")
    .description(
      "Change how much of the cart's lines hold, a line's comment, or both, in one write. The quantity is the line's total, never an increment; a weighed product is named in kilograms, in multiples of the line's own step. Further product and quantity pairs follow the first",
    )
    .argument("<product>", "product uuid, the one the cart snapshot prints for the line")
    .argument("<quantity>", "the quantity the line is to hold; kilograms for a weighed product")
    .argument("[rest...]", "further pairs, each a product uuid followed by its quantity")
    .option(
      "--comment <text>",
      "replace the line's comment; sent again unchanged when absent. Only with a single pair",
    )
    .action(async (product: string, quantityRaw: string, rest: string[], options: { comment?: string }) => {
      if (rest.length % 2 !== 0) {
        throw new Error(
          `each product needs a quantity after it; ${rest.length + 2} arguments do not pair up`,
        );
      }
      if (rest.length > 0 && options.comment !== undefined) {
        throw new Error("--comment names one line's comment, so pass it with a single pair");
      }

      const pairs = [product, quantityRaw, ...rest];
      const { cart } = await shoppingCart.current();
      const existing = cartLines(cart);
      const sent = new Map<string, tools.CartProductInput>();

      for (let index = 0; index < pairs.length; index += 2) {
        const productId = pairs[index]!;
        const line = existing.get(productId);

        if (line === undefined) {
          throw new Error(`the cart holds no line for ${productId}; silpo cart fill puts it in`);
        }
        if (sent.has(productId)) {
          throw new Error(`${productId} is named twice; a line's quantity is its total, not a sum`);
        }

        const quantity = requireNumber(pairs[index + 1]!);

        if (quantity === 0) {
          throw new Error(`a quantity of 0 removes the line; run cart remove ${productId} instead`);
        }
        if (quantity < 0) throw new Error("expected a quantity greater than 0");
        if (line.weighted && !isMultipleOfStep(quantity, line.addToBasketStep)) {
          throw new Error(
            `${productId} is sold in steps of ${line.addToBasketStep}${KILOGRAM}; ${quantity}${KILOGRAM} is not a multiple of it`,
          );
        }

        const comment = options.comment ?? line.comment ?? undefined;

        sent.set(productId, {
          productId,
          companyId: line.companyId,
          branchId: line.branchId,
          quantity,
          ...(comment === undefined ? {} : { comment }),
        });
      }

      const { confirmed: written, state: seen } = await shoppingCart.addProducts([...sent.values()]);
      const trouble = troublesOf(seen, sent);
      const lines = cartLines(seen.cart);

      const resulting =
        trouble.reduced.length > 0
          ? (await shoppingCart.addProducts(reduceTo(trouble.reduced, lines, sent))).state
          : seen;

      process.stdout.write(writeText(written.summary, changesText(trouble), resulting));

      if (!written.success || trouble.unfillable.length > 0) process.exitCode = 1;
    });

  cart
    .command("remove")
    .description("Remove products from the cart, named by their uuid")
    .argument("<product...>", "product uuids to remove")
    .action(async (products: string[]) => {
      const { confirmed: written, state: resulting } = await shoppingCart.removeProducts(
        products.map((productId) => ({ productId })),
      );

      process.stdout.write(writeText(written.summary, false, resulting));

      if (!written.success) process.exitCode = 1;
    });

  cart
    .command("clear")
    .description("Remove every product from the cart")
    .action(async () => {
      const { confirmed: written, state: resulting } = await shoppingCart.clear();

      process.stdout.write(writeText(written.summary, false, resulting));

      if (!written.success) process.exitCode = 1;
    });

  cart
    .command("setup")
    .description(
      "Set the delivery settings of the cart, changing only what is named, and open the cart when the account has none",
    )
    .option(
      "--to <text>",
      "destination: a saved address, a store by its address or its uuid, or a Nova Poshta office; resolves the delivery type, the branch, the address and a slot together",
    )
    .option("--when <time>", "today, tomorrow, a date, or a date and a time")
    .option(
      "--delivery-type <type>",
      `delivery type, the cart's own when absent: one of ${DELIVERY_TYPES.join(", ")}`,
    )
    .option("--feedback-changes <choice>", "approvedChanges or disapprovedChanges")
    .option("--feedback-contacts <choice>", "call or doNotCall")
    .action(
      async (options: {
        to?: string;
        when?: string;
        deliveryType?: string;
        feedbackChanges?: string;
        feedbackContacts?: string;
      }) => {
        const deliveryType =
          options.deliveryType === undefined ? undefined : requireDeliveryType(options.deliveryType);
        const when = options.when === undefined ? undefined : parseTime(options.when);
        let resolved: ResolvedDeliveryChange = {};
        let place: string | false = false;

        if (options.to !== undefined) {
          const destination = await resolveCartDestination(silpo, options.to, when, deliveryType);

          if (destination.outcome === "ambiguous") {
            process.stdout.write(destination.text);
            process.exitCode = 1;

            return;
          }
          if (destination.outcome === "none") {
            throw new Error(`could not resolve destination ${JSON.stringify(options.to)}`);
          }

          const { deliveryType: resolvedType, shipment, address, geocoded } = destination.destination;

          if (geocoded !== undefined) place = addressCandidateText(geocoded);

          resolved = {
            deliveryType: resolvedType,
            address,
            branchId: shipment.branchId,
            shipments: [shipment],
            timeslot: await selectSlot(silpo, shipment.branchId, resolvedType, when),
          };
        } else if (when !== undefined) {
          const { cart } = await shoppingCart.current();
          const shipment = cartShipment(cart);
          const effectiveType = deliveryType ?? cart.deliveryType;

          resolved = {
            timeslot: await selectSlot(silpo, shipment.branchId, effectiveType, when),
          };
        }

        const { confirmed: written, state: resulting } = await shoppingCart.setup({
          deliveryType: deliveryType ?? resolved.deliveryType,
          timeslot: resolved.timeslot,
          address: resolved.address,
          shipments: resolved.shipments,
          branchId: resolved.branchId,
          feedbackChanges: options.feedbackChanges as tools.FeedbackChanges | undefined,
          feedbackContacts: options.feedbackContacts as tools.FeedbackContacts | undefined,
        });

        process.stdout.write(writeText(written.summary, false, resulting, place));

        if (!written.success) process.exitCode = 1;
      },
    );

  cart
    .command("promo")
    .description(`Set the cart's promo code, or clear it by naming "${NONE}"`)
    .argument("<code>", `promo code, or "${NONE}" to clear it`)
    .action(async (code: string) => {
      const { confirmed: written, state: resulting } = await shoppingCart.setup({
        promoCode: readNullable(code),
      });

      process.stdout.write(writeText(written.summary, false, resulting));

      if (!written.success) process.exitCode = 1;
    });

  cart
    .command("bonus")
    .description(`Request an amount of bonuses to spend, or clear the request by naming "${NONE}"`)
    .argument("<amount>", `bonus amount, or "${NONE}" to clear it`)
    .action(async (amount: string) => {
      const { confirmed: written, state: resulting } = await shoppingCart.setup({
        bonusRequested: amount === NONE ? null : requireNumber(amount),
      });

      process.stdout.write(writeText(written.summary, false, resulting));

      if (!written.success) process.exitCode = 1;
    });

  cart
    .command("adult")
    .description(
      "Confirm the buyer is old enough for restricted goods. One-way: the server accepts a request to clear it but ignores that request, so there is no way to clear it here",
    )
    .action(async () => {
      const { confirmed: written, state: resulting } = await shoppingCart.setup({
        isAdultConfirmed: true,
      });

      process.stdout.write(writeText(written.summary, false, resulting));

      if (!written.success) process.exitCode = 1;
    });

  const certificate = cart
    .command("certificate")
    .description("Add or remove one gift certificate by its barcode");

  certificate
    .command("add")
    .description("Apply a certificate to the cart")
    .argument("<barcode>", "certificate barcode")
    .option("--pin <code>", "the certificate's pin, where it needs one")
    .action(async (barcode: string, options: { pin?: string }) => {
      const { confirmed: written, state: resulting } = await shoppingCart.certificates({
        add: [{ barcode, ...(options.pin === undefined ? {} : { pincode: options.pin }) }],
      });

      process.stdout.write(writeText(certificatesText(written), false, resulting));

      if (!written.success) process.exitCode = 1;
    });

  certificate
    .command("remove")
    .description("Take a certificate off the cart")
    .argument("<barcode>", "certificate barcode")
    .action(async (barcode: string) => {
      const { confirmed: written, state: resulting } = await shoppingCart.certificates({
        remove: [{ barcode }],
      });

      process.stdout.write(writeText(certificatesText(written), false, resulting));

      if (!written.success) process.exitCode = 1;
    });

  return cart;
}
