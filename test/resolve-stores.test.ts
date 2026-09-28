import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const {
  matchSavedAddresses,
  matchStores,
  matchStoresByRelevance,
  listStores,
  resolveAddress,
  looksLikeUuid,
  resolveDestination,
  rankStores,
  coordinatesOf,
  addressCandidateText,
  placeCandidatesText,
  buildHandleIndex,
} = await import("../dist/resolve/stores.js");

function savedAddress(overrides: Record<string, unknown> = {}) {
  return {
    id: "addr-1",
    tag: null,
    city: "Київ",
    street: "Хрещатик",
    building: "1",
    apartment: null,
    floor: null,
    entrance: null,
    latitude: 50.45,
    longitude: 30.52,
    comment: null,
    ...overrides,
  };
}

function branch(overrides: Record<string, unknown> = {}) {
  return {
    branchId: "b-1",
    companyId: "c-1",
    externalId: null,
    city: "Київ",
    address: "просп. Володимира Івасюка, 46",
    latitude: "50.52022",
    longitude: "30.51452",
    hasPickup: true,
    open: true,
    ...overrides,
  };
}

function decoyBranches(count: number) {
  return Array.from({ length: count }, (_, index) =>
    branch({
      branchId: `decoy-${index}`,
      externalId: `9${index}00`,
      city: "Тернопіль",
      address: `вул. Замкова, ${index + 1}`,
      latitude: "49.5535",
      longitude: "25.5948",
    }),
  );
}

function foundAddress(overrides: Record<string, unknown> = {}) {
  return {
    address: null,
    city: "Київ",
    street: "вулиця Хрещатик",
    houseNumber: "30/1",
    district: "Центр",
    latitude: 50.447471,
    longitude: 30.521506,
    ...overrides,
  };
}

function offlineOrder(overrides: Record<string, unknown> = {}) {
  return {
    filId: 5831,
    filialName: "Київ",
    cityName: "Київ",
    createdAt: "2026-01-01T00:00:00+00:00",
    sumReg: 100,
    accruedBalaBonusesSum: 0,
    sumDiscount: 0,
    receiptUrl: null,
    chequeMagicName: null,
    chequePrediction: null,
    rewards: [],
    products: [],
    ...overrides,
  };
}

function offlineOrdersPage(orders: readonly Record<string, unknown>[], args: Record<string, unknown>) {
  const offset = Number(args.offset ?? 0);
  const limit = Number(args.limit ?? 10);
  const page = orders.slice(offset, offset + limit);

  return {
    content: "",
    structured: {
      success: true,
      summary: "",
      orders: page,
      meta: { limit, offset, total: orders.length },
    },
  };
}

function rankClient(options: {
  branches?: unknown[];
  saved?: unknown[];
  orders?: readonly Record<string, unknown>[];
  addresses?: unknown[];
  findAddress?: (args: Record<string, unknown>) => unknown[];
  deliveryTypes?: unknown[];
} = {}) {
  const calls: string[] = [];

  return {
    calls,
    async getAvailableDeliveryTypes() {
      calls.push("delivery-types");

      return { content: "", structured: { success: true, summary: "", options: options.deliveryTypes ?? [] } };
    },
    async listBranches(args: Record<string, unknown>) {
      calls.push("branches");

      const all = (options.branches ?? []) as Array<Record<string, unknown>>;
      const hasPickup = args.hasPickup as boolean | undefined;
      const filtered =
        hasPickup === undefined ? all : all.filter((branch) => branch.hasPickup === hasPickup);

      return {
        content: "",
        structured: {
          success: true,
          summary: "",
          branches: filtered,
          meta: { limit: 500, offset: 0, total: filtered.length },
        },
      };
    },
    async getMyDeliveryAddresses() {
      calls.push("saved");

      return { content: "", structured: { success: true, summary: "", addresses: options.saved ?? [] } };
    },
    async getMyOfflineOrders(args: Record<string, unknown>) {
      calls.push("orders");

      return offlineOrdersPage(options.orders ?? [], args);
    },
    async findAddress(args: Record<string, unknown>) {
      calls.push("address");

      const addresses = options.findAddress ? options.findAddress(args) : (options.addresses ?? []);

      return {
        content: "",
        structured: { success: true, summary: "Found addresses", addresses },
      };
    },
  };
}

test("matches a saved address by its tag, case-insensitively", () => {
  const home = savedAddress({ tag: "Дім" });

  assert.deepEqual(matchSavedAddresses("дім", [home]), [home]);
  assert.deepEqual(matchSavedAddresses("робота", [home]), []);
});

test("matches a saved address by the text of the address itself", () => {
  const address = savedAddress({ tag: null, street: "Хрещатик" });

  assert.deepEqual(matchSavedAddresses("хрещатик", [address]), [address]);
});

test("a saved address without coordinates is never a candidate", () => {
  const address = savedAddress({ tag: "Дім", latitude: null, longitude: null });

  assert.deepEqual(matchSavedAddresses("дім", [address]), []);
});

test("empty text matches nothing rather than everything", () => {
  assert.deepEqual(matchSavedAddresses("   ", [savedAddress({ tag: "Дім" })]), []);
});

test("matches a store by its city and street", () => {
  const store = branch({ city: "Львів", address: "вул. Гагаріна, 1" });

  assert.deepEqual(matchStores("гагаріна", [store]), [store]);
  assert.deepEqual(matchStores("хрещатик", [store]), []);
});

test("a store without coordinates is still a candidate for a plain name query", () => {
  const store = branch({ latitude: null, longitude: null });

  assert.deepEqual(matchStores("Володимира Івасюка", [store]), [store]);
});

function branchesPage(branches: readonly Record<string, unknown>[]) {
  return {
    async listBranches() {
      return {
        content: "",
        structured: { branches, meta: { limit: 500, offset: 0, total: branches.length } },
      };
    },
  };
}

test("listStores drops a record carrying neither a settlement nor a street address", async () => {
  const usable = branch({ branchId: "usable" });
  const placeless = branch({ branchId: "placeless", city: null, address: null });
  const client = branchesPage([usable, placeless]);

  const { branches } = await listStores(client as never);

  assert.deepEqual(branches.map((entry: { branchId: string }) => entry.branchId), [usable.branchId]);
});

test("listStores drops a record whose coordinates fall outside the estate's bounding box", async () => {
  const usable = branch({ branchId: "usable" });
  const outOfBounds = branch({
    branchId: "moldova",
    city: "Київ",
    address: "вул. Волл Стріт, 11",
    latitude: "40.70714",
    longitude: "74.01086",
  });
  const client = branchesPage([usable, outOfBounds]);

  const { branches } = await listStores(client as never);

  assert.deepEqual(branches.map((entry: { branchId: string }) => entry.branchId), [usable.branchId]);
});

test("listStores keeps a record that reports itself closed", async () => {
  const closedStore = branch({ branchId: "closed-store", open: false });
  const client = branchesPage([closedStore]);

  const { branches } = await listStores(client as never);

  assert.deepEqual(branches.map((entry: { branchId: string }) => entry.branchId), [closedStore.branchId]);
});

test("resolveAddress resolves a single geocoded candidate", async () => {
  const client = {
    async findAddress() {
      return {
        content: "",
        structured: { success: true, summary: "Found 1 addresses", addresses: [foundAddress()] },
      };
    },
  };

  const resolution = await resolveAddress(client as never, "Хрещатик 1");

  assert.equal(resolution.outcome, "resolved");
  assert.deepEqual((resolution as { address: unknown }).address, foundAddress());
});

test("resolveAddress stops and carries every candidate when more than one is plausible", async () => {
  const candidates = [foundAddress({ houseNumber: "1" }), foundAddress({ houseNumber: "2" })];
  const client = {
    async findAddress() {
      return { content: "", structured: { success: true, summary: "Found 2 addresses", addresses: candidates } };
    },
  };

  const resolution = await resolveAddress(client as never, "Хрещатик");

  assert.equal(resolution.outcome, "ambiguous");
  assert.deepEqual((resolution as { candidates: unknown }).candidates, candidates);
});

test("resolveAddress reports none rather than inventing a candidate", async () => {
  const client = {
    async findAddress() {
      return { content: "", structured: { success: true, summary: "Found 0 addresses", addresses: [] } };
    },
  };

  assert.deepEqual(await resolveAddress(client as never, "нікуди"), { outcome: "none" });
});

test("a candidate whose own address matches the query verbatim is taken without asking", async () => {
  const shorter = foundAddress({ houseNumber: null, street: "проспект Олександра Поля" });
  const longer = foundAddress({ houseNumber: "84", street: "проспект Олександра Поля" });
  const client = {
    async findAddress() {
      return {
        content: "",
        structured: { success: true, summary: "Found 2 addresses", addresses: [shorter, longer] },
      };
    },
  };

  const resolution = await resolveAddress(client as never, "Київ, проспект Олександра Поля, буд. 84");

  assert.deepEqual(resolution, { outcome: "resolved", address: longer });
});

test("the exact match is read case-insensitively with whitespace normalised, against the server's own string", async () => {
  const candidate = foundAddress({ address: "Київ,   вулиця  Хрещатик, 22" });
  const other = foundAddress({ address: "Київ, вулиця Хрещатик, 23" });
  const client = {
    async findAddress() {
      return {
        content: "",
        structured: { success: true, summary: "Found 2 addresses", addresses: [candidate, other] },
      };
    },
  };

  const resolution = await resolveAddress(client as never, "  київ, вулиця хрещатик, 22  ");

  assert.deepEqual(resolution, { outcome: "resolved", address: candidate });
});

