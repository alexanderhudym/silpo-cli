import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  clearToolCalls,
  fails,
  fixture,
  output,
  run,
  setPayloads,
  startDaemon,
  stopDaemon,
  toolCalls,
} from "./harness.ts";

const LIST_BRANCHES_TOOL = "silpo_list_branches";
const FIND_ADDRESS_TOOL = "silpo_find_address";
const OFFLINE_ORDERS_TOOL = "silpo_get_my_offline_orders";
const DELIVERY_ADDRESSES_TOOL = "silpo_get_my_delivery_addresses";
const DELIVERY_TYPES_TOOL = "silpo_get_available_delivery_types";

const GAHARINA = "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468";
const IVASIUKA = "1ed43e73-051b-6842-a111-a5ad042eb496";
const BEREZHANSKA_2025 = "1eda8887-bf7c-6f38-b0cb-9503162b5586";
const BEREZHANSKA_3319 = "1eda888d-b60d-66f4-a557-03a302d993f3";
const LVIV_1932 = "1ee2b0a3-9f41-6c7e-91ad-7d1a0b53c204";
const DELETE_FILIA = "1edb2828-37e2-6690-af0a-5f4f054120bc";

const EMPTY_ORDERS = {
  success: true,
  summary: "Found 0 offline orders (total: 0)",
  orders: [],
  meta: { limit: 10, offset: 0, total: 0 },
};
const EMPTY_ADDRESSES = { success: true, summary: "Found 0 saved addresses", addresses: [] };

before(startDaemon);
after(stopDaemon);

function branchesPayload(branches: readonly Record<string, unknown>[]): Record<string, unknown> {
  return {
    success: true,
    summary: `Found ${branches.length} branches (total: ${branches.length})`,
    branches,
    meta: { limit: 500, offset: 0, total: branches.length },
  };
}

function decoyBranches(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_, index) =>
    branchAt(`decoy-${index}`, "49.5535", "25.5948", {
      city: "Тернопіль",
      address: `вул. Замкова, ${index + 1}`,
    }),
  );
}

function branchAt(
  id: string,
  latitude: string | null,
  longitude: string | null,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    branchId: `1ee15e2a-7c41-6b83-9d52-4b7d0e930${id}`,
    companyId: "1ec88c5d-a050-669c-8467-570a157f3e31",
    externalId: null,
    city: `Місто ${id}`,
    address: null,
    latitude,
    longitude,
    hasPickup: true,
    open: true,
    ...overrides,
  };
}

function offlineOrders(entries: readonly { filId: string | number; branchId?: string }[]): Record<string, unknown> {
  return {
    success: true,
    summary: `Found ${entries.length} offline orders (total: ${entries.length})`,
    meta: { limit: 10, offset: 0, total: entries.length },
    orders: entries.map(({ filId, branchId }, index) => ({
      filId,
      filialName: "test",
      cityName: "test",
      createdAt: `2026-08-0${index + 1}T10:00:00`,
      products:
        branchId === undefined
          ? []
          : [
              {
                lagerId: 1,
                name: "test",
                unit: "pcs",
                quantity: 1,
                price: 1,
                image: null,
                catalogProduct: {
                  id: "p-1",
                  name: "test",
                  slug: "test",
                  price: 1,
                  stock: 1,
                  available: true,
                  image: null,
                  weighted: false,
                  step: 1,
                  companyId: "c-1",
                  branchId,
                },
              },
            ],
    })),
  };
}

function savedAddress(latitude: number, longitude: number): Record<string, unknown> {
  return {
    id: "addr-1",
    tag: null,
    city: null,
    street: null,
    building: null,
    apartment: null,
    floor: null,
    entrance: null,
    latitude,
    longitude,
    comment: null,
  };
}

function geocoded(addresses: readonly Record<string, unknown>[]): Record<string, unknown> {
  return { success: true, summary: `Found ${addresses.length} addresses`, addresses };
}

