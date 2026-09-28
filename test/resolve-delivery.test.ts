import assert from "node:assert/strict";
import { test } from "node:test";

process.env.TZ = "Europe/Kyiv";

const { resolveCartDestination, selectSlot } = await import("../dist/resolve/delivery.js");

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

function settlement(overrides: Record<string, unknown> = {}) {
  return { id: "s-1", title: "Ірпінь", area: "Київська", region: "Ірпінська", ...overrides };
}

function office(overrides: Record<string, unknown> = {}) {
  return {
    id: "o-1",
    title: "Відділення №1: вул. Соборна, 1",
    address: "вул. Соборна, 1",
    type: "Branch",
    number: 1,
    status: "Working",
    latitude: 50.5,
    longitude: 30.5,
    ...overrides,
  };
}

function deliveryOption(overrides: Record<string, unknown> = {}) {
  return {
    deliveryType: "DeliveryHome",
    branchId: "h-1",
    description: "Regular delivery (groceries, fresh products)",
    ...overrides,
  };
}

function availableSlot(overrides: Record<string, unknown> = {}) {
  return { start: "2026-08-17T06:00:00+00:00", end: "2026-08-17T06:30:00+00:00", available: true, ...overrides };
}

type ClientOptions = {
  saved?: unknown[];
  branches?: unknown[];
  npBranches?: unknown[];
  addresses?: unknown[];
  deliveryOptions?: unknown[];
  settlements?: unknown[];
  offices?: unknown[];
  slots?: unknown[];
  slotsByBranch?: Record<string, unknown[]>;
};

function client(options: ClientOptions = {}) {
  const calls: { tool: string; args: Record<string, unknown> }[] = [];

  return {
    calls,
    async getMyDeliveryAddresses() {
      calls.push({ tool: "saved", args: {} });

      return { content: "", structured: { success: true, summary: "", addresses: options.saved ?? [] } };
    },
    async listBranches(args: Record<string, unknown>) {
      calls.push({ tool: "branches", args });
      const branches = args.hasNP === true ? (options.npBranches ?? []) : (options.branches ?? []);

      return {
        content: "",
        structured: {
          success: true,
          summary: "",
          branches,
          meta: { limit: 500, offset: 0, total: branches.length },
        },
      };
    },
    async findAddress() {
      calls.push({ tool: "address", args: {} });

      return { content: "", structured: { success: true, summary: "", addresses: options.addresses ?? [] } };
    },
    async getAvailableDeliveryTypes(args: Record<string, unknown>) {
      calls.push({ tool: "types", args });

      return { content: "", structured: { success: true, summary: "", options: options.deliveryOptions ?? [] } };
    },
    async findNovaPoshtaSettlements(args: Record<string, unknown>) {
      calls.push({ tool: "settlements", args });

      return { content: "", structured: { success: true, summary: "", settlements: options.settlements ?? [] } };
    },
    async findNovaPoshtaOffices(args: Record<string, unknown>) {
      calls.push({ tool: "offices", args });
      const offices = options.offices ?? [];

      return { content: "", structured: { success: true, summary: "", offices, meta: { total: offices.length } } };
    },
    async getTimeSlots(args: Record<string, unknown>) {
      calls.push({ tool: "slots", args });
      const branchId = args.branchId as string;
      const slots = options.slotsByBranch?.[branchId] ?? options.slots ?? [];

      return { content: "", structured: { success: true, summary: "", slots, meta: { total: slots.length } } };
    },
  };
}

test("a store destination resolves to self pickup without asking about a delivery type", async () => {
  const store = branch({ branchId: "store-1", companyId: "co-1", address: "вул. Гагаріна, 1" });
  const c = client({ branches: [store] });

  const resolution = await resolveCartDestination(c as never, "Гагаріна");

  assert.deepEqual(resolution, {
    outcome: "resolved",
    destination: {
      deliveryType: "SelfPickup",
      shipment: { companyId: "co-1", branchId: "store-1" },
      address: {
        addressType: "self-pickup",
        latitude: "50.52022",
        longitude: "30.51452",
        city: "Київ",
        street: "вул. Гагаріна, 1",
      },
    },
  });
  assert.deepEqual(
    c.calls.map((call) => call.tool),
    ["saved", "branches"],
  );
});