test("the server drops the building-number prefix the caller typed, and the match still fires", async () => {
  const shorter = foundAddress({
    address: "Дніпро, проспект Олександра Поля",
    street: "проспект Олександра Поля",
    houseNumber: null,
  });
  const longer = foundAddress({
    address: "Дніпро, проспект Олександра Поля, 84",
    street: "проспект Олександра Поля",
    houseNumber: "84",
  });
  const client = {
    async findAddress() {
      return {
        content: "",
        structured: { success: true, summary: "Found 2 addresses", addresses: [shorter, longer] },
      };
    },
  };

  const resolution = await resolveAddress(client as never, "Дніпро, проспект Олександра Поля, буд. 84");

  assert.deepEqual(resolution, { outcome: "resolved", address: longer });
});

test("the server spells out a street-type word the caller abbreviated, and the match still fires", async () => {
  const target = foundAddress({
    address: "Дніпро, вулиця Незалежності, 36",
    street: "вулиця Незалежності",
    houseNumber: "36",
  });
  const other = foundAddress({
    address: "Дніпро, вулиця Незалежності, 37",
    street: "вулиця Незалежності",
    houseNumber: "37",
  });
  const client = {
    async findAddress() {
      return {
        content: "",
        structured: { success: true, summary: "Found 2 addresses", addresses: [target, other] },
      };
    },
  };

  const resolution = await resolveAddress(client as never, "Дніпро, вул. Незалежності, 36");

  assert.deepEqual(resolution, { outcome: "resolved", address: target });
});

test("two candidates both matching the query verbatim still stop and print", async () => {
  const first = foundAddress({ address: "Київ, вулиця Хрещатик, 22" });
  const second = foundAddress({ address: "Київ, вулиця Хрещатик, 22", latitude: 50.5 });
  const client = {
    async findAddress() {
      return {
        content: "",
        structured: { success: true, summary: "Found 2 addresses", addresses: [first, second] },
      };
    },
  };

  const resolution = await resolveAddress(client as never, "Київ, вулиця Хрещатик, 22");

  assert.equal(resolution.outcome, "ambiguous");
});

function destinationClient(options: {
  saved?: unknown[];
  branches?: unknown[];
  addresses?: unknown[];
} = {}) {
  const calls: string[] = [];

  return {
    calls,
    async getMyDeliveryAddresses() {
      calls.push("saved");

      return { content: "", structured: { success: true, summary: "", addresses: options.saved ?? [] } };
    },
    async listBranches() {
      calls.push("branches");

      return {
        content: "",
        structured: {
          success: true,
          summary: "",
          branches: options.branches ?? [],
          meta: { limit: 500, offset: 0, total: (options.branches ?? []).length },
        },
      };
    },
    async findAddress() {
      calls.push("address");

      return {
        content: "",
        structured: { success: true, summary: "Found addresses", addresses: options.addresses ?? [] },
      };
    },
  };
}

test("a saved address resolves the destination without reading stores or geocoding", async () => {
  const home = savedAddress({ tag: "Дім" });
  const client = destinationClient({ saved: [home] });

  const resolution = await resolveDestination(client as never, "дім");

  assert.deepEqual(resolution, { outcome: "resolved", candidate: { kind: "saved", address: home } });
  assert.deepEqual(client.calls, ["saved"]);
});

test("two saved addresses stop the resolution rather than picking the first", async () => {
  const first = savedAddress({ id: "a", tag: "Дім" });
  const second = savedAddress({ id: "b", tag: "Дім друга" });
  const client = destinationClient({ saved: [first, second] });

  const resolution = await resolveDestination(client as never, "дім");

  assert.equal(resolution.outcome, "ambiguous");
  assert.deepEqual(
    (resolution as { candidates: { address: { id: string } }[] }).candidates.map((c) => c.address.id),
    ["a", "b"],
  );
  assert.deepEqual(client.calls, ["saved"]);
});

test("of two matching saved addresses, the one whose own address matches verbatim is taken", async () => {
  const shorter = savedAddress({ id: "a", tag: null, street: "Хрещатик", building: "1" });
  const longer = savedAddress({ id: "b", tag: null, street: "Хрещатик", building: "1а" });
  const client = destinationClient({ saved: [shorter, longer] });

  const resolution = await resolveDestination(client as never, "Київ, Хрещатик, буд. 1");

  assert.deepEqual(resolution, { outcome: "resolved", candidate: { kind: "saved", address: shorter } });
});

test("with no saved match the destination falls through to a store by name", async () => {
  const store = branch({ branchId: "store-1", address: "вул. Гагаріна, 1" });
  const client = destinationClient({ branches: [store] });

  const resolution = await resolveDestination(client as never, "Гагаріна");

  assert.deepEqual(resolution, { outcome: "resolved", candidate: { kind: "store", branch: store } });
  assert.deepEqual(client.calls, ["saved", "branches"]);
});

test("two stores of the same name stop the resolution, and no geocoding is attempted", async () => {
  const first = branch({ branchId: "s1" });
  const second = branch({ branchId: "s2" });
  const client = destinationClient({ branches: [first, second] });

  const resolution = await resolveDestination(client as never, "Володимира Івасюка");

  assert.equal(resolution.outcome, "ambiguous");
  assert.deepEqual(client.calls, ["saved", "branches"]);
});

test("of two matching stores, the one whose own address matches verbatim is taken", async () => {
  const shorter = branch({ branchId: "s1", address: "вул. Гагаріна, 1" });
  const longer = branch({ branchId: "s2", address: "вул. Гагаріна, 1а" });
  const client = destinationClient({ branches: [shorter, longer] });

  const resolution = await resolveDestination(client as never, "Київ, вул. Гагаріна, 1");

  assert.deepEqual(resolution, { outcome: "resolved", candidate: { kind: "store", branch: shorter } });
});

test("with no saved or store match the destination falls through to geocoding", async () => {
  const found = foundAddress();
  const client = destinationClient({ addresses: [found] });

  const resolution = await resolveDestination(client as never, "Хрещатик 1");

  assert.deepEqual(resolution, { outcome: "resolved", candidate: { kind: "address", address: found } });
  assert.deepEqual(client.calls, ["saved", "branches", "address"]);
});

test("nothing matching anywhere resolves to none", async () => {
  const client = destinationClient({});

  assert.deepEqual(await resolveDestination(client as never, "нікуди"), { outcome: "none" });
});

test("coordinatesOf reads the pair out of whichever kind resolved", () => {
  assert.deepEqual(coordinatesOf({ kind: "saved", address: savedAddress() }), {
    latitude: 50.45,
    longitude: 30.52,
  });
  assert.deepEqual(coordinatesOf({ kind: "store", branch: branch() }), {
    latitude: 50.52022,
    longitude: 30.51452,
  });
  assert.deepEqual(coordinatesOf({ kind: "address", address: foundAddress() }), {
    latitude: 50.447471,
    longitude: 30.521506,
  });
  assert.equal(
    coordinatesOf({ kind: "saved", address: savedAddress({ latitude: null, longitude: null }) }),
    null,
  );
});

test("an address candidate joins its parts and puts its coordinates on one line", () => {
  const text = addressCandidateText(foundAddress());

  assert.equal(
    text,
    "address: Київ, вулиця Хрещатик, буд. 30/1\ndistrict: Центр\ncoordinates: 50.447471, 30.521506",
  );
});

test("the address string the server issued is printed verbatim, not reformatted, so it can be answered back", () => {
  const found = foundAddress({ address: "Київ, вулиця Хрещатик, 30/1, Krendel" });
  const text = addressCandidateText(found);

  assert.ok(text.includes("address: Київ, вулиця Хрещатик, 30/1, Krendel\n"), text);
});

test("candidates of every kind carry an identifier and coordinates, not an invented pick", () => {
  const home = savedAddress({ tag: "Дім" });
  const store = branch({ branchId: "b-9" });
  const text = placeCandidatesText([
    { kind: "saved", address: home },
    { kind: "store", branch: store },
  ]);

  assert.ok(text.startsWith("Found 2 matching places\n\n"));
  assert.ok(text.includes("id: addr-1\ntag: Дім"));
  assert.ok(text.includes("id: b-9"));
});

test("two stores at the same address name the option that takes their id back", () => {
  const first = branch({ branchId: "s1", address: "вул. Незалежності, 36" });
  const second = branch({ branchId: "s2", address: "вул. Незалежності, 36", latitude: "48.43304" });
  const text = placeCandidatesText([
    { kind: "store", branch: first },
    { kind: "store", branch: second },
  ]);

  assert.ok(
    text.startsWith("Found 2 matching places\npass one of these ids back with cart setup --to\n\n"),
    text,
  );
  assert.ok(text.includes("id: s1"));
  assert.ok(text.includes("id: s2"));
});

test("a saved-address ambiguity carries no hint, since no option answers a saved address's id back", () => {
  const first = savedAddress({ id: "a", tag: "Дім" });
  const second = savedAddress({ id: "b", tag: "Дім друга" });
  const text = placeCandidatesText([
    { kind: "saved", address: first },
    { kind: "saved", address: second },
  ]);

  assert.equal(text.startsWith("Found 2 matching places\n\n"), true);
  assert.ok(!text.includes("--branch"), text);
});

const HETMANSKA_47A = branch({
  branchId: "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468",
  externalId: "5831",
  city: "Київ",
  address: "вул. Кирилівська, 47А",
  latitude: "48.4647",
  longitude: "35.0462",
});

const HETMANSKA_OTHER = branch({
  branchId: "1ec88c5d-a050-669c-8467-570a157f3e31",
  externalId: "3261",
  city: "Дніпро",
  address: "вул. Кирилівська, 12, корпус 2",
  latitude: "48.4700",
  longitude: "35.0500",
});

const LVIV_FRANKA = branch({
  branchId: "1eda8887-bf7c-6f38-b0cb-9503162b5586",
  externalId: "9001",
  city: "Львів",
  address: "вул. Франка, 5",
  latitude: "49.8397",
  longitude: "24.0297",
});