function geocodedStreet(street: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return geocoded([
    {
      address: null,
      city: null,
      street,
      houseNumber: null,
      district: null,
      latitude: 50.0,
      longitude: 30.0,
      ...overrides,
    },
  ]);
}

function deliveryTypes(options: readonly { deliveryType: string; branchId: string | null }[]): Record<string, unknown> {
  return {
    success: true,
    summary: "",
    options: options.map(({ deliveryType, branchId }) => ({ deliveryType, branchId, description: "" })),
  };
}

function paragraphFor(text: string, id: string): string {
  const paragraph = text.split("\n\n").find((block) => block.includes(`id: ${id}`));

  assert.ok(paragraph !== undefined, `no paragraph carries id: ${id}\n\n${text}`);

  return paragraph!;
}

async function renderAllBranches(): Promise<string> {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: "1998" }]),
    [DELIVERY_ADDRESSES_TOOL]: { success: true, summary: "Found 1 saved addresses", addresses: [savedAddress(50.52022, 30.51452)] },
  });

  return run(["stores", "--limit", "6", "--radius", "20000"]);
}

test("a store says whether it takes pickup and whether it is open, unknown included", async () => {
  const text = await renderAllBranches();

  assert.ok(paragraphFor(text, IVASIUKA).includes("\npickup\nopen"), "a store that takes pickup does not say so");
  assert.ok(
    paragraphFor(text, BEREZHANSKA_3319).includes("\npickup unknown\nopen"),
    "an unknown pickup flag was dropped",
  );
  assert.ok(!text.includes("hasPickup"), "the payload's field name survived");

  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("closed", "49.83", "24.02", { address: "вул. Бережанська, 1", externalId: "9999", open: false }),
    ]),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: "9999" }]),
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const closedText = await run(["stores"]);

  assert.ok(closedText.includes("pickup\nclosed"), "a closed store does not say so");
});

test("a store shows both coordinates on one line, rounded", async () => {
  const text = await renderAllBranches();

  assert.ok(text.includes("coordinates: 50.52022, 30.51452"), "the pair was not rounded");
  assert.ok(!text.includes("50.5202200000000000"), "the raw latitude survived");
  assert.equal(text.split("\n").filter((line) => line.startsWith("latitude")).length, 0);
});

test("a store and its company are named by the uuids the payload carried", async () => {
  const text = await renderAllBranches();

  assert.ok(
    paragraphFor(text, IVASIUKA).startsWith(
      `id: ${IVASIUKA}\ncode: 1998\ncompanyId: 1ec88c5d-a050-669c-8467-570a157f3e31\n`,
    ),
    "the first store lost an identifier",
  );
  assert.ok(
    paragraphFor(text, LVIV_1932).startsWith(
      `id: ${LVIV_1932}\ncode: 1932\ncompanyId: 1ec88c5d-0000-669c-8467-570a157f3e31\n`,
    ),
    "a second company was not printed as its own uuid",
  );
});

test("a store prints its store code beside its uuid, whatever shape the code takes", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("a", "49.83", "24.02", { address: "вул. Бережанська, 1", externalId: "1998" }),
      branchAt("b", "49.84", "24.03", { address: "вул. Бережанська, 2", externalId: "custom_store_code" }),
    ]),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: "1998" }, { filId: "custom_store_code" }]),
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const text = await run(["stores"]);

  assert.ok(text.includes("code: 1998"), "a numeric store code was left out");
  assert.ok(text.includes("code: custom_store_code"), "a store code that is not digits was left out");
});

test("a store joins its city and its street into one line, and drops it with both", async () => {
  const text = await renderAllBranches();

  assert.ok(
    text.includes("address: Київ, просп. Володимира Івасюка, 46\n"),
    "the city and the street were not joined",
  );
  assert.ok(text.includes("address: вул. Гагаріна, 1\n"), "a store with no city lost its street");
  assert.ok(text.includes("address: Львів\n"), "a store with no street lost its city");
  assert.ok(!text.includes("city:"), "the city kept a key of its own");
  assert.ok(
    !text.includes(DELETE_FILIA),
    "a store carrying neither a city nor a street address was still printed",
  );
});

