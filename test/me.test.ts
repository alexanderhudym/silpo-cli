import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  clearToolCalls,
  fails,
  fixture,
  render,
  run,
  setPayloads,
  startDaemon,
  stopDaemon,
  toolCalls,
} from "./harness.ts";

const PROFILE_TOOL = "silpo_get_my_profile";
const LOYALTY_TOOL = "silpo_get_loyalty_info";
const PREMIUM_TOOL = "silpo_get_my_premium_subscription";
const PROMOS_TOOL = "silpo_get_my_promos";
const CODES_TOOL = "silpo_get_promo_codes";
const OFFLINE_TOOL = "silpo_get_my_offline_orders";

const BASE_LOYALTY = fixture("loyalty.loyalty");
const BASE_PREMIUM = fixture("loyalty.premium");
const CART_READ = { silpo_get_shopping_cart_by_id: fixture("cart.details") };

function withProfile(profile: Record<string, unknown>): void {
  setPayloads({
    [PROFILE_TOOL]: { success: true, profile },
    [LOYALTY_TOOL]: BASE_LOYALTY,
    [PREMIUM_TOOL]: BASE_PREMIUM,
  });
}

before(startDaemon);
after(stopDaemon);

test("me prints one fact per line, surname first, then the loyalty balance and the subscription", async () => {
  setPayloads({
    [PROFILE_TOOL]: fixture("profile.profile"),
    [LOYALTY_TOOL]: BASE_LOYALTY,
    [PREMIUM_TOOL]: BASE_PREMIUM,
  });

  const text = await run(["me"]);

  assert.equal(
    text,
    [
      "Mr Тестенко Богдан",
      "+380671234567",
      "bohdan.testenko@example.com",
      "birthday: 1990-05-12",
      "",
      "barcode: 0249999999999",
      "card: Постійна",
      "bonus: 107.56 UAH",
      "Regular: 102.78",
      "Moneybox: 4.78",
      "",
      "You don't have an active Плюхс premium subscription. You can subscribe.",
      "web: https://silpo.ua/subscription?utm_source=web&utm_medium=silpo&utm_campaign=mcp",
      "mobile: https://link.silpo.ua/w4rW",
      "",
    ].join("\n"),
  );
});

test("me takes no flag that would print the id", async () => {
  const message = await run(["me", "--help"]);

  assert.ok(!message.includes("--with-id"), "the id flag survived");
});

test("me titles a name by gender and says nothing when there is none", async () => {
  const profile = {
    id: "1ee9c0f4-3b71-6a2c-9d18-4f7b2e5a8c31",
    firstName: "Олена",
    lastName: "Тестенко",
    middleName: "Петрівна",
    phone: null,
    email: null,
    birthday: null,
    gender: "female",
    status: "active",
  };

  withProfile(profile);
  assert.ok((await run(["me"])).startsWith("Ms Тестенко Олена Петрівна\n"));

  withProfile({ ...profile, gender: "notSpecified" });
  assert.ok((await run(["me"])).startsWith("Тестенко Олена Петрівна\n"));

  withProfile({ ...profile, gender: null });
  assert.ok((await run(["me"])).startsWith("Тестенко Олена Петрівна\n"));
});

test("me prints the birthday as the date the server gave", async () => {
  setPayloads({
    [PROFILE_TOOL]: fixture("profile.profile"),
    [LOYALTY_TOOL]: BASE_LOYALTY,
    [PREMIUM_TOOL]: BASE_PREMIUM,
  });

  const text = await run(["me"]);

  assert.ok(text.includes("birthday: 1990-05-12"), "the birthday was converted");
});

test("me prints the card's barcode and type and no member id", async () => {
  setPayloads({
    [PROFILE_TOOL]: fixture("profile.profile"),
    [LOYALTY_TOOL]: BASE_LOYALTY,
    [PREMIUM_TOOL]: BASE_PREMIUM,
  });

  const text = await run(["me"]);

  assert.ok(text.includes("barcode: 0249999999999\ncard: Постійна\n"), "the card was dropped");
  assert.ok(!text.includes("10000001"), "the member id was printed");
});