test("a courier destination prefers DeliveryHome among several delivery types that serve it", async () => {
  const home = savedAddress({ tag: "Дім" });
  const options = [
    deliveryOption({ deliveryType: "WideAssortDelivery", branchId: "w-1" }),
    deliveryOption({ deliveryType: "DeliveryHome", branchId: "h-1" }),
    deliveryOption({ deliveryType: "B2B", branchId: "b2b-1" }),
    deliveryOption({ deliveryType: "SelfPickup", branchId: null }),
    deliveryOption({ deliveryType: "NovaPoshta", branchId: null }),
  ];
  const supplyingBranch = branch({ branchId: "h-1", companyId: "co-2" });
  const c = client({
    saved: [home],
    deliveryOptions: options,
    branches: [supplyingBranch],
    slotsByBranch: { "w-1": [availableSlot()], "h-1": [availableSlot()], "b2b-1": [availableSlot()] },
  });

  const resolution = await resolveCartDestination(c as never, "дім");

  assert.equal(resolution.outcome, "resolved");
  assert.equal(resolution.destination.deliveryType, "DeliveryHome");
  assert.deepEqual(resolution.destination.shipment, { companyId: "co-2", branchId: "h-1" });
  assert.equal(resolution.destination.address.addressType, "house");
});

test("courier types with no rule to separate them are printed and the resolution stops", async () => {
  const home = savedAddress({ tag: "Дім" });
  const options = [
    deliveryOption({ deliveryType: "WideAssortDelivery", branchId: "w-1" }),
    deliveryOption({ deliveryType: "B2B", branchId: "b2b-1" }),
  ];
  const c = client({
    saved: [home],
    deliveryOptions: options,
    slotsByBranch: { "w-1": [availableSlot()], "b2b-1": [availableSlot()] },
  });

  const resolution = await resolveCartDestination(c as never, "дім");

  assert.equal(resolution.outcome, "ambiguous");
  assert.ok(resolution.text.startsWith("Found 2 matching delivery types"), resolution.text);
});

test("the preferred type having no slot fails naming it and the alternative, rather than silently switching kinds", async () => {
  const home = savedAddress({ tag: "Дім" });
  const options = [
    deliveryOption({ deliveryType: "DeliveryHome", branchId: "h-1" }),
    deliveryOption({ deliveryType: "B2B", branchId: "b2b-1" }),
  ];
  const supplyingBranch = branch({ branchId: "b2b-1", companyId: "co-2" });
  const c = client({
    saved: [home],
    deliveryOptions: options,
    branches: [supplyingBranch],
    slotsByBranch: { "h-1": [], "b2b-1": [availableSlot()] },
  });
  const when = { kind: "day" as const, date: Temporal.PlainDate.from("2026-08-17") };

  await assert.rejects(
    () => resolveCartDestination(c as never, "дім", when),
    /DeliveryHome.*no available time slot.*2026-08-17.*B2B/,
  );
});

test("a caller-named delivery type is taken directly, without the preference ever being probed", async () => {
  const home = savedAddress({ tag: "Дім" });
  const options = [
    deliveryOption({ deliveryType: "DeliveryHome", branchId: "h-1" }),
    deliveryOption({ deliveryType: "B2B", branchId: "b2b-1" }),
  ];
  const supplyingBranch = branch({ branchId: "b2b-1", companyId: "co-2" });
  const c = client({
    saved: [home],
    deliveryOptions: options,
    branches: [supplyingBranch],
    slotsByBranch: { "h-1": [], "b2b-1": [availableSlot()] },
  });

  const resolution = await resolveCartDestination(c as never, "дім", undefined, "B2B");

  assert.equal(resolution.outcome, "resolved");
  assert.equal(resolution.destination.deliveryType, "B2B");
  assert.deepEqual(resolution.destination.shipment, { companyId: "co-2", branchId: "b2b-1" });
  assert.equal(resolution.destination.address.addressType, "house");
  assert.deepEqual(
    c.calls.filter((call) => call.tool === "slots"),
    [],
    "a named delivery type still probed a slot during resolution, which the caller's later selectSlot call also does",
  );
});

test("a caller-named delivery type absent from what the server returned fails saying it does not serve the destination", async () => {
  const home = savedAddress({ tag: "Дім" });
  const options = [deliveryOption({ deliveryType: "DeliveryHome", branchId: "h-1" })];
  const c = client({ saved: [home], deliveryOptions: options });

  await assert.rejects(
    () => resolveCartDestination(c as never, "дім", undefined, "B2B"),
    /B2B does not serve this destination/,
  );
});