test("only the pickup and Nova Poshta filters reach the server, at the CLI's own page size", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });
  clearToolCalls();

  await output(["stores", "--pickup", "--np", "--limit", "3"]);

  assert.deepEqual(toolCalls()[0]?.arguments, {
    hasPickup: true,
    hasNP: true,
    limit: 500,
    offset: 0,
  });
});

test("--near, --offset, --from-distance and --to-distance fail as unknown options", async () => {
  assert.match(await fails(["stores", "--near", "Львів"]), /unknown option '--near'/);
  assert.match(await fails(["stores", "--offset", "1"]), /unknown option '--offset'/);
  assert.match(await fails(["stores", "--from-distance", "1"]), /unknown option '--from-distance'/);
  assert.match(await fails(["stores", "--to-distance", "1"]), /unknown option '--to-distance'/);
});

test("--limit prints fewer than asked when fewer qualify", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("a", "49.83", "24.02", { address: "вул. Бережанська, 1" }),
      branchAt("b", "49.84", "24.03", { address: "вул. Бережанська, 2" }),
      ...decoyBranches(4),
    ]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocodedStreet("Бережанська"),
  });

  const text = await run(["stores", "Бережанська", "--limit", "5"]);

  assert.match(text, /Found 2 stores \(total: 2\)/);
  assert.equal(text.trimEnd().split("\n\n").length, 4, "the resolved place, the summary and both stores were not all printed");
});

test("a query matching several stores prints them ordered and succeeds", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("a", "49.83", "24.02", { address: "вул. Бережанська, 1" }),
      branchAt("b", "49.84", "24.03", { address: "вул. Бережанська, 2" }),
      ...decoyBranches(4),
    ]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocodedStreet("Бережанська"),
  });

  const { text, code } = await output(["stores", "Бережанська"]);

  assert.equal(code, 0, text);
  assert.match(text, /Found 2 stores \(total: 2\)/);
  assert.equal(text.trimEnd().split("\n\n").length, 4, "the resolved place, the summary and both stores were not all printed");
  assert.ok(!text.includes("Found 2 matching places"), "the CLI stopped instead of ordering");

  const paragraphs = text.trimEnd().split("\n\n").slice(2);
  const [first, second] = paragraphs;

  assert.ok(first !== undefined && second !== undefined, text);
  assert.notEqual(first, second, "two tied stores printed the exact same record");

  const firstReason = first.split("\n").at(-1) ?? "";
  const secondReason = second.split("\n").at(-1) ?? "";

  assert.match(firstReason, /^matched street, score \d+\.\d\d$/, "the top tied store lost its plain reason");
  assert.match(
    secondReason,
    /^tied with the store above on score \d+\.\d\d \(matched street\); order settled by branch id$/,
    "the tied store below did not say what actually separated the two",
  );
});

test("a query matching several stores where one has a receipt says the tie was settled by receipts", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("a", "49.83", "24.02", { address: "вул. Бережанська, 1", externalId: "301" }),
      branchAt("b", "49.84", "24.03", { address: "вул. Бережанська, 2", externalId: "302" }),
      ...decoyBranches(4),
    ]),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: "302" }]),
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocodedStreet("Бережанська"),
  });

  const { text, code } = await output(["stores", "Бережанська"]);

  assert.equal(code, 0, text);

  const paragraphs = text.trimEnd().split("\n\n").slice(2);
  const [first, second] = paragraphs;

  assert.ok(first !== undefined && second !== undefined, text);
  assert.match(
    first.split("\n").at(-1) ?? "",
    /^1 receipt, last .*; matched street, score \d+\.\d\d$/,
    "the receipted store did not lead with its receipt",
  );
  assert.match(
    second.split("\n").at(-1) ?? "",
    /^tied with the store above on score \d+\.\d\d \(matched street\); order settled by receipt count$/,
    "the tied store below blamed branch id when receipts actually settled the order",
  );
});