test("me keeps the links that are the whole answer when there is no subscription", async () => {
  setPayloads({
    [PROFILE_TOOL]: fixture("profile.profile"),
    [LOYALTY_TOOL]: BASE_LOYALTY,
    [PREMIUM_TOOL]: BASE_PREMIUM,
  });

  const text = await run(["me"]);

  assert.ok(text.includes("web: https://silpo.ua/subscription"), "the web link was dropped");
  assert.ok(text.includes("mobile: https://link.silpo.ua/"), "the mobile link was dropped");
});

test("no me command prints whether the call succeeded", async () => {
  setPayloads({
    [PROFILE_TOOL]: fixture("profile.profile"),
    [LOYALTY_TOOL]: BASE_LOYALTY,
    [PREMIUM_TOOL]: BASE_PREMIUM,
  });

  assert.ok(!(await run(["me"])).includes("success"));
});

test("addresses gives every field a key and a line, and separates the items", async () => {
  const text = await render("profile.addresses", ["me", "addresses"]);

  assert.equal(
    text,
    [
      "Found 3 saved addresses",
      "",
      "id: 1ef1b2c3-8ac6-6f71-9c6d-9e4a7d0b5c86",
      "tag: home",
      "address: Київ, Хрещатик, буд. 1, під. 2, пов. 3, кв. 12",
      "coordinates: 50.447471, 30.521506",
      "comment: домофон не працює",
      "",
      "id: 1ef1b2c3-9bd7-6082-8d7e-af5b8e1c6d97",
      "tag: work",
      "address: Львів, Личаківська, буд. 12А",
      "coordinates: 49.837739, 24.041416",
      "",
      "id: 1ef1b2c3-ace8-6193-9e8f-b06c9f2d7ea8",
      "address: Одеса",
      "",
    ].join("\n"),
  );
});

test("family lists members, children and pets without printing an id", async () => {
  const text = await render("profile.family", ["me", "family"]);

  assert.equal(
    text,
    [
      "Found 2 members, 1 child and 2 pets",
      "family: Тестенки",
      "",
      "members",
      "name: Богдан",
      "phone: +380671234567",
      "since: 2023-04-11 11:15",
      "me",
      "",
      "phone: +380501234567",
      "since: 2024-02-03 10:40",
      "",
      "children",
      "name: Марія",
      "slug: mariia",
      "born: 2019-09-01",
      "",
      "pets",
      "name: Мурчик",
      "slug: cat",
      "",
      "slug: dog",
      "",
    ].join("\n"),
  );
  assert.ok(!text.includes("@"), "a marker was printed");
});

test("restrictions read like every other listing", async () => {
  const text = await render("profile.restrictions", ["me", "restrictions"]);

  assert.equal(
    text,
    [
      "Found 3 food restrictions",
      "",
      "name: Веган",
      "slug: vegan",
      "",
      "name: Без лактози",
      "slug: lactose-free",
      "",
      "slug: no-sugar",
      "",
    ].join("\n"),
  );
});

test("no me subcommand prints whether the call succeeded", async () => {
  for (const [name, args] of [
    ["profile.addresses", ["me", "addresses"]],
    ["profile.family", ["me", "family"]],
    ["profile.restrictions", ["me", "restrictions"]],
    ["loyalty.coupons", ["me", "coupons"]],
    ["loyalty.coupon", ["me", "coupon", "4471203"]],
    ["loyalty.certificates", ["me", "certificates"]],
  ] as [string, string[]][]) {
    assert.ok(
      !(await render(name, args)).includes("success"),
      `${args.join(" ")} printed the success field`,
    );
  }
});

test("an empty account listing prints the summary and nothing else", async () => {
  for (const [summary, payload, args] of [
    ["No coupons found", { coupons: [] }, ["me", "coupons"]],
    ["No certificates found", { certificates: [] }, ["me", "certificates"]],
  ] as [string, Record<string, unknown>, string[]][]) {
    setPayloads({
      silpo_get_my_coupons: { success: true, summary, ...payload },
      silpo_get_my_certificates: { success: true, summary, ...payload },
    });

    assert.equal(await run(args), `${summary}\n`);
  }
});

