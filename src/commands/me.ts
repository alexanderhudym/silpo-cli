import type { Command } from "commander";

import { shoppingCart, silpo } from "../daemon/client.js";
import { cartShipment } from "../daemon/cart.js";
import type {
  GetCouponDetailsResult,
  GetLoyaltyInfoResult,
  GetMyCertificatesResult,
  GetMyCouponsResult,
  GetMyDeliveryAddressesResult,
  GetMyFamilyResult,
  GetMyFoodRestrictionsResult,
  GetMyOfflineOrdersResult,
  GetMyOnlineOrdersResult,
  GetMyPremiumSubscriptionResult,
  GetMyPromosResult,
  GetMyProfileResult,
  GetPromoCodesResult,
} from "../mcp/silpo.js";
import { formatAddress } from "../utils/address.js";
import { toLocalTime, toUtc } from "../utils/datetime.js";
import { formatList, formatRows, indent } from "../utils/list.js";
import { requireInteger } from "../utils/number.js";
import { countedAs, readCapped } from "../utils/paginate.js";
import { OFFLINE_ORDERS_CAP, ONLINE_ORDERS_CAP } from "../mcp/silpo.js";
import { formatAmount, formatPricedName, isPieceUnit, isWeightUnit } from "../utils/price.js";
import { formatEntryAsRow, formatEntryAsSection } from "../utils/record.js";
import { formatCoordinate } from "../utils/coordinate.js";

const TITLES: Readonly<Record<string, string>> = { male: "Mr", female: "Ms" };
const INACTIVE = "inactive";
const SELECTED = "selected";
const REMOVED = "removed";
const NO_OFFLINE_DATES = "--date-start and --date-end apply only with --offline";

function profileBody(payload: GetMyProfileResult): string {
  const { firstName, middleName, lastName, phone, email, birthday, gender } = payload.profile;

  return formatRows([
    [TITLES[gender ?? ""], lastName, firstName, middleName].filter(Boolean).join(" "),
    phone,
    email,
    birthday && formatEntryAsRow("birthday", birthday),
  ]);
}

function loyaltyBody(payload: GetLoyaltyInfoResult): string {
  const { card, balance } = payload.loyalty;

  const accounts = (balance?.accounts ?? []).map(({ type, amount }) =>
    formatEntryAsRow(type, amount),
  );

  return formatRows([
    card && formatEntryAsRow("barcode", card.barcode),
    card && formatEntryAsRow("card", card.typeName),
    balance && formatEntryAsRow("bonus", `${balance.total} ${balance.currency}`),
    ...accounts,
  ]);
}

function premiumBody(payload: GetMyPremiumSubscriptionResult): string {
  const { summary, status, dateFrom, dateTo, bonusesObtainedAmount, webLink, mobileLink } = payload;

  return formatRows([
    summary,
    status && formatEntryAsRow("status", status),
    dateFrom && formatEntryAsRow("from", toLocalTime(dateFrom)),
    dateTo && formatEntryAsRow("until", toLocalTime(dateTo)),
    bonusesObtainedAmount !== undefined && formatEntryAsRow("bonuses", bonusesObtainedAmount),
    webLink && formatEntryAsRow("web", webLink),
    mobileLink && formatEntryAsRow("mobile", mobileLink),
  ]);
}

export function meText(
  profile: GetMyProfileResult,
  loyalty: GetLoyaltyInfoResult,
  premium: GetMyPremiumSubscriptionResult,
): string {
  const body = formatList([profileBody(profile), loyaltyBody(loyalty), premiumBody(premium)]);

  return `${body}\n`;
}

export function addressesText(payload: GetMyDeliveryAddressesResult): string {
  const items = payload.addresses.map(
    ({
      id,
      tag,
      city,
      street,
      building,
      floor,
      apartment,
      entrance,
      latitude,
      longitude,
      comment,
    }) => {
      const address = formatAddress({ city, street, building, entrance, floor, apartment });

      return formatRows([
        formatEntryAsRow("id", id),
        tag && formatEntryAsRow("tag", tag),
        address && formatEntryAsRow("address", address),
        latitude !== null &&
          longitude !== null &&
          formatEntryAsRow(
            "coordinates",
            `${formatCoordinate(latitude)}, ${formatCoordinate(longitude)}`,
          ),
        comment && formatEntryAsRow("comment", comment),
      ]);
    },
  );

  const body = formatList([payload.summary, formatList(items)]);

  return `${body}\n`;
}