test("a query the listing matches does not fetch the caller's saved delivery addresses, since nothing on that path needs them", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("a", "49.83", "24.02", { address: "вул. Бережанська, 1", externalId: "301" }),
      ...decoyBranches(4),
    ]),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: "301" }]),
    [FIND_ADDRESS_TOOL]: geocodedStreet("Бережанська"),
  });
  clearToolCalls();

  const { code } = await output(["stores", "Бережанська"]);

  assert.equal(code, 0);
  assert.ok(
    !toolCalls().some((call) => call.name === DELIVERY_ADDRESSES_TOOL),
    "the saved-address call was issued despite the query already matching the listing",
  );
});

test("a query matching exactly one store prints that store alone", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("a", "49.8397", "24.0297", { address: "вул. Гагаріна, 1" }),
      branchAt("far", "50.55", "30.55", { address: "вул. Хрещатик, 1" }),
    ]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocodedStreet("Гагаріна"),
  });

  const text = await run(["stores", "Гагаріна"]);

  assert.match(text, /Found 1 stores \(total: 1\)/);
  assert.equal(text.trimEnd().split("\n\n").length, 3, "the resolved place, the summary and the store were not all printed");
});

test("a store handle the listing does not hold fails naming it", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  assert.match(
    await fails(["stores", "0d000000-0000-0000-0000-000000000000"]),
    /no store named "0d000000-0000-0000-0000-000000000000"/,
  );
  assert.match(await fails(["stores", "424242"]), /no store named "424242"/);
});

test("an unknown handle names how many receipts joined nothing, same as a query that matched nothing", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: 5831 }]),
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const message = await fails(["stores", "0d000000-0000-0000-0000-000000000000"]);

  assert.match(message, /no store named "0d000000-0000-0000-0000-000000000000"/);
  assert.match(message, /1 receipt named a store the listing has no code for/);
});

test("a query matching nothing names how many receipts joined nothing", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: 5831 }]),
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocoded([]),
  });

  const message = await fails(["stores", "Кирилівськ"]);

  assert.match(message, /no store or place matched "Кирилівськ"/);
  assert.match(message, /1 receipt named a store the listing has no code for/);
});

test("a handle a filter could have excluded says so, not just that it is unknown", async () => {
  const withPickup = branchAt("wp", "50.0", "30.0", { externalId: "500", hasPickup: true });
  const withoutPickup = branchAt("np", "50.1", "30.1", { externalId: "600", hasPickup: false });

  setPayloads({
    [LIST_BRANCHES_TOOL]: (args: Record<string, unknown>) => {
      const all = [withPickup, withoutPickup];
      const hasPickup = args.hasPickup as boolean | undefined;
      const filtered = hasPickup === undefined ? all : all.filter((branch) => branch.hasPickup === hasPickup);

      return branchesPayload(filtered);
    },
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const message = await fails(["stores", "600", "--pickup"]);

  assert.match(message, /no store named "600"/);
  assert.match(message, /--pickup may have excluded it/);
});

test("a query that resolves to nothing fails naming the query, not the account", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: "1998" }]),
    [DELIVERY_ADDRESSES_TOOL]: {
      success: true,
      summary: "Found 1 saved addresses",
      addresses: [savedAddress(50.52022, 30.51452)],
    },
    [FIND_ADDRESS_TOOL]: geocoded([]),
  });

  const message = await fails(["stores", "Кирилівськ"]);

  assert.match(message, /no store or place matched "Кирилівськ"/);
  assert.doesNotMatch(message, /nothing to rank stores by/);
});

test("an account with nothing to rank by says so and names what would give it one", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const message = await fails(["stores"]);

  assert.match(message, /nothing to rank stores by/);
  assert.match(message, /receipt|saved delivery address/);
});