const KYIV_PEREMOHY = branch({
  branchId: "1eda888d-b60d-66f4-a557-03a302d993f3",
  externalId: "9002",
  city: "Київ",
  address: "просп. Перемоги, 10",
  latitude: "50.4501",
  longitude: "30.5234",
});

const HETMANSKA_CANDIDATES = [
  { label: "Кирилівська", city: null, street: "Кирилівська", houseNumber: null },
  { label: "Кирилівська 47", city: null, street: "Кирилівська", houseNumber: "47" },
  { label: "вулиця Кирилівська", city: null, street: "вулиця Кирилівська", houseNumber: null },
  { label: "Київ Кирилівська", city: "Київ", street: "Кирилівська", houseNumber: null },
];

for (const { label, ...candidate } of HETMANSKA_CANDIDATES) {
  test(`candidate parts for "${label}" rank the Кирилівська 47А store first, over a second store on the same street`, () => {
    const matches = matchStoresByRelevance(candidate, [HETMANSKA_47A, HETMANSKA_OTHER, LVIV_FRANKA, KYIV_PEREMOHY]);

    assert.ok(matches.length > 0, `no match at all for ${label}`);
    assert.equal(matches[0].branch.branchId, HETMANSKA_47A.branchId, `${label} did not rank 47А first`);
  });
}

test("a query naming only a word nearly every store's address carries matches nothing, rather than a third of the listing", () => {
  const matches = matchStoresByRelevance(
    { city: null, street: "вулиця", houseNumber: null },
    [HETMANSKA_47A, HETMANSKA_OTHER, LVIV_FRANKA, KYIV_PEREMOHY],
  );

  assert.deepEqual(matches, []);
});

test("a street that does not exist, named alongside a word nearly every address carries, still matches nothing", () => {
  const matches = matchStoresByRelevance(
    { city: null, street: "Марсіанська вулиця неіснуюча", houseNumber: null },
    [HETMANSKA_47A, HETMANSKA_OTHER, LVIV_FRANKA, KYIV_PEREMOHY],
  );

  assert.deepEqual(matches, []);
});

test("a word nearly every address carries still lets a store through once it also matched a word that discriminates", () => {
  const matches = matchStoresByRelevance(
    { city: null, street: "вулиця Кирилівська", houseNumber: null },
    [HETMANSKA_47A, HETMANSKA_OTHER, LVIV_FRANKA, KYIV_PEREMOHY],
  );

  assert.ok(matches.length > 0);
  assert.equal(matches[0].branch.branchId, HETMANSKA_47A.branchId);
  assert.ok(
    matches.every((match) => match.branch.branchId !== LVIV_FRANKA.branchId),
    "a store matching only the universal word slipped through",
  );
});

const KOVPAKA_STORE = branch({
  branchId: "b-kovpaka",
  externalId: "9700",
  city: "Київ",
  address: "вул. Ковпака, 20",
  latitude: "50.41",
  longitude: "30.50",
});

test("matchStoresByRelevance: a three-character street term reaches its store by prefix now that the length gate is gone", () => {
  const matches = matchStoresByRelevance(
    { city: null, street: "Ков", houseNumber: null },
    [KOVPAKA_STORE, LVIV_FRANKA, KYIV_PEREMOHY, ...decoyBranches(4)],
  );

  assert.ok(matches.length > 0, "no match at all for Ков");
  assert.equal(matches[0].branch.branchId, KOVPAKA_STORE.branchId);
});

test("matchStoresByRelevance: a near-universal word reached by a short prefix still answers nothing", () => {
  const matches = matchStoresByRelevance(
    { city: null, street: "Зам", houseNumber: null },
    [HETMANSKA_47A, LVIV_FRANKA, ...decoyBranches(6)],
  );

  assert.deepEqual(matches, []);
});

const KYIV_MYR_STORE = branch({
  branchId: "b-myr",
  externalId: "9800",
  city: "Київ",
  address: "вул. Мир, 5",
  latitude: "50.40",
  longitude: "30.40",
});

test("matchStoresByRelevance: a three-character term one edit away from a store's street does not reach it", () => {
  const matches = matchStoresByRelevance(
    { city: null, street: "Мір", houseNumber: null },
    [KYIV_MYR_STORE, LVIV_FRANKA, KYIV_PEREMOHY, ...decoyBranches(4)],
  );

  assert.deepEqual(matches, []);
});

test("rankStores: two stores answering a query equally print the one with receipts first", async () => {
  const twinA = branch({
    branchId: "b-twin-a",
    externalId: "5001",
    city: "Одеса",
    address: "вул. Дерибасівська, 1",
  });
  const twinB = branch({
    branchId: "b-twin-b",
    externalId: "5002",
    city: "Одеса",
    address: "вул. Дерибасівська, 1",
  });
  const client = rankClient({
    branches: [twinA, twinB, ...decoyBranches(4)],
    orders: [offlineOrder({ filId: 5001 })],
    addresses: [foundAddress({ city: "Одеса", street: "Дерибасівська", houseNumber: null })],
  });

  const result = await rankStores(client as never, { query: "Дерибасівська" });

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores.length, 2);
  assert.equal(result.stores[0].branch.branchId, twinA.branchId);
  assert.equal(result.stores[1].branch.branchId, twinB.branchId);
  assert.equal(result.stores[0].receipts.count, 1);
});

test("rankStores: a tie settled by receipts names receipts, not branch id, whichever branch id sorts first", async () => {
  const twinA = branch({
    branchId: "b-twin-a",
    externalId: "5001",
    city: "Одеса",
    address: "вул. Дерибасівська, 1",
  });
  const twinB = branch({
    branchId: "b-twin-b",
    externalId: "5002",
    city: "Одеса",
    address: "вул. Дерибасівська, 1",
  });
  const client = rankClient({
    branches: [twinA, twinB, ...decoyBranches(4)],
    orders: [offlineOrder({ filId: 5002 })],
    addresses: [foundAddress({ city: "Одеса", street: "Дерибасівська", houseNumber: null })],
  });

  const result = await rankStores(client as never, { query: "Дерибасівська" });

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores[0].branch.branchId, twinB.branchId, "the receipted twin did not sort first");
  assert.equal(result.stores[1].branch.branchId, twinA.branchId);
  assert.equal(result.stores[1].match.tiebreak, "receipts");
});

test("rankStores: a tie with neither twin holding a receipt names branch id", async () => {
  const twinA = branch({
    branchId: "b-twin-a",
    externalId: "5001",
    city: "Одеса",
    address: "вул. Дерибасівська, 1",
  });
  const twinB = branch({
    branchId: "b-twin-b",
    externalId: "5002",
    city: "Одеса",
    address: "вул. Дерибасівська, 1",
  });
  const client = rankClient({
    branches: [twinA, twinB, ...decoyBranches(4)],
    addresses: [foundAddress({ city: "Одеса", street: "Дерибасівська", houseNumber: null })],
  });

  const result = await rankStores(client as never, { query: "Дерибасівська" });

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores[0].branch.branchId, twinA.branchId);
  assert.equal(result.stores[1].match.tiebreak, "branch id");
});

test("rankStores: three stores tied on score each carry their own tiebreak against the store above them", async () => {
  const twinA = branch({
    branchId: "b-twin-a",
    externalId: "5001",
    city: "Одеса",
    address: "вул. Дерибасівська, 1",
  });
  const twinB = branch({
    branchId: "b-twin-b",
    externalId: "5002",
    city: "Одеса",
    address: "вул. Дерибасівська, 1",
  });
  const twinC = branch({
    branchId: "b-twin-c",
    externalId: "5003",
    city: "Одеса",
    address: "вул. Дерибасівська, 1",
  });
  const client = rankClient({
    branches: [twinA, twinB, twinC, ...decoyBranches(5)],
    orders: [offlineOrder({ filId: 5003 })],
    addresses: [foundAddress({ city: "Одеса", street: "Дерибасівська", houseNumber: null })],
  });

  const result = await rankStores(client as never, { query: "Дерибасівська" });

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores.length, 3);
  assert.equal(result.stores[0].branch.branchId, twinC.branchId, "the only receipted twin did not sort first");
  assert.equal(result.stores[1].branch.branchId, twinA.branchId);
  assert.equal(result.stores[2].branch.branchId, twinB.branchId);
  assert.equal(result.stores[0].match.tiebreak, undefined, "the top store has nothing above it to tie with");
  assert.equal(result.stores[1].match.tiebreak, "receipts", "the second lost to the receipted store above it");
  assert.equal(result.stores[2].match.tiebreak, "branch id", "the third tied on receipts with the store above it");
});

test("rankStores: a caller whose most-visited store is not their nearest still sees it first", async () => {
  const farVisited = branch({
    branchId: "b-far-visited",
    externalId: "6001",
    city: "Харків",
    address: "просп. Науки, 1",
    latitude: "49.9808",
    longitude: "36.2527",
  });
  const nearUnvisited = branch({
    branchId: "b-near-unvisited",
    externalId: "6002",
    city: "Київ",
    address: "вул. Хрещатик, 2",
    latitude: "50.4502",
    longitude: "30.5236",
  });
  const client = rankClient({
    branches: [farVisited, nearUnvisited],
    saved: [savedAddress({ id: "home", tag: "Дім", latitude: 50.4501, longitude: 30.5234 })],
    orders: [offlineOrder({ filId: 6001 }), offlineOrder({ filId: 6001 })],
  });

  const result = await rankStores(client as never, {});

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores[0].branch.branchId, farVisited.branchId);
  assert.equal(result.stores[1].branch.branchId, nearUnvisited.branchId);
  assert.equal(result.stores[1].distance.measuredFrom.kind, "saved");
  assert.equal(result.stores[1].distance.measuredFrom.address.id, "home");
});