export function familyText(payload: GetMyFamilyResult): string {
  const { summary, name, members, children, pets } = payload;

  const body = formatList([
    formatRows([summary, name && formatEntryAsRow("family", name)]),
    members.length > 0 &&
      formatEntryAsSection(
        "members",
        formatList(
          members.map(({ name: who, phone, image, profileCreatedAt, itsMe }) =>
            formatRows([
              who && formatEntryAsRow("name", who),
              formatEntryAsRow("phone", phone),
              formatEntryAsRow("since", toLocalTime(profileCreatedAt)),
              itsMe && "me",
              image && formatEntryAsRow("image", image),
            ]),
          ),
        ),
      ),
    children.length > 0 &&
      formatEntryAsSection(
        "children",
        formatList(
          children.map(({ name: who, slug, dateOfBirth }) =>
            formatRows([
              who && formatEntryAsRow("name", who),
              formatEntryAsRow("slug", slug),
              dateOfBirth && formatEntryAsRow("born", dateOfBirth),
            ]),
          ),
        ),
      ),
    pets.length > 0 &&
      formatEntryAsSection(
        "pets",
        formatList(
          pets.map(({ name: who, slug }) =>
            formatRows([who && formatEntryAsRow("name", who), formatEntryAsRow("slug", slug)]),
          ),
        ),
      ),
  ]);

  return `${body}\n`;
}

export function restrictionsText(payload: GetMyFoodRestrictionsResult): string {
  const items = payload.restrictions.map(({ slug, name }) =>
    formatRows([name && formatEntryAsRow("name", name), formatEntryAsRow("slug", slug)]),
  );

  const body = formatList([payload.summary, formatList(items)]);

  return `${body}\n`;
}

export function couponsText(payload: GetMyCouponsResult): string {
  const items = payload.coupons.map(
    ({ id, active, useWay, beginDate, endDate, description, limitText, warningText }) =>
      formatRows([
        formatEntryAsRow("id", id),
        description && formatEntryAsRow("description", description),
        !active && INACTIVE,
        beginDate && formatEntryAsRow("from", toLocalTime(beginDate)),
        endDate && formatEntryAsRow("until", toLocalTime(endDate)),
        useWay && formatEntryAsRow("use", useWay),
        limitText && formatEntryAsRow("limit", limitText),
        warningText && formatEntryAsRow("warning", warningText),
      ]),
  );

  return `${formatList([payload.summary, formatList(items)])}\n`;
}

export function couponText(payload: GetCouponDetailsResult): string {
  const {
    id,
    active,
    state,
    useWay,
    beginDate,
    endDate,
    usedCount,
    description,
    limitText,
    warningText,
    rewardText,
    rewardValue,
  } = payload.coupon;

  const body = formatRows([
    formatEntryAsRow("id", id),
    description && formatEntryAsRow("description", description),
    !active && INACTIVE,
    state && formatEntryAsRow("state", state),
    rewardText && formatEntryAsRow("reward", rewardText),
    rewardValue !== null && formatEntryAsRow("value", rewardValue),
    beginDate && formatEntryAsRow("from", toLocalTime(beginDate)),
    endDate && formatEntryAsRow("until", toLocalTime(endDate)),
    formatEntryAsRow("used", usedCount),
    useWay && formatEntryAsRow("use", useWay),
    limitText && formatEntryAsRow("limit", limitText),
    warningText && formatEntryAsRow("warning", warningText),
  ]);

  return `${body}\n`;
}

export function promosText(promos: GetMyPromosResult, codes: GetPromoCodesResult): string {
  const promoItems = promos.promos.map(
    ({
      promoId,
      selected,
      beginDate,
      endDate,
      description,
      rewardText,
      rewardValue,
      limitText,
      warningText,
      addressListText,
    }) =>
      formatRows([
        formatEntryAsRow("id", promoId),
        description && formatEntryAsRow("description", description),
        selected && SELECTED,
        rewardText && formatEntryAsRow("reward", rewardText),
        rewardValue !== null && formatEntryAsRow("value", rewardValue),
        beginDate && formatEntryAsRow("from", toLocalTime(beginDate)),
        endDate && formatEntryAsRow("until", toLocalTime(endDate)),
        limitText && formatEntryAsRow("limit", limitText),
        warningText && formatEntryAsRow("warning", warningText),
        addressListText && formatEntryAsRow("where", addressListText),
      ]),
  );

  const codeItems = codes.promoCodes.map(({ code, title, active }) =>
    formatRows([
      formatEntryAsRow("code", code),
      title && formatEntryAsRow("title", title),
      !active && INACTIVE,
    ]),
  );

  const body = formatList([
    formatEntryAsSection("personal", indent(formatList([promos.summary, formatList(promoItems)]))),
    formatEntryAsSection("codes", indent(formatList([codes.summary, formatList(codeItems)]))),
  ]);

  return `${body}\n`;
}