test("a candidate the lookup ranked first is dropped when it matches no store, while a later candidate answers", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("a", "50.40", "30.50", { city: "Київ", address: "вул. Хрещатик, 2" }),
    ]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocoded([
      {
        address: null,
        city: "Сумська область",
        street: "Хрещатик",
        houseNumber: null,
        district: null,
        latitude: 50.9,
        longitude: 34.8,
      },
      { address: null, city: "Київ", street: "Хрещатик", houseNumber: "2", district: null, latitude: 50.4, longitude: 30.5 },
    ]),
  });

  const { text, code } = await output(["stores", "Хрещатик"]);

  assert.equal(code, 0, text);
  assert.doesNotMatch(text, /Сумська область/, "the non-matching first candidate was named as a place the answer came from");
  assert.match(text, /address: Київ, Хрещатик, буд\. 2/, "the second candidate, which actually matched, was not named");
  assert.match(text, /Хрещатик, 2/, "the matching store did not answer");
});

test("the geocoded place is printed with the answer, its parts and coordinates under one key", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([branchAt("a", "49.8397", "24.0297")]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocoded([
      { address: null, city: "Львів", street: null, houseNumber: null, district: null, latitude: 49.84, longitude: 24.03 },
    ]),
  });

  const text = await run(["stores", "Львів", "--radius", "20"]);

  assert.ok(
    text.startsWith("address: Львів\ncoordinates: 49.84, 24.03\n\n"),
    text,
  );
  assert.doesNotMatch(text, /confidence:/, "a confidence line survived deletion");
  assert.match(text, /km from Львів \(49\.84, 24\.03\)/, "the distance line did not name the resolved place");
});

test("a matched address corroborated by the map is not marked as the less certain kind, unlike a resolved place", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("a", "48.4647", "35.0462", { city: "Київ", address: "вул. Кирилівська, 47А", externalId: "5831" }),
      ...decoyBranches(4),
    ]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocoded([
      {
        address: null,
        city: "Київ",
        street: "вулиця Кирилівська",
        houseNumber: "47",
        district: null,
        latitude: 48.4648,
        longitude: 35.0463,
      },
    ]),
  });

  const text = await run(["stores", "вулиця Кирилівська"]);

  assert.doesNotMatch(text, /confidence: less certain/, "a matched address was marked as the less certain kind");
});

test("a candidate whose street matched no store is answered by its settlement, naming the place the answer rests on", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("kh", "49.9950", "36.2350", { city: "Харків", address: "вул. Басейна, 6" }),
      ...decoyBranches(2),
    ]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocoded([
      {
        address: null,
        city: "Харків",
        street: "Сумська вулиця",
        houseNumber: null,
        district: null,
        latitude: 49.9935,
        longitude: 36.2304,
      },
    ]),
  });

  const { text, code } = await output(["stores", "Харків Сумська"]);

  assert.equal(code, 0, text);

  const [resolved, , storeParagraph] = text.trimEnd().split("\n\n");

  assert.ok(resolved?.startsWith("address: Харків, Сумська вулиця\n"), text);
  assert.match(
    storeParagraph ?? "",
    /the answer rests on the candidate's settlement, its street having matched no store/,
    "the record did not say the answer rests on the candidate's settlement",
  );
  assert.match(
    storeParagraph ?? "",
    /km from Харків, Сумська вулиця \(49\.9935, 36\.2304\)/,
    "the record did not name the place the answer rests on",
  );
});