test("rankStores: a query naming a city the caller has no receipts in is not displaced by their own stores", async () => {
  const client = rankClient({
    branches: [LVIV_FRANKA, KYIV_PEREMOHY],
    orders: [offlineOrder({ filId: Number(KYIV_PEREMOHY.externalId) })],
    addresses: [foundAddress({ city: "Львів", street: null, houseNumber: null })],
  });

  const result = await rankStores(client as never, { query: "Львів" });

  assert.equal(result.outcome, "ranked");
  assert.ok(result.stores.every((entry) => entry.branch.branchId !== KYIV_PEREMOHY.branchId));
  assert.equal(result.stores[0].branch.branchId, LVIV_FRANKA.branchId);
});

test("rankStores: a query naming a settlement does not answer with a record whose coordinates lie elsewhere", async () => {
  const real = branch({
    branchId: "b-kyiv-real",
    city: "Київ",
    address: "вул. Хрещатик, 1",
    latitude: "50.45",
    longitude: "30.52",
  });
  const elsewhere = branch({
    branchId: "b-kyiv-elsewhere",
    externalId: "567898",
    city: "Київ",
    address: "вул. Бориса Гмирі, 20",
    latitude: "1.0",
    longitude: "1.0",
  });
  const client = rankClient({
    branches: [real, elsewhere],
    addresses: [foundAddress({ city: "Київ", street: null, houseNumber: null })],
  });

  const result = await rankStores(client as never, { query: "Київ" });

  assert.equal(result.outcome, "ranked");
  assert.ok(result.stores.every((entry) => entry.branch.branchId !== elsewhere.branchId));
  assert.ok(result.stores.some((entry) => entry.branch.branchId === real.branchId));
});

test("rankStores: a building number the lookup returned settles the match, and supplies the point", async () => {
  const near = branch({
    branchId: "b-near-hetmanska",
    externalId: "3262",
    city: "Київ",
    address: "вул. Соборна, 10",
    latitude: "48.4648",
    longitude: "35.0463",
  });
  const client = rankClient({
    branches: [HETMANSKA_47A, near, LVIV_FRANKA],
    addresses: [foundAddress({ city: null, street: "вулиця Кирилівська", houseNumber: "47" })],
  });

  const result = await rankStores(client as never, { query: "вулиця Кирилівська, 47" });

  assert.equal(result.outcome, "ranked");
  assert.equal(
    client.calls.filter((call) => call === "address").length,
    1,
    "the query should be geocoded exactly once, its candidate's parts settling the match",
  );
  assert.equal(result.stores[0].branch.branchId, HETMANSKA_47A.branchId);

  const nearEntry = result.stores.find((entry) => entry.branch.branchId === near.branchId);

  assert.ok(nearEntry !== undefined, "the nearby store did not enter the answer");
  assert.deepEqual(nearEntry.distance.point, { latitude: 48.4647, longitude: 35.0462 });
  assert.equal(nearEntry.distance.measuredFrom.kind, "store");
  assert.equal(nearEntry.distance.measuredFrom.branch.branchId, HETMANSKA_47A.branchId);
});

test("rankStores: a street the listing carries, without a building number to settle it, still answers from the one match", async () => {
  const near = branch({
    branchId: "b-near-hetmanska",
    externalId: "3262",
    city: "Київ",
    address: "вул. Соборна, 10",
    latitude: "48.4648",
    longitude: "35.0463",
  });
  const client = rankClient({
    branches: [HETMANSKA_47A, near, LVIV_FRANKA],
    addresses: [foundAddress({ city: null, street: "вулиця Кирилівська", houseNumber: null })],
  });

  const result = await rankStores(client as never, { query: "вулиця Кирилівська" });

  assert.equal(result.outcome, "ranked");
  assert.equal(
    client.calls.filter((call) => call === "address").length,
    1,
    "a query naming only a street should make exactly one address call",
  );
  assert.equal(result.stores[0].branch.branchId, HETMANSKA_47A.branchId, "the geocoded candidate's street did not settle the match");
});

test("rankStores: a saved address named by its label resolves, the lookup having found nothing for it", async () => {
  const homeStore = branch({
    branchId: "b-home-store",
    externalId: "8001",
    city: "Київ",
    address: "вул. Хрещатик, 3",
    latitude: "50.4502",
    longitude: "30.5235",
  });
  const client = rankClient({
    branches: [homeStore, LVIV_FRANKA],
    saved: [savedAddress({ id: "home", tag: "Дім", latitude: 50.4501, longitude: 30.5234 })],
  });

  const result = await rankStores(client as never, { query: "house" });

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores[0].branch.branchId, homeStore.branchId);
  assert.equal(result.stores[0].distance.measuredFrom.kind, "saved");
  assert.equal(result.stores[0].distance.measuredFrom.address.id, "home");
});

test("rankStores: a uuid or a code the listing does not hold fails naming it, rather than being geocoded", async () => {
  const client = rankClient({ branches: [HETMANSKA_47A, LVIV_FRANKA] });

  const uuidResult = await rankStores(client as never, {
    query: "0d000000-0000-0000-0000-000000000000",
  });

  assert.deepEqual(uuidResult, {
    outcome: "unknown-handle",
    handle: "0d000000-0000-0000-0000-000000000000",
    unjoinedReceipts: 0,
  });
  assert.ok(!client.calls.includes("address"));

  client.calls.length = 0;

  const codeResult = await rankStores(client as never, { query: "424242" });

  assert.deepEqual(codeResult, {
    outcome: "unknown-handle",
    handle: "424242",
    unjoinedReceipts: 0,
  });
  assert.ok(!client.calls.includes("address"));
});

test("rankStores: a coordinate pair is taken as the point directly, without geocoding", async () => {
  const client = rankClient({ branches: [KYIV_PEREMOHY, LVIV_FRANKA] });

  const result = await rankStores(client as never, { query: "50.4501,30.5234" });

  assert.equal(result.outcome, "ranked");
  assert.ok(!client.calls.includes("address"));
  assert.ok(!client.calls.includes("saved"));
  assert.equal(result.stores[0].branch.branchId, KYIV_PEREMOHY.branchId);
  assert.deepEqual(result.stores[0].distance.measuredFrom, { kind: "coordinates" });
});

test("rankStores: a non-coordinate query issues no delivery-type call", async () => {
  const client = rankClient({
    branches: [HETMANSKA_47A, LVIV_FRANKA],
    addresses: [foundAddress({ city: null, street: "Кирилівська", houseNumber: "47" })],
  });

  const result = await rankStores(client as never, { query: "Кирилівська 47" });

  assert.equal(result.outcome, "ranked");
  assert.ok(!client.calls.includes("delivery-types"));
  assert.equal(result.servingBranches, undefined);
});

test("rankStores: a query with no coordinate pair at all issues no delivery-type call", async () => {
  const client = rankClient({ branches: [HETMANSKA_47A, LVIV_FRANKA] });

  const result = await rankStores(client as never, {});

  assert.ok(!client.calls.includes("delivery-types"));
  assert.equal((result as { servingBranches?: unknown }).servingBranches, undefined);
});

test("rankStores: for a coordinate query, the delivery-type read is in flight alongside the listing, not issued after it", async () => {
  let startedCount = 0;
  let releaseAll: () => void = () => {};
  const allStarted = new Promise<void>((resolve) => {
    releaseAll = resolve;
  });

  function markStarted() {
    startedCount += 1;
    if (startedCount === 2) releaseAll();
  }

  const client = {
    async listBranches() {
      markStarted();
      await allStarted;

      return { content: "", structured: { branches: [], meta: { limit: 500, offset: 0, total: 0 } } };
    },
    async getMyOfflineOrders() {
      return {
        content: "",
        structured: { success: true, summary: "", orders: [], meta: { limit: 10, offset: 0, total: 0 } },
      };
    },
    async getAvailableDeliveryTypes() {
      markStarted();
      await allStarted;

      return { content: "", structured: { success: true, summary: "", options: [] } };
    },
  };

  const timedOut = Symbol("timed-out");
  const timeout = new Promise((resolve) => setTimeout(() => resolve(timedOut), 200));

  const outcome = await Promise.race([
    rankStores(client as never, { query: "50.4501,30.5234" }),
    timeout,
  ]);

  assert.notEqual(
    outcome,
    timedOut,
    "the delivery-type read was issued only after the branch listing had already resolved",
  );
});

test("rankStores: a coordinate query issues exactly one delivery-type call", async () => {
  const client = rankClient({
    branches: [KYIV_PEREMOHY, LVIV_FRANKA],
    deliveryTypes: [
      { deliveryType: "DeliveryHome", branchId: KYIV_PEREMOHY.branchId, description: "" },
      { deliveryType: "SelfPickup", branchId: null, description: "" },
    ],
  });

  const result = await rankStores(client as never, { query: "50.4501,30.5234" });

  assert.equal(client.calls.filter((call) => call === "delivery-types").length, 1);
  assert.equal(result.outcome, "ranked");
  assert.deepEqual(result.servingBranches, [
    { deliveryType: "DeliveryHome", outcome: "served", branch: KYIV_PEREMOHY, excludedByFilter: false },
    { deliveryType: "SelfPickup", outcome: "unserved" },
  ]);
});

test("rankStores: a serving branch is carried on the ranking without entering the ranked stores", async () => {
  const servingOnly = branch({
    branchId: "b-serving-only",
    externalId: "9500",
    city: "Київ",
    address: "вул. Басейна, 6",
    latitude: "50.4400",
    longitude: "30.5100",
  });
  const client = rankClient({
    branches: [servingOnly],
    deliveryTypes: [{ deliveryType: "DeliveryHome", branchId: servingOnly.branchId, description: "" }],
  });

  const result = await rankStores(client as never, { query: "50.4501,30.5234", radiusKm: 0.001 });

  assert.equal(result.outcome, "ranked");
  assert.deepEqual(result.stores, []);
  assert.equal(result.servingBranches?.[0]?.outcome, "served");
  assert.equal(result.servingBranches?.[0]?.branch.branchId, servingOnly.branchId);
});