export function certificatesText(payload: GetMyCertificatesResult): string {
  const items = payload.certificates.map(
    ({ barcode, pincode, totalPrice, createdAt, expireDate, title }) =>
      formatRows([
        formatEntryAsRow("barcode", barcode),
        formatEntryAsRow("value", totalPrice),
        pincode !== null && formatEntryAsRow("pincode", pincode),
        title && formatEntryAsRow("title", title),
        formatEntryAsRow("issued", toLocalTime(createdAt)),
        expireDate && formatEntryAsRow("until", toLocalTime(expireDate)),
      ]),
  );

  return `${formatList([payload.summary, formatList(items)])}\n`;
}

export function onlineText(payload: GetMyOnlineOrdersResult): string {
  const items = payload.orders.map(
    ({ orderId, number, status, createdAt, amount, discount, delivery, address, products }) => {
      const rows = products.map(({ id, name, price, quantity, subtotal, removed }) =>
        formatRows([
          formatEntryAsRow("id", id),
          formatEntryAsRow("quantity", quantity),
          formatEntryAsRow("total", subtotal),
          removed && REMOVED,
          formatPricedName({ name, price }),
        ]),
      );

      const window = delivery?.timeSlot;
      const place = address && formatAddress(address);
      const boughtAt = products[0]?.branchId;

      return formatRows([
        formatEntryAsRow("id", orderId),
        number && formatEntryAsRow("number", number),
        formatEntryAsRow("status", status),
        formatEntryAsRow("created", toLocalTime(createdAt)),
        formatEntryAsRow("amount", amount),
        discount > 0 && formatEntryAsRow("discount", discount),
        delivery && formatEntryAsRow("delivery", delivery.type),
        window?.from &&
          window.to &&
          formatEntryAsRow("window", `${toLocalTime(window.from)} - ${toLocalTime(window.to)}`),
        delivery?.deliveredAt && formatEntryAsRow("delivered", toLocalTime(delivery.deliveredAt)),
        place && formatEntryAsRow("address", place),
        boughtAt !== undefined && formatEntryAsRow("branchId", boughtAt),
        rows.length > 0 && formatEntryAsSection("products", indent(formatList(rows))),
      ]);
    },
  );

  const body = formatList([payload.summary, formatList(items)]);

  return `${body}\n`;
}

export function offlineText(payload: GetMyOfflineOrdersResult): string {
  const items = payload.orders.map(
    ({
      filialName,
      cityName,
      createdAt,
      sumReg,
      sumDiscount,
      accruedBalaBonusesSum,
      rewards,
      products,
    }) => {
      const earned = rewards.map(({ rewardGroupCodeName, applyText, applyRewardAmount }) =>
        formatEntryAsRow(applyText ?? rewardGroupCodeName, applyRewardAmount),
      );

      const lines = products.map(({ name, unit, quantity, price, catalogProduct }) => {
        const priced = isWeightUnit(unit) ? unit : null;
        const size = priced === null && !isPieceUnit(unit) ? unit : null;

        return formatRows([
          formatEntryAsRow("quantity", formatAmount(quantity, priced)),
          catalogProduct !== null && formatEntryAsRow("productId", catalogProduct.id),
          catalogProduct !== null && formatEntryAsRow("slug", catalogProduct.slug),
          formatPricedName({ name, price, unit: priced, size }),
        ]);
      });

      return formatRows([
        formatEntryAsRow("store", filialName),
        formatEntryAsRow("city", cityName),
        formatEntryAsRow("at", toLocalTime(createdAt)),
        formatEntryAsRow("sum", sumReg),
        sumDiscount > 0 && formatEntryAsRow("discount", sumDiscount),
        accruedBalaBonusesSum > 0 && formatEntryAsRow("bonuses", accruedBalaBonusesSum),
        earned.length > 0 && formatEntryAsSection("rewards", indent(formatRows(earned))),
        lines.length > 0 && formatEntryAsSection("products", indent(formatList(lines))),
      ]);
    },
  );

  const body = formatList([payload.summary, formatList(items)]);

  return `${body}\n`;
}


type OrderPage<Row> = {
  success: boolean;
  summary: string;
  orders: Row[];
  meta: { limit: number; offset: number; total: number };
};

/**
 * A tool that returns fewer rows a call than were asked for is read in pages rather than refused:
 * in-store receipts cap at ten, so `--limit 15` used to come back as the server's own validation
 * error naming a limit the caller never chose. The merged summary counts what was merged, because
 * the commands print it as it stands.
 */
async function readOrderPages<Row>(
  cap: number,
  limit: number | undefined,
  offset: number | undefined,
  read: (limit: number, offset: number) => Promise<OrderPage<Row>>,
): Promise<OrderPage<Row>> {
  const from = offset ?? 0;

  if (limit === undefined || limit <= cap) return read(limit ?? cap, from);

  const first = await read(cap, from);
  const orders = await readCapped<Row>(cap, limit, async (pageLimit, pageOffset) => {
    const page = pageOffset === 0 ? first : await read(pageLimit, from + pageOffset);

    return { rows: page.orders, total: page.meta.total - from };
  });

  return {
    ...first,
    orders,
    summary: countedAs(first.summary, orders.length),
    meta: { ...first.meta, limit, offset: from },
  };
}