test("a caller-named delivery type that serves the destination but carries no slot fails at the slot step, not by falling back", async () => {
  const home = savedAddress({ tag: "Дім" });
  const options = [
    deliveryOption({ deliveryType: "DeliveryHome", branchId: "h-1" }),
    deliveryOption({ deliveryType: "B2B", branchId: "b2b-1" }),
  ];
  const supplyingBranch = branch({ branchId: "b2b-1", companyId: "co-2" });
  const c = client({
    saved: [home],
    deliveryOptions: options,
    branches: [supplyingBranch],
    slotsByBranch: { "h-1": [availableSlot()], "b2b-1": [] },
  });
  const when = { kind: "day" as const, date: Temporal.PlainDate.from("2026-08-17") };

  const resolution = await resolveCartDestination(c as never, "дім", when, "B2B");

  assert.equal(resolution.outcome, "resolved");
  assert.equal(resolution.destination.deliveryType, "B2B");

  await assert.rejects(
    () => selectSlot(c as never, resolution.destination.shipment.branchId, resolution.destination.deliveryType, when),
    /b2b-1.*B2B.*2026-08-17/,
  );
});

test("a store destination overridden with a delivery type other than SelfPickup fails saying it does not serve the destination", async () => {
  const store = branch({ branchId: "store-1", companyId: "co-1", address: "вул. Гагаріна, 1" });
  const c = client({ branches: [store] });

  await assert.rejects(
    () => resolveCartDestination(c as never, "Гагаріна", undefined, "DeliveryHome"),
    /DeliveryHome does not serve this destination/,
  );
});

test("a resolution never writes a delivery type other than the one the preference chose while it served the point", async () => {
  const home = savedAddress({ tag: "Дім" });
  const options = [
    deliveryOption({ deliveryType: "DeliveryHome", branchId: "h-1" }),
    deliveryOption({ deliveryType: "B2B", branchId: "b2b-1" }),
    deliveryOption({ deliveryType: "WideAssortDelivery", branchId: "w-1" }),
  ];
  const supplyingBranch = branch({ branchId: "b2b-1", companyId: "co-2" });
  const otherBranch = branch({ branchId: "w-1", companyId: "co-3" });
  const c = client({
    saved: [home],
    deliveryOptions: options,
    branches: [supplyingBranch, otherBranch],
    slotsByBranch: { "h-1": [], "b2b-1": [availableSlot()], "w-1": [availableSlot()] },
  });

  let resolution: Awaited<ReturnType<typeof resolveCartDestination>> | undefined;
  let caught: unknown;

  try {
    resolution = await resolveCartDestination(c as never, "дім");
  } catch (error) {
    caught = error;
  }

  if (resolution !== undefined && resolution.outcome === "resolved") {
    assert.equal(resolution.destination.deliveryType, "DeliveryHome");
  } else {
    assert.ok(caught instanceof Error, "expected either a DeliveryHome resolution or a thrown error");
  }
});

test("no branch serving the destination has a slot fails naming the day, not one store", async () => {
  const home = savedAddress({ tag: "Дім" });
  const options = [
    deliveryOption({ deliveryType: "DeliveryHome", branchId: "h-1" }),
    deliveryOption({ deliveryType: "B2B", branchId: "b2b-1" }),
  ];
  const c = client({
    saved: [home],
    deliveryOptions: options,
    slotsByBranch: { "h-1": [], "b2b-1": [] },
  });

  await assert.rejects(
    () => resolveCartDestination(c as never, "дім"),
    /no branch serving this destination has an available slot for DeliveryHome, B2B/,
  );
});

test("a point no delivery type serves resolves to none rather than a guess", async () => {
  const home = savedAddress({ tag: "Дім" });
  const options = [deliveryOption({ deliveryType: "SelfPickup", branchId: null })];
  const c = client({ saved: [home], deliveryOptions: options });

  assert.deepEqual(await resolveCartDestination(c as never, "дім"), { outcome: "none" });
});

test("an ambiguous place is printed and stops before any delivery type is looked up", async () => {
  const first = savedAddress({ id: "a", tag: "Дім" });
  const second = savedAddress({ id: "b", tag: "Дім друга" });
  const c = client({ saved: [first, second] });

  const resolution = await resolveCartDestination(c as never, "дім");

  assert.equal(resolution.outcome, "ambiguous");
  assert.ok(resolution.text.startsWith("Found 2 matching places"), resolution.text);
  assert.deepEqual(
    c.calls.map((call) => call.tool),
    ["saved"],
  );
});