test("rankStores: a serving branch further from the point than another store does not move in the ordering", async () => {
  const near = branch({
    branchId: "b-really-near",
    externalId: "9501",
    city: "Київ",
    address: "вул. Хрещатик, 2",
    latitude: "50.4502",
    longitude: "30.5236",
  });
  const farServing = branch({
    branchId: "b-far-serving",
    externalId: "9502",
    city: "Київ",
    address: "вул. Басейна, 6",
    latitude: "50.4700",
    longitude: "30.5300",
  });
  const client = rankClient({
    branches: [near, farServing],
    deliveryTypes: [{ deliveryType: "DeliveryHome", branchId: farServing.branchId, description: "" }],
  });

  const result = await rankStores(client as never, { query: "50.4501,30.5234" });

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores[0].branch.branchId, near.branchId);
  assert.equal(result.stores[1].branch.branchId, farServing.branchId);
  assert.equal(result.servingBranches?.[0]?.outcome, "served");
  assert.equal(result.servingBranches?.[0]?.branch.branchId, farServing.branchId);
});

test("rankStores: a serving branch the caller's own filter excluded is carried as a placeholder, not the listing's record", async () => {
  const near = branch({
    branchId: "b-pickup-near",
    externalId: "9900",
    city: "Київ",
    address: "вул. Хрещатик, 2",
    latitude: "50.4502",
    longitude: "30.5236",
    hasPickup: true,
  });
  const servingNoPickup = branch({
    branchId: "b-serving-no-pickup",
    externalId: "9901",
    city: "Київ",
    address: "вул. Басейна, 6",
    latitude: "50.4400",
    longitude: "30.5100",
    hasPickup: false,
  });
  const client = rankClient({
    branches: [near, servingNoPickup],
    deliveryTypes: [
      { deliveryType: "WideAssortDelivery", branchId: servingNoPickup.branchId, description: "" },
    ],
  });

  const result = await rankStores(client as never, {
    query: "50.4501,30.5234",
    filter: { hasPickup: true },
  });

  assert.equal(result.outcome, "ranked");
  assert.ok(
    !result.stores.some((store) => store.branch.branchId === servingNoPickup.branchId),
    "the filter-excluded branch was printed among the ranked stores",
  );
  assert.equal(result.servingBranches?.[0]?.outcome, "served");
  assert.equal(result.servingBranches?.[0]?.branch.branchId, servingNoPickup.branchId);
  assert.equal(result.servingBranches?.[0]?.excludedByFilter, true);
  assert.equal(
    result.servingBranches?.[0]?.branch.address,
    null,
    "the excluded branch was named with the listing's own record, not a placeholder",
  );
  assert.equal(
    result.servingBranches?.[0]?.branch.externalId,
    null,
    "the excluded branch was named with the listing's own record, not a placeholder",
  );
  assert.equal(
    client.calls.filter((call) => call === "branches").length,
    1,
    "the whole store listing was read more than once for this command",
  );
});

test("rankStores: a query that geocodes carries the resolved address as the point's provenance", async () => {
  const geocoded = foundAddress({
    city: "Львів",
    street: "вулиця Хрещатик",
    houseNumber: "1",
    latitude: 49.8397,
    longitude: 24.0297,
  });
  const near = branch({
    branchId: "b-near-geocoded",
    externalId: "9001",
    city: "Львів",
    address: "вул. Хрещатик, 2",
    latitude: "49.8398",
    longitude: "24.0299",
  });
  const client = rankClient({ branches: [near], addresses: [geocoded] });

  const result = await rankStores(client as never, { query: "Нізвідкикудизавулок" });

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores[0].branch.branchId, near.branchId);
  assert.deepEqual(result.stores[0].distance.measuredFrom, { kind: "address", address: geocoded });
});

test("rankStores: '50.4' alone is not a coordinate pair and reaches the listing as text", async () => {
  const client = rankClient({ branches: [KYIV_PEREMOHY, LVIV_FRANKA], addresses: [] });

  const result = await rankStores(client as never, { query: "50.4" });

  assert.ok(client.calls.includes("address"), "50.4 alone should have been geocoded as text");
  assert.deepEqual(result, { outcome: "no-match", query: "50.4", unjoinedReceipts: 0 });
});

test("rankStores: a query that matched nothing is a distinct outcome from nothing to rank by", async () => {
  const client = rankClient({
    branches: [LVIV_FRANKA, KYIV_PEREMOHY],
    saved: [savedAddress({ id: "home", tag: "Дім", latitude: 50.4501, longitude: 30.5234 })],
    orders: [offlineOrder({ filId: Number(KYIV_PEREMOHY.externalId) })],
    addresses: [],
  });

  const result = await rankStores(client as never, { query: "Кирилівськ" });

  assert.deepEqual(result, {
    outcome: "no-match",
    query: "Кирилівськ",
    unjoinedReceipts: 0,
  });
});

test("rankStores: nothing to rank by, with no receipts and no saved addresses", async () => {
  const client = rankClient({ branches: [HETMANSKA_47A, LVIV_FRANKA] });

  const result = await rankStores(client as never, {});

  assert.deepEqual(result, {
    outcome: "none",
    unjoinedReceipts: 0,
    receiptsRead: 0,
    hasSavedAddresses: false,
  });
});

test("rankStores: nothing joins to a store but the account did have receipts", async () => {
  const client = rankClient({
    branches: [LVIV_FRANKA, KYIV_PEREMOHY],
    orders: [offlineOrder({ filId: 5831 })],
  });

  const result = await rankStores(client as never, {});

  assert.deepEqual(result, {
    outcome: "none",
    unjoinedReceipts: 1,
    receiptsRead: 1,
    hasSavedAddresses: false,
  });
});

test("rankStores: a filter excluding every store still reads receipts, rather than skipping the call", async () => {
  const client = rankClient({
    branches: [],
    orders: [offlineOrder({ filId: 5831 })],
  });

  const result = await rankStores(client as never, { filter: { hasPickup: true } });

  assert.deepEqual(result, {
    outcome: "none",
    unjoinedReceipts: 1,
    receiptsRead: 1,
    hasSavedAddresses: false,
  });
  assert.ok(client.calls.includes("orders"), "the receipt read was skipped for an empty listing");
});

test("rankStores: the receipt read's arguments carry no branch and cannot vary with the filter", async () => {
  const capturedArgs: Record<string, unknown>[] = [];
  const client = {
    async listBranches() {
      return { content: "", structured: { branches: [], meta: { limit: 500, offset: 0, total: 0 } } };
    },
    async getMyOfflineOrders(args: Record<string, unknown>) {
      capturedArgs.push(args);

      return {
        content: "",
        structured: { success: true, summary: "", orders: [], meta: { limit: 10, offset: 0, total: 0 } },
      };
    },
    async getMyDeliveryAddresses() {
      return { content: "", structured: { success: true, summary: "", addresses: [] } };
    },
  };

  await rankStores(client as never, { filter: { hasPickup: true } });

  assert.deepEqual(capturedArgs[0], {
    branchId: "",
    deliveryType: "",
    timeslotStart: "",
    timeslotEnd: "",
    limit: 10,
    offset: 0,
  });
});

test("rankStores: the saved-address read is not issued when the query matched the listing", async () => {
  const client = rankClient({
    branches: [HETMANSKA_47A, LVIV_FRANKA],
    addresses: [foundAddress({ city: null, street: "Кирилівська", houseNumber: "47" })],
  });

  const result = await rankStores(client as never, { query: "Кирилівська 47" });

  assert.equal(result.outcome, "ranked");
  assert.ok(
    !client.calls.includes("saved"),
    "the saved-address call was issued despite the query matching the listing",
  );
});

test("rankStores: the branch listing and the offline orders are both in flight before either resolves", async () => {
  let firstStarted = false;
  let releaseBoth: () => void = () => {};
  const bothStarted = new Promise<void>((resolve) => {
    releaseBoth = resolve;
  });

  function markStarted() {
    if (firstStarted) releaseBoth();
    firstStarted = true;
  }

  const client = {
    async listBranches() {
      markStarted();
      await bothStarted;

      return { content: "", structured: { branches: [], meta: { limit: 500, offset: 0, total: 0 } } };
    },
    async getMyOfflineOrders() {
      markStarted();
      await bothStarted;

      return {
        content: "",
        structured: { success: true, summary: "", orders: [], meta: { limit: 10, offset: 0, total: 0 } },
      };
    },
    async getMyDeliveryAddresses() {
      return { content: "", structured: { success: true, summary: "", addresses: [] } };
    },
  };

  const timedOut = Symbol("timed-out");
  const timeout = new Promise((resolve) => setTimeout(() => resolve(timedOut), 200));

  const outcome = await Promise.race([rankStores(client as never, {}), timeout]);

  assert.notEqual(
    outcome,
    timedOut,
    "the branch listing was awaited before the offline-order read was issued",
  );
});

test("rankStores: a store with no coordinates still prints through its receipts", async () => {
  const noCoords = branch({
    branchId: "b-no-coords",
    externalId: "7100",
    city: "Полтава",
    address: "вул. Соборності, 1",
    latitude: null,
    longitude: null,
  });
  const client = rankClient({
    branches: [noCoords],
    orders: [offlineOrder({ filId: 7100 })],
  });

  const result = await rankStores(client as never, {});

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores.length, 1);
  assert.equal(result.stores[0].branch.branchId, noCoords.branchId);
  assert.equal(result.stores[0].distance, undefined);
});