export function registerMeCommands(program: Command): void {
  const me = program
    .command("me")
    .description("Who is signed in: profile, loyalty balance and premium subscription")
    .action(async () => {
      const [profile, loyalty, premium] = await Promise.all([
        silpo.getMyProfile(),
        silpo.getLoyaltyInfo(),
        silpo.getMyPremiumSubscription(),
      ]);

      process.stdout.write(meText(profile.structured, loyalty.structured, premium.structured));
    });

  me.command("addresses")
    .description("Saved delivery addresses")
    .action(async () => {
      const { structured: payload } = await silpo.getMyDeliveryAddresses();

      process.stdout.write(addressesText(payload));
    });

  me.command("family")
    .description("Household members, children and pets")
    .action(async () => {
      const { structured: payload } = await silpo.getMyFamily();

      process.stdout.write(familyText(payload));
    });

  me.command("restrictions")
    .description("Dietary restrictions and food preferences")
    .action(async () => {
      const { structured: payload } = await silpo.getMyFoodRestrictions();

      process.stdout.write(restrictionsText(payload));
    });

  me.command("coupons")
    .description("Coupons available to the user")
    .action(async () => {
      const { structured: payload } = await silpo.getMyCoupons();

      process.stdout.write(couponsText(payload));
    });

  me.command("coupon")
    .description("Coupon terms and the products it applies to")
    .argument("<businessCouponId>", "business coupon id, from the coupons listing")
    .action(async (businessCouponId: string) => {
      const { structured: payload } = await silpo.getCouponDetails({
        businessCouponId: requireInteger(businessCouponId),
      });

      process.stdout.write(couponText(payload));
    });

  me.command("promos")
    .description("Personal promotions and active promo codes")
    .action(async () => {
      const [promos, codes] = await Promise.all([silpo.getMyPromos(), silpo.getPromoCodes()]);

      process.stdout.write(promosText(promos.structured, codes.structured));
    });

  me.command("certificates")
    .description("Gift certificates of the user")
    .option("--limit <n>", "page size")
    .option("--offset <n>", "page offset")
    .action(async (options: { limit?: string; offset?: string }) => {
      const { structured: payload } = await silpo.getMyCertificates({
        limit: options.limit === undefined ? undefined : requireInteger(options.limit),
        offset: options.offset === undefined ? undefined : requireInteger(options.offset),
      });

      process.stdout.write(certificatesText(payload));
    });

  me.command("orders")
    .description("Order history: online by default, in-store receipts with --offline")
    .option("--offline", "in-store receipts instead of online orders")
    .option(
      "--date-start <time>",
      "earliest receipt date: today, tomorrow, a date, or a date and a time; with --offline",
    )
    .option(
      "--date-end <time>",
      "latest receipt date: today, tomorrow, a date, or a date and a time; with --offline",
    )
    .option("--limit <n>", "page size")
    .option("--offset <n>", "page offset")
    .action(
      async (options: {
        offline?: boolean;
        dateStart?: string;
        dateEnd?: string;
        limit?: string;
        offset?: string;
      }) => {
        const limit = options.limit === undefined ? undefined : requireInteger(options.limit);
        const offset = options.offset === undefined ? undefined : requireInteger(options.offset);

        if (options.offline !== true) {
          if (options.dateStart !== undefined || options.dateEnd !== undefined) {
            throw new Error(NO_OFFLINE_DATES);
          }

          const payload = await readOrderPages(ONLINE_ORDERS_CAP, limit, offset, async (l, o) => {
            const { structured } = await silpo.getMyOnlineOrders({ limit: l, offset: o });

            return structured;
          });

          process.stdout.write(onlineText(payload));
          return;
        }

        const { cart } = await shoppingCart.current();
        const shipment = cartShipment(cart);

        const payload = await readOrderPages(OFFLINE_ORDERS_CAP, limit, offset, async (l, o) => {
          const { structured } = await silpo.getMyOfflineOrders({
            branchId: shipment.branchId,
            deliveryType: cart.deliveryType,
            timeslotStart: cart.timeslot.start,
            timeslotEnd: cart.timeslot.end,
            dateStart:
              options.dateStart === undefined ? undefined : toUtc(options.dateStart, "start"),
            dateEnd: options.dateEnd === undefined ? undefined : toUtc(options.dateEnd, "end"),
            limit: l,
            offset: o,
          });

          return structured;
        });

        process.stdout.write(offlineText(payload));
      },
    );
}