test("a cart destination that geocodes to several candidates stops without writing", async () => {
  const first = {
    address: null,
    city: "Київ",
    street: "вулиця Хрещатик",
    houseNumber: "1",
    district: null,
    latitude: 50.4,
    longitude: 30.5,
  };
  const second = {
    address: null,
    city: "Київ",
    street: "вулиця Хрещатик",
    houseNumber: "2",
    district: null,
    latitude: 50.41,
    longitude: 30.51,
  };
  const c = client({ addresses: [first, second] });

  const resolution = await resolveCartDestination(c as never, "Хрещатик невідомий");

  assert.equal(resolution.outcome, "ambiguous");
  assert.ok(resolution.text.startsWith("Found 2 matching places"), resolution.text);
  assert.deepEqual(
    c.calls.map((call) => call.tool),
    ["saved", "branches", "address"],
  );
});

test("with no address match the destination falls through to a Nova Poshta office", async () => {
  const found = settlement();
  const single = office();
  const npBranch = branch({ branchId: "np-1", companyId: "co-np" });
  const c = client({ settlements: [found], offices: [single], npBranches: [npBranch] });

  const resolution = await resolveCartDestination(c as never, "Ірпінь, Соборна");

  assert.equal(resolution.outcome, "resolved");
  assert.equal(resolution.destination.deliveryType, "NovaPoshta");
  assert.deepEqual(resolution.destination.shipment, { companyId: "co-np", branchId: "np-1" });
  assert.equal(resolution.destination.address.addressType, "nova-poshta");
  assert.equal(resolution.destination.address.officeId, single.id);
  assert.equal(resolution.destination.address.latitude, String(single.latitude));

  const officesCall = c.calls.find((call) => call.tool === "offices");

  assert.deepEqual(officesCall?.args, { settlementId: found.id, title: "Соборна" });
});

test("a destination with no comma is tried whole as a Nova Poshta settlement", async () => {
  const found = settlement();
  const single = office();
  const npBranch = branch({ branchId: "np-1", companyId: "co-np" });
  const c = client({ settlements: [found], offices: [single], npBranches: [npBranch] });

  const resolution = await resolveCartDestination(c as never, "Ірпінь");

  assert.equal(resolution.outcome, "resolved");

  const settlementsCall = c.calls.find((call) => call.tool === "settlements");

  assert.deepEqual(settlementsCall?.args, { title: "Ірпінь" });
});

test("an office matching more than one candidate is printed and the resolution stops", async () => {
  const found = settlement();
  const first = office({ id: "o-1" });
  const second = office({ id: "o-2" });
  const c = client({ settlements: [found], offices: [first, second] });

  const resolution = await resolveCartDestination(c as never, "Ірпінь, Соборна");

  assert.equal(resolution.outcome, "ambiguous");
  assert.ok(resolution.text.startsWith("Found 2 matching offices"), resolution.text);
});

test("of two matching settlements, the one whose title matches the query verbatim is taken", async () => {
  const exact = settlement({ id: "s-1", title: "Ірпінь" });
  const near = settlement({ id: "s-2", title: "Ірпінське" });
  const single = office();
  const npBranch = branch({ branchId: "np-1", companyId: "co-np" });
  const c = client({ settlements: [exact, near], offices: [single], npBranches: [npBranch] });

  const resolution = await resolveCartDestination(c as never, "Ірпінь, Соборна");

  assert.equal(resolution.outcome, "resolved");

  const officesCall = c.calls.find((call) => call.tool === "offices");

  assert.deepEqual(officesCall?.args, { settlementId: exact.id, title: "Соборна" });
});

test("of two matching offices, the one whose title matches the office text verbatim is taken", async () => {
  const found = settlement();
  const exact = office({ id: "o-1", title: "Відділення №1: вул. Соборна, 1" });
  const near = office({ id: "o-2", title: "Відділення №1: вул. Соборна, 1а" });
  const npBranch = branch({ branchId: "np-1", companyId: "co-np" });
  const c = client({ settlements: [found], offices: [exact, near], npBranches: [npBranch] });

  const resolution = await resolveCartDestination(c as never, "Ірпінь, Відділення №1: вул. Соборна, 1");

  assert.equal(resolution.outcome, "resolved");
  assert.equal(resolution.destination.address.officeId, exact.id);
});