test("rankStores: a store the query matched beyond the radius is still printed", async () => {
  const client = rankClient({
    branches: [HETMANSKA_47A, HETMANSKA_OTHER, ...decoyBranches(4)],
    addresses: [foundAddress({ city: null, street: "Кирилівська", houseNumber: "47А" })],
  });

  const result = await rankStores(client as never, { query: "Кирилівська, 47А", radiusKm: 0.001 });

  assert.equal(result.outcome, "ranked");
  assert.ok(result.stores.some((entry) => entry.branch.branchId === HETMANSKA_47A.branchId));
});

test("rankStores: a store without receipts beyond the radius is left out", async () => {
  const far = branch({
    branchId: "b-far-no-receipts",
    externalId: "9500",
    city: "Одеса",
    address: "вул. Дерибасівська, 9",
    latitude: "46.4825",
    longitude: "30.7233",
  });
  const client = rankClient({
    branches: [far],
    saved: [savedAddress({ id: "home", tag: "Дім", latitude: 50.4501, longitude: 30.5234 })],
  });

  const result = await rankStores(client as never, { radiusKm: 15 });

  assert.deepEqual(result, {
    outcome: "none",
    unjoinedReceipts: 0,
    receiptsRead: 0,
    hasSavedAddresses: true,
  });
});

test("rankStores: the pickup filter narrows the corpus, not just the order", async () => {
  const withPickup = branch({
    branchId: "b-pickup",
    externalId: "8800",
    city: "Київ",
    address: "вул. Хрещатик, 5",
    hasPickup: true,
    latitude: "50.4501",
    longitude: "30.5234",
  });
  const withoutPickup = branch({
    branchId: "b-no-pickup",
    externalId: "8801",
    city: "Київ",
    address: "вул. Хрещатик, 6",
    hasPickup: false,
    latitude: "50.4502",
    longitude: "30.5235",
  });
  const client = rankClient({
    branches: [withPickup, withoutPickup],
    saved: [savedAddress({ id: "home", tag: "Дім", latitude: 50.4501, longitude: 30.5234 })],
  });

  const result = await rankStores(client as never, { filter: { hasPickup: true } });

  assert.equal(result.outcome, "ranked");
  assert.ok(result.stores.every((entry) => entry.branch.branchId !== withoutPickup.branchId));
});

const NUMBERED_1998 = branch({ branchId: "b-1998", externalId: "1998", city: "Київ" });
const NUMBERED_OTHER = branch({ branchId: "b-9001-h", externalId: "900100", city: "Львів" });
const TOMBSTONE = branch({
  branchId: "b-tombstone",
  externalId: "delete_filia_silpo_ivasuka46",
  city: null,
  address: null,
});

test("buildHandleIndex: Сільпо 1998 resolves the store by the number, with the retailer's name around it", () => {
  const resolve = buildHandleIndex([NUMBERED_1998, NUMBERED_OTHER, TOMBSTONE]);

  assert.equal(resolve("Сільпо 1998")?.branchId, NUMBERED_1998.branchId);
  assert.equal(resolve("1998")?.branchId, NUMBERED_1998.branchId);
});

test("buildHandleIndex: Бережанська 22 is read as an address, not a handle, because 22 is shorter than the listing's shortest code", () => {
  const resolve = buildHandleIndex([NUMBERED_1998, NUMBERED_OTHER]);

  assert.equal(resolve("Бережанська 22"), null);
});

test("buildHandleIndex: a four-digit number the listing does not carry is not a handle", () => {
  const resolve = buildHandleIndex([NUMBERED_1998, NUMBERED_OTHER]);

  assert.equal(resolve("2024"), null);
  assert.equal(resolve("Сільпо 2024"), null);
});

test("rankStores: a bare query shorter than the listing's own numeric codes falls through to text, rather than refusing as an unknown handle", async () => {
  const client = rankClient({ branches: [NUMBERED_1998, NUMBERED_OTHER], addresses: [] });

  const result = await rankStores(client as never, { query: "22" });

  assert.deepEqual(result, { outcome: "no-match", query: "22", unjoinedReceipts: 0 });
  assert.ok(client.calls.includes("address"), "a query too short to be a store number should have been geocoded as text");
});

test("buildHandleIndex: a branch uuid resolves from anywhere in the query, case-insensitively", () => {
  const resolve = buildHandleIndex([HETMANSKA_47A, LVIV_FRANKA]);

  assert.equal(resolve(`Магазин ${HETMANSKA_47A.branchId.toUpperCase()} у Києві`)?.branchId, HETMANSKA_47A.branchId);
});

test("buildHandleIndex: a non-numeric externalId resolves only on an exact whole-query match", () => {
  const resolve = buildHandleIndex([TOMBSTONE, HETMANSKA_47A]);

  assert.equal(resolve("delete_filia_silpo_ivasuka46")?.branchId, TOMBSTONE.branchId);
  assert.equal(resolve("Silpo delete_filia_silpo_ivasuka46 Kyiv"), null);
});

test("rankStores: the retailer's own name reaches the lookup unchanged, and the store it names answers", async () => {
  const probesSeen: string[] = [];
  const client = rankClient({
    branches: [HETMANSKA_47A, LVIV_FRANKA],
    findAddress: (args) => {
      probesSeen.push(args.address as string);

      return [
        foundAddress({
          city: "Київ",
          street: "вулиця Кирилівська",
          houseNumber: "47",
          latitude: 48.4647,
          longitude: 35.0462,
        }),
      ];
    },
  });

  const result = await rankStores(client as never, { query: "Сільпо Кирилівська" });

  assert.deepEqual(probesSeen, ["Сільпо Кирилівська"], "the retailer's own name was stripped before reaching the lookup");
  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores[0].branch.branchId, HETMANSKA_47A.branchId);
});

test("rankStores: a store handle inside a longer sentence is resolved directly, with no lookup made", async () => {
  const client = rankClient({ branches: [HETMANSKA_47A, LVIV_FRANKA] });

  const result = await rankStores(client as never, {
    query: `Скажи скільки коштує доставка у ${HETMANSKA_47A.branchId} будь ласка`,
  });

  assert.equal(result.outcome, "ranked");
  assert.ok(!client.calls.includes("address"), "a handle found inside a sentence still triggered a lookup");
  assert.equal(result.stores[0].branch.branchId, HETMANSKA_47A.branchId);
  assert.equal(result.stores[0].match?.kind, "handle");
});

test("rankStores: several geocoded candidates that no street separates are each matched against the listing, not just the first", async () => {
  const farCandidate = foundAddress({
    city: "Софіївка",
    street: null,
    houseNumber: null,
    district: null,
    latitude: 48.0,
    longitude: 33.9,
  });
  const nearCandidate = foundAddress({
    city: "Софіївська Борщагівка",
    street: null,
    houseNumber: null,
    district: null,
    latitude: 50.43,
    longitude: 30.41,
  });
  const store = branch({
    branchId: "b-sofiivska",
    externalId: "9100",
    city: "Київ",
    address: "вул. Соборності, 10",
    latitude: "50.45",
    longitude: "30.43",
  });
  const client = rankClient({ branches: [store], addresses: [farCandidate, nearCandidate] });

  const result = await rankStores(client as never, { query: "Софіївська Борщагівка" });

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores.length, 1);
  assert.equal(result.stores[0].branch.branchId, store.branchId);
  assert.deepEqual(
    result.resolvedPlaces,
    [nearCandidate],
    "the candidate the listing never came near should not be named alongside the one that answered",
  );
});

test("rankStores: a store swept up by one candidate's settlement answer is not printed again under another candidate's own match", async () => {
  const kyivMatch = branch({
    branchId: "b-lesi-ukrainky",
    externalId: "9200",
    city: "Київ",
    address: "бульвар Лесі Українки, 1",
    latitude: "50.430",
    longitude: "30.560",
  });
  const kyivSettlementOnly = branch({
    branchId: "b-khmelnytskoho",
    externalId: "9201",
    city: "Київ",
    address: "вул. Богдана Хмельницького, 10",
    latitude: "50.440",
    longitude: "30.520",
  });
  const streetCandidate = foundAddress({
    city: "Київ",
    street: "бульвар Лесі Українки",
    houseNumber: "1",
    district: null,
    latitude: 50.43,
    longitude: 30.56,
  });
  const settlementCandidate = foundAddress({
    city: "Київ",
    street: "вулиця Хрещатик",
    houseNumber: null,
    district: null,
    latitude: 50.435,
    longitude: 30.54,
  });
  const client = rankClient({
    branches: [kyivMatch, kyivSettlementOnly, ...decoyBranches(4)],
    addresses: [settlementCandidate, streetCandidate],
  });

  const result = await rankStores(client as never, { query: "Хрещатик, Лесі Українки" });

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores.length, 2, "the branch matched by name and swept up by settlement was counted twice");
  const branchIds = result.stores.map((entry) => entry.branch.branchId);

  assert.deepEqual(new Set(branchIds), new Set([kyivMatch.branchId, kyivSettlementOnly.branchId]));
  assert.equal(branchIds.filter((id) => id === kyivMatch.branchId).length, 1);
});