test("several candidates that each produced stores are all named in the answer, distinguishable by how they answered", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([
      branchAt("kh2", "49.9950", "36.2350", { city: "Харків", address: "вул. Басейна, 6" }),
      branchAt("dn", "48.4647", "35.0462", { city: "Дніпро", address: "вул. Столична, 5" }),
      ...decoyBranches(2),
    ]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocoded([
      {
        address: null,
        city: "Харків",
        street: "Сумська вулиця",
        houseNumber: null,
        district: null,
        latitude: 49.9935,
        longitude: 36.2304,
      },
      {
        address: null,
        city: "Дніпро",
        street: "Столична",
        houseNumber: "5",
        district: null,
        latitude: 48.4647,
        longitude: 35.0462,
      },
    ]),
  });

  const { text, code } = await output(["stores", "Харків Сумська"]);

  assert.equal(code, 0, text);
  assert.match(text, /Resolved to 2 places/, "the answer did not say how many places it came from");
  assert.match(text, /address: Харків, Сумська вулиця/, "the Харків candidate was not named");
  assert.match(text, /address: Дніпро, Столична, буд\. 5/, "the Дніпро candidate was not named");
  assert.match(text, /вул\. Басейна, 6/, "the settlement-answered store was not printed");
  assert.match(text, /вул\. Столична, 5/, "the street-matched store was not printed");
  assert.match(
    text,
    /the answer rests on the candidate's settlement, its street having matched no store/,
    "the settlement-answered store did not say so",
  );
  assert.match(text, /matched settlement, street, building, score/, "the street-matched store lost its match reason");
});

test("the distance line names the coordinate pair the caller typed, unadorned", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([branchAt("a", "49.8397", "24.0297")]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [DELIVERY_TYPES_TOOL]: deliveryTypes([]),
  });

  const text = await run(["stores", "49.84,24.03", "--radius", "20"]);

  assert.match(text, /km from 49\.84, 24\.03\n/);
  assert.doesNotMatch(text, /km from .*\(49\.84, 24\.03\)/, "a bare pair grew a name it does not have");
});

test("a non-coordinate query does not call the delivery-types tool", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [FIND_ADDRESS_TOOL]: geocoded([]),
  });
  clearToolCalls();

  await output(["stores", "Кирилівськ"]);

  assert.ok(!toolCalls().some((call) => call.name === DELIVERY_TYPES_TOOL));
});

test("a coordinate query names the branches serving that point beside the ranked page, not inside it", async () => {
  const near = branchAt("near", "50.4502", "30.5236", { address: "вул. Хрещатик, 2", externalId: "9600" });
  const servingOnly = branchAt("serving", "49.0000", "30.0000", { address: "вул. Басейна, 6", externalId: "9601" });

  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([near, servingOnly]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [DELIVERY_TYPES_TOOL]: deliveryTypes([
      { deliveryType: "DeliveryHome", branchId: servingOnly.branchId as string },
      { deliveryType: "SelfPickup", branchId: null },
    ]),
  });
  clearToolCalls();

  const text = await run(["stores", "50.4501,30.5234"]);

  assert.equal(toolCalls().filter((call) => call.name === DELIVERY_TYPES_TOOL).length, 1);
  assert.equal(text.split("\n")[0], "Found 1 stores (total: 1)");

  const [storesBlock, deliveryBlock] = text.trimEnd().split("\n\nDelivery types serving this point\n");

  assert.ok(deliveryBlock !== undefined, text);
  assert.ok(!storesBlock!.includes(servingOnly.branchId as string), "the serving branch was printed among the ranked stores");
  assert.match(deliveryBlock!, /DeliveryHome: .*Басейна, 6/);
  assert.match(deliveryBlock!, /SelfPickup: unserved/);
});

test("a serving branch further from the point than another store does not move in the ordering", async () => {
  const near = branchAt("near2", "50.4502", "30.5236", { address: "вул. Хрещатик, 2", externalId: "9700" });
  const farServing = branchAt("far2", "50.5500", "30.6000", { address: "вул. Басейна, 6", externalId: "9701" });

  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([near, farServing]),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [DELIVERY_TYPES_TOOL]: deliveryTypes([{ deliveryType: "DeliveryHome", branchId: farServing.branchId as string }]),
  });

  const text = await run(["stores", "50.4501,30.5234"]);

  const paragraphs = text.trimEnd().split("\n\n");
  const nearIndex = paragraphs.findIndex((block) => block.includes("Хрещатик, 2"));
  const farIndex = paragraphs.findIndex((block) => block.includes("id: ") && block.includes("Басейна, 6"));

  assert.ok(nearIndex >= 0 && farIndex >= 0, text);
  assert.ok(nearIndex < farIndex, "the serving branch moved ahead of the nearer store");
  assert.match(text, /Delivery types serving this point\nDeliveryHome: .*Басейна, 6/);
});