test("nothing matching a place or a Nova Poshta settlement resolves to none", async () => {
  const c = client({});

  assert.deepEqual(await resolveCartDestination(c as never, "нікуди"), { outcome: "none" });
});

test("no branch serving Nova Poshta near the office fails rather than resolving without one", async () => {
  const found = settlement();
  const single = office();
  const c = client({ settlements: [found], offices: [single] });

  await assert.rejects(() => resolveCartDestination(c as never, "Ірпінь, Соборна"), /Nova Poshta/);
});

test("selectSlot takes the first available slot when no day or instant is named", async () => {
  const slots = [
    { start: "2026-08-17T06:00:00+00:00", end: "2026-08-17T06:30:00+00:00", available: false },
    { start: "2026-08-17T06:30:00+00:00", end: "2026-08-17T07:00:00+00:00", available: true },
  ];
  const c = client({ slots });

  const slot = await selectSlot(c as never, "branch-1", "SelfPickup", undefined);

  assert.deepEqual(slot, { start: "2026-08-17T06:30:00+00:00", end: "2026-08-17T07:00:00+00:00" });

  const call = c.calls.find((one) => one.tool === "slots");

  assert.deepEqual(call?.args, { branchId: "branch-1", deliveryTypes: ["SelfPickup"] });
});

test("selectSlot on a named day takes the earliest available slot that day", async () => {
  const slots = [
    { start: "2026-08-18T09:00:00+00:00", end: "2026-08-18T09:30:00+00:00", available: true },
    { start: "2026-08-17T08:00:00+00:00", end: "2026-08-17T08:30:00+00:00", available: false },
    { start: "2026-08-17T09:00:00+00:00", end: "2026-08-17T09:30:00+00:00", available: true },
  ];
  const c = client({ slots });

  const slot = await selectSlot(c as never, "branch-1", "SelfPickup", {
    kind: "day",
    date: Temporal.PlainDate.from("2026-08-17"),
  });

  assert.deepEqual(slot, { start: "2026-08-17T09:00:00+00:00", end: "2026-08-17T09:30:00+00:00" });
});

test("no slot on the named day fails naming the day and the branch, not silently booking another", async () => {
  const slots = [{ start: "2026-08-18T09:00:00+00:00", end: "2026-08-18T09:30:00+00:00", available: true }];
  const c = client({ slots });

  await assert.rejects(
    () =>
      selectSlot(c as never, "branch-1", "SelfPickup", {
        kind: "day",
        date: Temporal.PlainDate.from("2026-08-17"),
      }),
    /branch-1.*SelfPickup.*2026-08-17/,
  );
});

test("a date and a wall clock time takes the slot the branch offers for that time", async () => {
  const slots = [
    { start: "2026-08-17T06:00:00+00:00", end: "2026-08-17T06:30:00+00:00", available: true },
    { start: "2026-08-17T06:30:00+00:00", end: "2026-08-17T07:00:00+00:00", available: true },
  ];
  const c = client({ slots });

  const slot = await selectSlot(c as never, "branch-1", "SelfPickup", {
    kind: "instant",
    instant: Temporal.Instant.from("2026-08-17T06:45:00+00:00"),
  });

  assert.deepEqual(slot, { start: "2026-08-17T06:30:00+00:00", end: "2026-08-17T07:00:00+00:00" });
});

test("an instant matching no slot window fails rather than picking the nearest one", async () => {
  const slots = [{ start: "2026-08-17T06:00:00+00:00", end: "2026-08-17T06:30:00+00:00", available: true }];
  const c = client({ slots });

  await assert.rejects(() =>
    selectSlot(c as never, "branch-1", "SelfPickup", {
      kind: "instant",
      instant: Temporal.Instant.from("2026-08-17T09:00:00+00:00"),
    }),
  );
});

test("an unavailable slot at the named time is not taken", async () => {
  const slots = [{ start: "2026-08-17T06:00:00+00:00", end: "2026-08-17T06:30:00+00:00", available: false }];
  const c = client({ slots });

  await assert.rejects(() =>
    selectSlot(c as never, "branch-1", "SelfPickup", {
      kind: "instant",
      instant: Temporal.Instant.from("2026-08-17T06:10:00+00:00"),
    }),
  );
});