test("a coupon says when it is no longer active", async () => {
  const text = await render("loyalty.coupons", ["me", "coupons"]);
  const [first, second] = text.split("\n\n").slice(1);

  assert.ok(!first?.includes("inactive"), "an active coupon was called inactive");
  assert.ok(second?.includes("\ninactive\n"), "an inactive coupon does not say so");
  assert.ok(!text.includes("image"), "an image address survived");
});

test("a coupon card shows how often it was used", async () => {
  const text = await render("loyalty.coupon", ["me", "coupon", "4471203"]);

  assert.ok(text.includes("used: 1"), "the use count was dropped");
  assert.ok(text.includes("reward: -30%"), "the reward was dropped");
});

test("promos prints the personal offers and the promo codes under their own groups", async () => {
  setPayloads({
    [PROMOS_TOOL]: fixture("loyalty.promos"),
    [CODES_TOOL]: fixture("loyalty.promo-codes"),
  });

  const text = await run(["me", "promos"]);

  assert.ok(text.startsWith("personal\n"), "the personal offers are not their own group");
  assert.ok(text.includes("\ncodes\n"), "the promo codes are not their own group");
  assert.ok(text.includes("code: SUMMER30"), "a promo code was dropped");
});

test("an empty half of the promos prints its own summary and the other its items", async () => {
  setPayloads({
    [PROMOS_TOOL]: { success: true, summary: "No personal promos available", promos: [], meta: {} },
    [CODES_TOOL]: fixture("loyalty.promo-codes"),
  });

  const text = await run(["me", "promos"]);

  assert.ok(text.includes("No personal promos available"), "the empty half lost its own summary");
  assert.ok(text.includes("code: SUMMER30"), "the other half's items were dropped");
});

test("an online order nests its lines under one group and drops the image", async () => {
  const text = await render("orders.online", ["me", "orders"]);

  assert.match(
    text,
    /\nproducts\n {2}id: [0-9a-f-]{36}\n/,
    "the lines are not a group of their own",
  );
  assert.ok(!text.includes("images.silpo.ua"), "an image address survived");
  assert.ok(!text.includes("subtotal"), "the payload's field name survived");
});

test("an online order joins its address into one line", async () => {
  const text = await render("orders.online", ["me", "orders"]);

  assert.ok(
    text.includes("address: Київ, вулиця Хрещатик, буд. 1, кв. 12"),
    "the address was not joined",
  );
  assert.equal(text.split("\n").filter((line) => line.startsWith("city")).length, 0);
});

test("an online order says which line did not arrive", async () => {
  const text = await render("orders.online", ["me", "orders"]);

  assert.ok(text.includes("  total: 21.11\n  removed\n"), "a removed line does not say so");
  assert.equal(text.split("\n").filter((line) => line === "  removed").length, 1);
});

test("an online order shows its moments as local wall clock time", async () => {
  const text = await render("orders.online", ["me", "orders"]);

  assert.ok(text.includes("created: 2026-04-15 10:41"), "the moment was not moved into the zone");
  assert.ok(text.includes("window: 2026-04-15 12:30 - 2026-04-15 14:00"), "the window is wrong");
  assert.ok(!text.includes("T07:41"), "a raw instant survived");
});

test("the in-store history fills the branch, delivery type and time slot from the cart", async () => {
  setPayloads({ ...CART_READ, [OFFLINE_TOOL]: fixture("orders.offline") });
  clearToolCalls();

  await run(["me", "orders", "--offline"]);

  const call = toolCalls().find((entry) => entry.name === OFFLINE_TOOL);

  assert.equal(call?.arguments.branchId, "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468");
  assert.equal(call?.arguments.deliveryType, "SelfPickup");
  assert.equal(call?.arguments.timeslotStart, "2026-08-21T06:00:00+00:00");
  assert.equal(call?.arguments.timeslotEnd, "2026-08-21T06:30:00+00:00");
});

test("the caller assembles no delivery context for the in-store history", async () => {
  const message = await run(["me", "orders", "--offline", "--help"]);

  assert.ok(!message.includes("--branch-id"), "the caller is still asked for a branch");
  assert.ok(!message.includes("--delivery-type"), "the caller is still asked for a delivery type");
  assert.ok(!message.includes("--timeslot-start"), "the caller is still asked for a time slot");
});