test("rankStores: a settlement-answered candidate also surfaces a store within the radius filed under a different city record", async () => {
  const settlementOnlyBranch = branch({
    branchId: "b-khmelnytskoho-2",
    externalId: "9301",
    city: "Київ",
    address: "вул. Богдана Хмельницького, 10",
    latitude: "50.4550",
    longitude: "30.5240",
  });
  const otherCityBranch = branch({
    branchId: "b-kryukivshchyna",
    externalId: "9302",
    city: "Крюківщина",
    address: "вул. Соборна, 5",
    latitude: "50.4000",
    longitude: "30.4500",
  });
  const settlementCandidate = foundAddress({
    city: "Київ",
    street: "вулиця Хрещатик",
    houseNumber: null,
    district: null,
    latitude: 50.4501,
    longitude: 30.5234,
  });
  const client = rankClient({
    branches: [settlementOnlyBranch, otherCityBranch, ...decoyBranches(2)],
    addresses: [settlementCandidate],
  });

  const result = await rankStores(client as never, { query: "вулиця Хрещатик" });

  assert.equal(result.outcome, "ranked");
  const branchIds = result.stores.map((entry) => entry.branch.branchId);

  assert.deepEqual(
    branchIds,
    [settlementOnlyBranch.branchId, otherCityBranch.branchId],
    "a store within the radius but filed under a different city record was left out of the settlement's answer",
  );

  const otherEntry = result.stores.find((entry) => entry.branch.branchId === otherCityBranch.branchId);

  assert.ok(otherEntry !== undefined, "the radius store never entered the answer");
  assert.equal(otherEntry.match, undefined, "the radius store was answered by the query, not merely by distance");
  assert.equal(otherEntry.distance?.measuredFrom.kind, "address");
  assert.equal(otherEntry.distance?.measuredFrom.address, settlementCandidate);
});

test("rankStores: the resolved place is still named when the lookup places the query but no store falls inside the radius", async () => {
  const farBranch = branch({
    branchId: "b-basseina-6",
    externalId: "9600",
    city: "Київ",
    address: "вул. Басейна, 6",
    latitude: "50.4400",
    longitude: "30.5100",
  });
  const candidate = foundAddress({
    city: "Київ",
    street: "вулиця Хрещатик",
    houseNumber: null,
    district: "Центр",
    latitude: 50.4501,
    longitude: 30.5234,
  });
  const client = rankClient({ branches: [farBranch], addresses: [candidate] });

  const result = await rankStores(client as never, { query: "вулиця Хрещатик", radiusKm: 0.1 });

  assert.equal(result.outcome, "ranked");
  assert.deepEqual(result.stores, []);
  assert.deepEqual(
    result.resolvedPlaces,
    [candidate],
    "the place the lookup placed the query at was dropped once the radius left no store standing near it",
  );
});

const LVIV_SHEVCHENKA_60 = branch({
  branchId: "b-shevchenka-60",
  externalId: "7060",
  city: "Львів",
  address: "вул. Шевченка, 60",
  latitude: "49.8410",
  longitude: "24.0210",
});

const LVIV_SHEVCHENKA_358A = branch({
  branchId: "b-shevchenka-358a",
  externalId: "7358",
  city: "Львів",
  address: "вул. Шевченка, 358А",
  latitude: "49.8500",
  longitude: "24.0500",
});

test("matchStoresByRelevance: Львів, вул. Шевченка, 60 answers the branch at 60, not the one at 358А", () => {
  const matches = matchStoresByRelevance(
    { city: "Львів", street: "вул. Шевченка", houseNumber: "60" },
    [LVIV_SHEVCHENKA_60, LVIV_SHEVCHENKA_358A, LVIV_FRANKA, ...decoyBranches(4)],
  );

  assert.ok(matches.length > 0, "no match at all for Львів, вул. Шевченка, 60");
  assert.equal(matches[0].branch.branchId, LVIV_SHEVCHENKA_60.branchId);
});

const KYIV_8_BEREZNIA = branch({
  branchId: "b-8-bereznia",
  externalId: "8010",
  city: "Київ",
  address: "вул. 8 Березня, 10",
  latitude: "50.42",
  longitude: "30.50",
});

const KYIV_BEREZNEVA = branch({
  branchId: "b-berezneva",
  externalId: "8011",
  city: "Київ",
  address: "вул. Березнева, 5",
  latitude: "50.43",
  longitude: "30.51",
});

test("matchStoresByRelevance: вул. 8 Березня, typed with no building, does not read the street's own leading digit as one", () => {
  const matches = matchStoresByRelevance(
    { city: null, street: "вул. 8 Березня", houseNumber: null },
    [KYIV_8_BEREZNIA, KYIV_BEREZNEVA, ...decoyBranches(4)],
  );

  assert.ok(matches.length > 0, "no match at all for вул. 8 Березня");
  assert.equal(matches[0].branch.branchId, KYIV_8_BEREZNIA.branchId);
  assert.equal(
    matches[0].parts.building,
    "absent",
    "the street's own leading digit was read as a building the caller never named",
  );
});

test("matchStoresByRelevance: вул. 8 Березня, 10 typed back as the store's own address, matches its building exactly", () => {
  const matches = matchStoresByRelevance(
    { city: null, street: "вул. 8 Березня", houseNumber: "10" },
    [KYIV_8_BEREZNIA, KYIV_BEREZNEVA, ...decoyBranches(4)],
  );

  assert.ok(matches.length > 0, "no match at all for вул. 8 Березня, 10");
  assert.equal(matches[0].branch.branchId, KYIV_8_BEREZNIA.branchId);
  assert.equal(
    matches[0].parts.building,
    "equal",
    "the trailing building number was not read as the building, the street's leading digit was",
  );
});

const ODESA_DERYBASIVSKA = branch({
  branchId: "b-derybasivska",
  externalId: "8001",
  city: "Одеса",
  address: "вул. Дерибасівська, 1",
  latitude: "46.4838",
  longitude: "30.7385",
});

const ODESA_HEROIV_OBORONY = branch({
  branchId: "b-heroiv-oborony",
  externalId: "8002",
  city: "Одеса",
  address: "вул. Героїв Оборони Одеси, 5",
  latitude: "46.4200",
  longitude: "30.6300",
});

test("matchStoresByRelevance: Дерибасівська Одеса does not answer вул. Героїв Оборони Одеси, even though Одеси occurs inside its name", () => {
  const matches = matchStoresByRelevance(
    { city: "Одеса", street: "Дерибасівська", houseNumber: null },
    [ODESA_DERYBASIVSKA, ODESA_HEROIV_OBORONY, ...decoyBranches(4)],
  );

  assert.ok(matches.length > 0, "no match at all for Дерибасівська Одеса");
  assert.equal(matches[0].branch.branchId, ODESA_DERYBASIVSKA.branchId);
  assert.ok(
    matches.every((match) => match.branch.branchId !== ODESA_HEROIV_OBORONY.branchId),
    "the settlement's own name inside a street outranked the genuine match",
  );
});

test("matchStoresByRelevance: a bare settlement answers that settlement's stores, with no street to score", () => {
  const matches = matchStoresByRelevance(
    { city: "Одеса", street: null, houseNumber: null },
    [ODESA_DERYBASIVSKA, ODESA_HEROIV_OBORONY, ...decoyBranches(4)],
  );

  assert.deepEqual(
    new Set(matches.map((match) => match.branch.branchId)),
    new Set([ODESA_DERYBASIVSKA.branchId, ODESA_HEROIV_OBORONY.branchId]),
  );
});

const KRIUKIVSHCHYNA_VELYKA_12 = branch({
  branchId: "b-a-kriukivshchyna-velyka-12",
  externalId: "9010",
  city: "Крюківщина",
  address: "вул. Велика, 12",
  latitude: "50.35",
  longitude: "30.30",
});

const KRIUKIVSHCHYNA_MALA_5 = branch({
  branchId: "b-z-kriukivshchyna-mala-5",
  externalId: "9011",
  city: "Крюківщина",
  address: "вул. Мала, 5",
  latitude: "50.36",
  longitude: "30.31",
});

test("matchStoresByRelevance: Крюківщина 5 ranks the store at building 5 above the store whose building conflicts", () => {
  const matches = matchStoresByRelevance(
    { city: "Крюківщина", street: null, houseNumber: "5" },
    [KRIUKIVSHCHYNA_VELYKA_12, KRIUKIVSHCHYNA_MALA_5, ...decoyBranches(4)],
  );

  assert.ok(matches.length > 0, "no match at all for Крюківщина 5");
  assert.equal(matches[0].branch.branchId, KRIUKIVSHCHYNA_MALA_5.branchId);
  assert.ok(
    matches[0].score > matches.find((match) => match.branch.branchId === KRIUKIVSHCHYNA_VELYKA_12.branchId)!.score,
    "the conflicting building scored no lower than the matching one",
  );
});

const KYIV_RING_ROAD = branch({
  branchId: "b-ring-road",
  externalId: "7100",
  city: "Київ",
  address: "Кільцева дорога, 1",
  latitude: "50.35",
  longitude: "30.40",
});

const BOYARKA_UUID_DECOY = branch({
  branchId: "1eda1111-1111-6111-a111-111111111111",
  externalId: "1911",
  city: "Боярка",
  address: "вул. Соборна, 5",
  latitude: "50.32",
  longitude: "30.28",
});

test("matchStoresByRelevance: Київ, Кільцева дорога 1 answers the Kyiv ring-road store, never the Boyarka store a uuid digit used to match", () => {
  const matches = matchStoresByRelevance(
    { city: "Київ", street: "Кільцева дорога", houseNumber: "1" },
    [KYIV_RING_ROAD, BOYARKA_UUID_DECOY, ...decoyBranches(4)],
  );

  assert.ok(matches.length > 0, "no match at all for Київ, Кільцева дорога 1");
  assert.equal(matches[0].branch.branchId, KYIV_RING_ROAD.branchId);
  assert.ok(
    matches.every((match) => match.branch.branchId !== BOYARKA_UUID_DECOY.branchId),
    "a digit inside the Boyarka branch's uuid still matched the query",
  );
});

const TOMBSTONE_NO_ADDRESS = branch({
  branchId: "b-tombstone-ivasiuka",
  externalId: "delete_filia_silpo_ivasuka46",
  city: null,
  address: null,
  latitude: null,
  longitude: null,
});

const KYIV_IVASIUKA = branch({
  branchId: "b-ivasiuka",
  externalId: "4600",
  city: "Київ",
  address: "просп. Володимира Івасюка, 46",
  latitude: "50.52022",
  longitude: "30.51452",
});