test("a serving branch the caller's own --pickup filter excluded is named by its own id, not printed as unserved", async () => {
  const near = branchAt("near3", "50.4502", "30.5236", {
    address: "вул. Хрещатик, 2",
    externalId: "9800",
    hasPickup: true,
  });
  const servingNoPickup = branchAt("serving-no-pickup", "50.4400", "30.5100", {
    address: "вул. Басейна, 6",
    externalId: "9801",
    hasPickup: false,
  });
  const branches = [near, servingNoPickup];

  setPayloads({
    [LIST_BRANCHES_TOOL]: (args: Record<string, unknown>) => {
      const hasPickup = args.hasPickup as boolean | undefined;
      const filtered =
        hasPickup === undefined ? branches : branches.filter((branch) => branch.hasPickup === hasPickup);

      return branchesPayload(filtered);
    },
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
    [DELIVERY_TYPES_TOOL]: deliveryTypes([
      { deliveryType: "WideAssortDelivery", branchId: servingNoPickup.branchId as string },
    ]),
  });
  clearToolCalls();

  const text = await run(["stores", "50.4501,30.5234", "--pickup"]);

  assert.doesNotMatch(text, /WideAssortDelivery: unserved/, "the filtered-out serving branch was reported as unserved");
  assert.match(
    text,
    new RegExp(`WideAssortDelivery: ${servingNoPickup.branchId as string} \\(--pickup may have excluded it\\)`),
  );
  assert.equal(
    toolCalls().filter((call) => call.name === LIST_BRANCHES_TOOL).length,
    1,
    "the whole store listing was read more than once for this command",
  );
});

test("receipts named a store the listing has no code for say how many did not join", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload([branchAt("a", "49.8397", "24.0297")]),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: "no-such-code" }]),
    [DELIVERY_ADDRESSES_TOOL]: { success: true, summary: "Found 1 saved addresses", addresses: [savedAddress(49.8397, 24.0297)] },
  });

  const text = await run(["stores"]);

  assert.match(text.split("\n")[0] ?? "", /1 receipt named a store the listing has no code for/);
});

test("a receipt from a store the filter excluded is not blamed as absent from the listing", async () => {
  const withPickup = branchAt("wp", "50.0", "30.0", { externalId: "500", hasPickup: true });
  const withoutPickup = branchAt("np", "50.1", "30.1", { externalId: "600", hasPickup: false });

  setPayloads({
    [LIST_BRANCHES_TOOL]: (args: Record<string, unknown>) => {
      const all = [withPickup, withoutPickup];
      const hasPickup = args.hasPickup as boolean | undefined;
      const filtered = hasPickup === undefined ? all : all.filter((branch) => branch.hasPickup === hasPickup);

      return branchesPayload(filtered);
    },
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: "500" }, { filId: "600" }]),
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const text = await run(["stores", "--pickup"]);
  const firstLine = text.split("\n")[0] ?? "";

  assert.match(firstLine, /--pickup may have excluded, or the listing has no code for/);
  assert.doesNotMatch(firstLine, /1 receipt named a store the listing has no code for\)/);
});