test("a receipt prints its rewards with the text and the amount", async () => {
  const text = await render("orders.offline", ["me", "orders", "--offline"]);

  assert.ok(
    text.includes("rewards\n  YEZZZ! Купуй та отримуй безкоштовний зв'язок: 2408.43\n"),
    "a reward lost its text or its amount",
  );
  assert.ok(text.includes("  Використані балобонуси: 99.26"), "a reward without a promo was dropped");
  assert.ok(!text.includes("CN_REWARD"), "the reward group code was printed");
});

test("a receipt keeps a returned line as the negative quantity it is", async () => {
  const text = await render("orders.offline", ["me", "orders", "--offline"]);

  assert.ok(text.includes("  quantity: -1\n"), "a return line was dropped");
});

test("a receipt line with no catalogue product prints quantity, name and price and nothing else", async () => {
  const text = await render("orders.offline", ["me", "orders", "--offline"]);

  assert.ok(
    text.includes("  quantity: 1\n  Макаронні вироби Garofalo Лінгвіне 500г — 119 ₴\n"),
    "a line with no catalogue product printed more than quantity, name and price",
  );
});

test("a line with no catalogue product prints the same, whatever other listing ran first in the process", async () => {
  await render("orders.online", ["me", "orders"]);

  setPayloads({ ...CART_READ, [OFFLINE_TOOL]: fixture("orders.offline") });
  const text = await run(["me", "orders", "--offline"]);

  assert.ok(
    text.includes("  quantity: 1\n  Макаронні вироби Garofalo Лінгвіне 500г — 119 ₴\n"),
    "an earlier listing changed what the unmatched line prints",
  );
});

test("no order command prints whether the call succeeded", async () => {
  assert.ok(!(await render("orders.online", ["me", "orders"])).includes("success"));

  setPayloads({ ...CART_READ, [OFFLINE_TOOL]: fixture("orders.offline") });
  assert.ok(!(await run(["me", "orders", "--offline"])).includes("success"));
});

test("--date-start and --date-end apply only with --offline", async () => {
  const message = await fails(["me", "orders", "--date-start", "2026-01-01"]);

  assert.match(message, /--offline/);
});

test("--date-start and --date-end accept today and tomorrow, not only a local or zoned instant", async () => {
  setPayloads({ ...CART_READ, [OFFLINE_TOOL]: fixture("orders.offline") });
  clearToolCalls();

  await run(["me", "orders", "--offline", "--date-start", "today", "--date-end", "tomorrow"]);

  const call = toolCalls().find((entry) => entry.name === OFFLINE_TOOL);

  assert.equal(typeof call?.arguments.dateStart, "string");
  assert.equal(typeof call?.arguments.dateEnd, "string");
});

test("a --date-start naming none of the three accepted forms fails naming all three", async () => {
  setPayloads({ ...CART_READ, [OFFLINE_TOOL]: fixture("orders.offline") });

  const message = await fails(["me", "orders", "--offline", "--date-start", "not-a-time"]);

  assert.match(message, /expected today, tomorrow, a date, or a date and a time/);
});

test("no line of a me command carries trailing whitespace or a tab", async () => {
  setPayloads({
    [PROFILE_TOOL]: fixture("profile.profile"),
    [LOYALTY_TOOL]: BASE_LOYALTY,
    [PREMIUM_TOOL]: BASE_PREMIUM,
  });

  for (const [name, args] of [
    ["me.me", ["me"]],
    ["profile.addresses", ["me", "addresses"]],
    ["profile.family", ["me", "family"]],
    ["profile.restrictions", ["me", "restrictions"]],
  ] as [string, string[]][]) {
    const text = name === "me.me" ? await run(args) : await render(name, args);

    for (const line of text.split("\n")) {
      assert.equal(line, line.trimEnd(), `${args.join(" ")} carries trailing whitespace`);
      assert.ok(!line.includes("\t"), `${args.join(" ")} carries a tab`);
    }
  }
});