test("rankStores: Silpo Volodymyra Ivasiuka Kyiv answers the Ivasiuka store, never the empty-address tombstone", async () => {
  const geocoded = foundAddress({
    city: "Київ",
    street: "просп. Володимира Івасюка",
    houseNumber: "46",
    district: null,
    latitude: 50.52022,
    longitude: 30.51452,
  });
  const client = rankClient({
    branches: [TOMBSTONE_NO_ADDRESS, KYIV_IVASIUKA, ...decoyBranches(4)],
    addresses: [geocoded],
  });

  const result = await rankStores(client as never, { query: "Silpo Volodymyra Ivasiuka Kyiv" });

  assert.equal(result.outcome, "ranked");
  assert.ok(result.stores.every((entry) => entry.branch.branchId !== TOMBSTONE_NO_ADDRESS.branchId));
  assert.equal(result.stores[0].branch.branchId, KYIV_IVASIUKA.branchId);
});

const CHERNIHIV_STORE_A = branch({
  branchId: "b-chernihiv-a",
  externalId: "6001",
  city: "Чернігів",
  address: "просп. Миру, 1",
  latitude: "51.4982",
  longitude: "31.2893",
});

const CHERNIHIV_STORE_B = branch({
  branchId: "b-chernihiv-b",
  externalId: "6002",
  city: "Чернігів",
  address: "вул. Шевченка, 2",
  latitude: "51.5050",
  longitude: "31.2950",
});

test("matchStoresByRelevance: Чернигов, the Russian spelling, matches no street of the estate's own", () => {
  const matches = matchStoresByRelevance(
    { city: null, street: "Чернигов", houseNumber: null },
    [CHERNIHIV_STORE_A, CHERNIHIV_STORE_B, ...decoyBranches(4)],
  );

  assert.deepEqual(matches, []);
});

test("rankStores: Чернигов is answered through the geocoded place, with no table of settlement spellings consulted", async () => {
  const geocoded = foundAddress({
    city: "Чернігів",
    street: null,
    houseNumber: null,
    district: null,
    latitude: 51.4982,
    longitude: 31.2893,
  });
  const client = rankClient({
    branches: [CHERNIHIV_STORE_A, CHERNIHIV_STORE_B, ...decoyBranches(4)],
    addresses: [geocoded],
  });

  const result = await rankStores(client as never, { query: "Чернигов" });

  assert.equal(result.outcome, "ranked");
  assert.deepEqual(
    new Set(result.stores.map((entry) => entry.branch.branchId)),
    new Set([CHERNIHIV_STORE_A.branchId, CHERNIHIV_STORE_B.branchId]),
  );
  assert.deepEqual(result.resolvedPlaces, [geocoded]);
});

const KYIV_OBOLON_STORE = branch({
  branchId: "b-obolon",
  externalId: "7001",
  city: "Київ",
  address: "просп. Оболонський, 5",
  latitude: "50.5010",
  longitude: "30.4990",
});

const KYIV_POZNYAKY_STORE = branch({
  branchId: "b-poznyaky",
  externalId: "7002",
  city: "Київ",
  address: "вул. Григоренка Петра, 23",
  latitude: "50.4015",
  longitude: "30.6210",
});

test("rankStores: Позняки answers the nearby Kyiv store, resolved as a place rather than by matching a street", async () => {
  const geocoded = foundAddress({
    city: "Київ",
    street: "Позняки",
    houseNumber: null,
    district: "Дарницький",
    latitude: 50.4,
    longitude: 30.62,
  });
  const client = rankClient({ branches: [KYIV_POZNYAKY_STORE, ...decoyBranches(4)], addresses: [geocoded] });

  const result = await rankStores(client as never, { query: "Позняки" });

  assert.equal(result.outcome, "ranked");
  assert.equal(result.stores[0].branch.branchId, KYIV_POZNYAKY_STORE.branchId);
});

for (const query of [
  "Оболонь",
  "Сільпо на Оболонь",
  "магазин біля Оболонь",
  "Сильпо в районе Оболонь",
  "де найближчий Сільпо Оболонь",
]) {
  test(`rankStores: ${JSON.stringify(query)} resolves as a place and answers the same Obolon store as every other phrasing`, async () => {
    const geocoded = foundAddress({
      city: "Київ",
      street: "Оболонь",
      houseNumber: null,
      district: "Оболонський",
      latitude: 50.5,
      longitude: 30.5,
    });
    const client = rankClient({ branches: [KYIV_OBOLON_STORE, ...decoyBranches(4)], addresses: [geocoded] });

    const result = await rankStores(client as never, { query });

    assert.equal(result.outcome, "ranked");
    assert.equal(result.stores[0].branch.branchId, KYIV_OBOLON_STORE.branchId);
    assert.deepEqual(result.resolvedPlaces, [geocoded]);
  });
}

const SRC_DIR = fileURLToPath(new URL("../src/", import.meta.url));
const SETTLEMENT_TABLE_MIN_ENTRIES = 5;
const KEY_VALUE_ENTRY = /(["'])([^"'\n]+)\1\s*:\s*(["'])([^"'\n]+)\3/g;
const LOWERCASE_SPELLING = /^[a-zа-яёіїєґ][a-zа-яёіїєґ' -]*$/u;
const CAPITALIZED_PLACE_NAME = /^[А-ЯЁІЇЄҐ]/u;

function listSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);

    if (statSync(full).isDirectory()) return listSourceFiles(full);

    return entry.endsWith(".ts") ? [full] : [];
  });
}

function settlementLikeEntryCount(text: string): number {
  let count = 0;
  let match: RegExpExecArray | null;

  KEY_VALUE_ENTRY.lastIndex = 0;

  while ((match = KEY_VALUE_ENTRY.exec(text)) !== null) {
    const [, , key, , value] = match;

    if (LOWERCASE_SPELLING.test(key!) && CAPITALIZED_PLACE_NAME.test(value!)) count += 1;
  }

  return count;
}

test("no module under src/ holds a mapping from a settlement spelling to a settlement name", () => {
  for (const file of listSourceFiles(SRC_DIR)) {
    const count = settlementLikeEntryCount(readFileSync(file, "utf8"));

    assert.ok(
      count < SETTLEMENT_TABLE_MIN_ENTRIES,
      `${file} holds ${count} entries shaped like a settlement-spelling table`,
    );
  }
});

test("asking for self-pickup resolves against stores alone, never the saved addresses", async () => {
  const home = savedAddress({ tag: "Дім" });
  const store = branch({ branchId: "store-1", address: "вул. Гагаріна, 1" });
  const client = destinationClient({ saved: [home], branches: [store] });

  const resolution = await resolveDestination(client as never, "Гагаріна", "store");

  assert.deepEqual(resolution, { outcome: "resolved", candidate: { kind: "store", branch: store } });
  assert.deepEqual(client.calls, ["branches"]);
});

test("a store whose address abbreviates the street type is found when the caller spells it out", async () => {
  const store = branch({ branchId: "store-1", city: "Київ", address: "вул. Гагаріна, 1" });
  const client = destinationClient({
    branches: [store, ...decoyBranches(6)],
    addresses: [foundAddress({ city: "Київ", street: "вулиця Гагаріна", houseNumber: "1" })],
  });

  const resolution = await resolveDestination(client as never, "Київ, вулиця Гагаріна, 1", "store");

  assert.deepEqual(resolution, { outcome: "resolved", candidate: { kind: "store", branch: store } });
  assert.deepEqual(client.calls, ["branches", "address"]);
});

test("self-pickup matching no store at all resolves to none rather than to an address", async () => {
  const client = destinationClient({ addresses: [foundAddress()] });

  assert.deepEqual(await resolveDestination(client as never, "Хрещатик 1", "store"), { outcome: "none" });
});

test("a courier destination skips the store listing", async () => {
  const found = foundAddress();
  const store = branch({ branchId: "store-1", address: "вул. Гагаріна, 1" });
  const client = destinationClient({ branches: [store], addresses: [found] });

  const resolution = await resolveDestination(client as never, "Гагаріна", "courier");

  assert.deepEqual(resolution, { outcome: "resolved", candidate: { kind: "address", address: found } });
  assert.deepEqual(client.calls, ["saved", "address"]);
});

test("with no delivery type named, an address a store also stands on stays an address", async () => {
  const found = foundAddress({ city: "Київ", street: "вулиця Гагаріна", houseNumber: "1" });
  const store = branch({ branchId: "store-1", city: "Київ", address: "вул. Гагаріна, 1" });
  const client = destinationClient({ branches: [store, ...decoyBranches(6)], addresses: [found] });

  const resolution = await resolveDestination(client as never, "Київ, вулиця Гагаріна, 1");

  assert.deepEqual(resolution, { outcome: "resolved", candidate: { kind: "address", address: found } });
});

test("a uuid is recognised as a handle rather than a place", () => {
  assert.equal(looksLikeUuid("1edb733f-29f8-6dec-976c-0f7f0c3d0cd0"), true);
  assert.equal(looksLikeUuid("  1EDB733F-29F8-6DEC-976C-0F7F0C3D0CD0 "), true);
  assert.equal(looksLikeUuid("Дніпро, вул. Лазаря Глоби, 7"), false);
});

test("several geocoded spellings converging on one store are not an ambiguity about the store", async () => {
  const store = branch({ branchId: "store-1", city: "Київ", address: "вул. Гагаріна, 1" });
  const client = destinationClient({
    branches: [store, ...decoyBranches(6)],
    addresses: [
      foundAddress({ city: "Київ", street: "вулиця Гагаріна", houseNumber: null }),
      foundAddress({ city: "Київ", street: "вулиця Гагаріна", houseNumber: "1" }),
    ],
  });

  const resolution = await resolveDestination(client as never, "Сільпо Київ вулиця Гагаріна 1", "store");

  assert.deepEqual(resolution, { outcome: "resolved", candidate: { kind: "store", branch: store } });
});