test("a filter excluding every store still surfaces the caller's receipt count", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: (args: Record<string, unknown>) =>
      branchesPayload(args.hasPickup === true ? [] : [branchAt("a", "50.0", "30.0", { externalId: "700" })]),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: "700" }]),
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const message = await fails(["stores", "--pickup"]);

  assert.match(message, /nothing to rank stores by/);
  assert.match(message, /1 receipt named a store --pickup may have excluded, or the listing has no code for/);
  assert.doesNotMatch(message, /no receipts and no saved delivery addresses/);
  assert.match(message, /--pickup left nothing that qualifies/);
});

test("a filter that excludes every store for a caller with receipts and saved addresses names the filter, not an empty account", async () => {
  const home = savedAddress(50.4501, 30.5234);

  setPayloads({
    [LIST_BRANCHES_TOOL]: (args: Record<string, unknown>) =>
      branchesPayload(args.hasNP === true ? [] : [branchAt("a", "50.0", "30.0", { externalId: "9700" })]),
    [OFFLINE_ORDERS_TOOL]: offlineOrders(
      Array.from({ length: 5 }, () => ({ filId: "9700" })),
    ),
    [DELIVERY_ADDRESSES_TOOL]: { success: true, summary: "Found 1 saved addresses", addresses: [home] },
  });

  const message = await fails(["stores", "--np"]);

  assert.match(message, /nothing to rank stores by/);
  assert.doesNotMatch(message, /no receipts and no saved delivery addresses/);
  assert.match(message, /5 receipts and saved delivery addresses/);
  assert.match(message, /--np left nothing that qualifies/);
});

test("the receipt read's arguments carry no branch, delivery type or timeslot", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: EMPTY_ORDERS,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });
  clearToolCalls();

  await output(["stores"]);

  const offlineOrdersCall = toolCalls().find((call) => call.name === OFFLINE_ORDERS_TOOL);

  assert.deepEqual(offlineOrdersCall?.arguments, {
    branchId: "",
    deliveryType: "",
    timeslotStart: "",
    timeslotEnd: "",
    limit: 10,
    offset: 0,
  });
});

test("the receipt count does not follow which branch the receipt read was requested against", async () => {
  const withA = [branchAt("a", null, null, { externalId: "111" }), branchAt("b", null, null, { externalId: "222" })];
  const withB = [branchAt("b", null, null, { externalId: "222" }), branchAt("a", null, null, { externalId: "111" })];

  const echoingOrders = (args: Record<string, unknown>) =>
    offlineOrders([{ filId: "111", branchId: args.branchId as string }]);

  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload(withA),
    [OFFLINE_ORDERS_TOOL]: echoingOrders,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const firstRun = await run(["stores"]);

  setPayloads({
    [LIST_BRANCHES_TOOL]: branchesPayload(withB),
    [OFFLINE_ORDERS_TOOL]: echoingOrders,
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const secondRun = await run(["stores"]);

  assert.equal(firstRun, secondRun);
  assert.match(firstRun, /1 receipt, last/);
});

test("receipts that join no store and no saved address say so, not that the account has nothing", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: 5831 }]),
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const message = await fails(["stores"]);

  assert.match(message, /nothing to rank stores by/);
  assert.match(message, /1 receipt named a store the listing has no code for/);
  assert.doesNotMatch(message, /no receipts and no saved delivery addresses/);
});

test("no stores command prints whether the call succeeded", async () => {
  setPayloads({
    [LIST_BRANCHES_TOOL]: fixture("branches.branches"),
    [OFFLINE_ORDERS_TOOL]: offlineOrders([{ filId: "1998" }]),
    [DELIVERY_ADDRESSES_TOOL]: EMPTY_ADDRESSES,
  });

  const text = await run(["stores"]);

  assert.ok(!text.includes("success"));
});

test("the command's own description says the lookup places the query and drops the two-readings disagreement", async () => {
  const help = (await run(["stores", "--help"])).replace(/\s+/g, " ");

  assert.match(help, /placed by the address lookup before anything is matched/);
  assert.match(help, /names each place that produced stores/);
  assert.match(help, /there is one reading, so none is marked less certain than another/);
  assert.doesNotMatch(help, /disagree/);
});
