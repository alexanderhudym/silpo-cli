import assert from "node:assert/strict";
import { test } from "node:test";

const { Cart, cartShipment } = await import("../dist/daemon/cart.js");

const CART = "6156c5c8-cb19-4f23-ad3c-ba981698b91f";
const NEXT = "7156c5c8-cb19-4f23-ad3c-ba981698b91f";
const BRANCH = "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468";
const COMPANY = "1ec88c5d-a050-669c-8467-570a157f3e31";

const PAST = { start: "2020-01-01T09:00:00+00:00", end: "2020-01-01T09:30:00+00:00" };
const FUTURE = { start: "2099-01-01T09:00:00+00:00", end: "2099-01-01T09:30:00+00:00" };
const OFFERED = { start: "2099-06-01T09:00:00+00:00", end: "2099-06-01T09:30:00+00:00" };

const FULL_ADDRESS = {
  addressType: "house",
  latitude: "50.4",
  longitude: "30.5",
  city: "Київ",
  street: "просп. Володимира Івасюка",
  house: "46",
  region: null,
};

const SPARSE_ADDRESS = { addressType: "self-pickup", latitude: "50.4", longitude: "30.5" };

const BAD_SLOT = { level: "error", type: "timeslot", message: "timeslot.not_found", context: [] };

const HAS_CART = { success: true, shoppingCartId: CART, exists: true };
const HAS_NEXT = { success: true, shoppingCartId: NEXT, exists: true };
const NO_CART = { success: true, shoppingCartId: null, exists: false };

type Timeslot = { start: string; end: string };

type CartShape = {
  id?: string;
  timeslot?: Timeslot;
  address?: Record<string, unknown>;
  validations?: Record<string, unknown>[];
};

function cart({
  id = CART,
  timeslot = FUTURE,
  address = FULL_ADDRESS,
  validations = [],
}: CartShape) {
  return {
    success: true,
    cart: {
      id,
      deliveryType: "SelfPickup",
      timeslot,
      address,
      shipments: [{ id: "s1", companyId: COMPANY, branchId: BRANCH, products: [] }],
      calculation: { validations },
    },
    loyalty: null,
    checkoutWebLink: "https://silpo.ua/checkout",
  };
}

type Call = { tool: string; args: Record<string, unknown> };

type Answers = {
  ids?: Record<string, unknown>[];
  carts?: Record<string, unknown>[];
  slots?: { start: string; end: string; available: boolean }[];
  slotRounds?: { start: string; end: string; available: boolean }[][];
  refuseWrite?: string;
  refuseTimes?: number;
};

function next<T>(queue: T[]): T {
  return queue.length > 1 ? (queue.shift() as T) : (queue[0] as T);
}

function session(answers: Answers) {
  const calls: Call[] = [];
  const carts = [...(answers.carts ?? [cart({})])];
  const ids = [...(answers.ids ?? [HAS_CART])];
  const record = (tool: string, args: Record<string, unknown>) => calls.push({ tool, args });
  const written = { success: true, summary: "written", products: [], added: [], removed: [] };
  const rounds = [...(answers.slotRounds ?? [answers.slots ?? [{ ...OFFERED, available: true }]])];
  let refusals = answers.refuseTimes ?? Number.POSITIVE_INFINITY;

  return {
    calls,
    async getMyShoppingCart() {
      record("getMyShoppingCart", {});

      return { content: "", structured: next(ids) };
    },
    async getShoppingCartById(args: Record<string, unknown>) {
      record("getShoppingCartById", args);

      return { content: "", structured: next(carts) };
    },
    async getTimeSlots(args: Record<string, unknown>) {
      record("getTimeSlots", args);

      return {
        content: "",
        structured: {
          slots: next(rounds).map((slot) => ({ ...slot, deliveryType: "SelfPickup" })),
        },
      };
    },
    async updateShoppingCart(args: Record<string, unknown>) {
      record("updateShoppingCart", args);

      if (answers.refuseWrite !== undefined && refusals > 0) {
        refusals -= 1;

        throw new Error(answers.refuseWrite);
      }

      return { content: "", structured: written };
    },
    async addOrUpdateCartProducts(args: Record<string, unknown>) {
      record("addOrUpdateCartProducts", args);

      return { content: "", structured: written };
    },
    async createShoppingCart(args: Record<string, unknown>) {
      record("createShoppingCart", args);

      return {
        content: "",
        structured: { success: true, summary: "Shopping cart created", shoppingCartId: NEXT },
      };
    },
  };
}

type Stub = ReturnType<typeof session>;

const made = (stub: Stub) => stub.calls.map(({ tool }) => tool);
const open = (stub: Stub) => new Cart(stub as never);
const wrote = (stub: Stub, tool: string) => stub.calls.find((call) => call.tool === tool);

const READ = "getShoppingCartById";
const MINE = "getMyShoppingCart";
const SLOTS = "getTimeSlots";
const WRITE = "updateShoppingCart";
const CREATE = "createShoppingCart";
const ADD = "addOrUpdateCartProducts";

const PRODUCT = { productId: "p", companyId: COMPANY, branchId: BRANCH, quantity: 1 };

const ELSEWHERE = "1ee15e2a-7c41-6b83-9d52-4b7d0e93c999";

const writes = (stub: Stub) => stub.calls.filter(({ tool }) => tool === WRITE);

test("nothing is read until something asks for the cart", async () => {
  const stub = session({});

  open(stub);

  assert.deepEqual(made(stub), [], "the cart was fetched before anyone wanted it");
});

test("the first read resolves the cart and reads it once", async () => {
  const stub = session({});
  const cart_ = open(stub);

  assert.equal((await cart_.current()).cart.id, CART);
  assert.deepEqual(made(stub), [MINE, READ]);
});

test("the state carries the cart without the shapes the tool wrapped it in", async () => {
  const held = await open(session({})).current();

  assert.deepEqual(Object.keys(held), ["cart", "loyalty", "checkoutWebLink"]);
  assert.ok(!("success" in held), "the transport's success field reached the state");
});

test("every read confirms the id and reads the cart behind it", async () => {
  const stub = session({});
  const cart_ = open(stub);

  const first = await cart_.current();
  const second = await cart_.current();

  assert.deepEqual(made(stub), [MINE, READ, MINE, READ], "a read was served from a stale snapshot");
  assert.deepEqual(first, second);
});

test("a cart edited elsewhere is seen on the very next read", async () => {
  const stub = session({ carts: [cart({}), cart({ timeslot: OFFERED })] });
  const cart_ = open(stub);

  assert.deepEqual((await cart_.current()).cart.timeslot, FUTURE);
  assert.deepEqual(
    (await cart_.current()).cart.timeslot,
    OFFERED,
    "a change made by another client stayed invisible",
  );
});

test("a cart replaced on the server is read afresh", async () => {
  const stub = session({ ids: [HAS_CART, HAS_NEXT], carts: [cart({}), cart({ id: NEXT })] });
  const cart_ = open(stub);

  assert.equal((await cart_.current()).cart.id, CART);
  assert.equal((await cart_.current()).cart.id, NEXT);
  assert.deepEqual(made(stub), [MINE, READ, MINE, READ]);
});

test("a read with no cart says so plainly and creates nothing", async () => {
  const stub = session({ ids: [NO_CART] });

  await assert.rejects(() => open(stub).current(), /no shopping cart/);
  assert.deepEqual(made(stub), [MINE], "something was fetched beyond the question that was asked");
});

test("a cart that goes away is opened again on the settings it had", async () => {
  const stub = session({ ids: [HAS_CART, NO_CART], carts: [cart({}), cart({ id: NEXT })] });
  const cart_ = open(stub);

  await cart_.current();

  assert.equal((await cart_.current()).cart.id, NEXT);
  assert.deepEqual(wrote(stub, CREATE)?.args, {
    addressType: "house",
    latitude: 50.4,
    longitude: 30.5,
    deliveryType: "SelfPickup",
    timeslot: FUTURE,
    branchId: BRANCH,
    city: "Київ",
    street: "просп. Володимира Івасюка",
    house: "46",
  });
});

test("a cart that goes away with a lapsed slot is opened on an available one", async () => {
  const stub = session({
    ids: [HAS_CART, NO_CART],
    carts: [cart({ timeslot: PAST }), cart({ timeslot: OFFERED }), cart({ id: NEXT })],
  });
  const cart_ = open(stub);

  await cart_.current();
  await cart_.current();

  assert.deepEqual(wrote(stub, CREATE)?.args.timeslot, OFFERED);
});

test("a cart the process never held is not opened on settings it does not have", async () => {
  const stub = session({ ids: [NO_CART] });

  await assert.rejects(() => open(stub).current(), /no shopping cart/);
  assert.ok(!made(stub).includes(CREATE), "a cart was invented out of nothing");
});

test("an absent cart is not remembered as absent", async () => {
  const stub = session({ ids: [NO_CART, HAS_CART] });
  const cart_ = open(stub);

  await assert.rejects(() => cart_.current(), /no shopping cart/);

  assert.equal((await cart_.current()).cart.id, CART, "the cart made elsewhere stayed invisible");
});

test("a slot that ended in the past is repaired on the first read", async () => {
  const stub = session({ carts: [cart({ timeslot: PAST }), cart({ timeslot: OFFERED })] });
  const held = await open(stub).current();

  assert.deepEqual(made(stub), [MINE, READ, SLOTS, WRITE, READ]);
  assert.deepEqual(held.cart.timeslot, OFFERED);
});

test("a cart the server flags as unusable is repaired the same way", async () => {
  const stub = session({ carts: [cart({ validations: [BAD_SLOT] }), cart({ timeslot: OFFERED })] });
  const held = await open(stub).current();

  assert.deepEqual(made(stub), [MINE, READ, SLOTS, WRITE, READ]);
  assert.deepEqual(held.cart.timeslot, OFFERED);
});

test("a usable slot is left alone, and no slot listing is read", async () => {
  const stub = session({});

  await open(stub).current();

  assert.ok(!made(stub).includes(SLOTS), "a healthy slot sent the CLI for the listing");
  assert.ok(!made(stub).includes(WRITE), "a healthy cart was written");
});

test("a slot that cannot be replaced leaves the cart standing and still serves the read", async () => {
  const stub = session({
    carts: [cart({ timeslot: PAST })],
    slots: [{ ...OFFERED, available: false }],
  });
  const held = await open(stub).current();

  assert.ok(!made(stub).includes(WRITE), "the cart was written anyway");
  assert.deepEqual(held.cart.timeslot, PAST, "the slot was changed regardless");
});

test("a write onto a cart whose slot cannot be booked is refused before it is sent", async () => {
  const stub = session({
    carts: [cart({ timeslot: PAST })],
    slots: [{ ...OFFERED, available: false }],
  });

  await assert.rejects(() => open(stub).addProducts([PRODUCT]), /cannot be booked/);
  assert.ok(!made(stub).includes(ADD), "the write went out anyway");
});

test("a cart with no shipment is served, and naming its branch is what fails", async () => {
  const bare = cart({});
  (bare.cart as unknown as { shipments: unknown[] }).shipments = [];

  const held = await open(session({ carts: [bare] })).current();

  assert.throws(() => cartShipment(held.cart), /names no branch/);
});

test("a repair sends the stored address back field for field, however full it is", async () => {
  for (const address of [FULL_ADDRESS, SPARSE_ADDRESS]) {
    const stub = session({
      carts: [cart({ timeslot: PAST, address }), cart({ timeslot: OFFERED, address })],
    });

    await open(stub).current();

    const write = wrote(stub, WRITE);

    assert.deepEqual(write?.args.address, address, "the address was rebuilt rather than echoed");
    assert.deepEqual(write?.args.shipments, [{ companyId: COMPANY, branchId: BRANCH }]);
  }
});

test("a reduced line keeps the comment it was added with", async () => {
  const stub = session({});

  await open(stub).addProducts([{ ...PRODUCT, quantity: 2, comment: "без кістки" }]);

  const write = wrote(stub, ADD);

  assert.deepEqual((write?.args.products as Record<string, unknown>[])[0]?.comment, "без кістки");
});

test("adding products validates, writes, and reads the cart back", async () => {
  const stub = session({});
  const cart_ = open(stub);

  const { confirmed, state } = await cart_.addProducts([PRODUCT]);

  assert.deepEqual(made(stub), [MINE, READ, ADD, READ]);
  assert.equal(confirmed.summary, "written");
  assert.equal(state.cart.id, CART);
  assert.deepEqual(await cart_.current(), state, "the cart read behind the write is not the cart a later read gives");
});

test("the cart read behind a write carries a repair when the server flags the slot", async () => {
  const stub = session({
    carts: [cart({}), cart({ validations: [BAD_SLOT] }), cart({ timeslot: OFFERED })],
  });

  const { state } = await open(stub).addProducts([PRODUCT]);

  assert.deepEqual(made(stub), [MINE, READ, ADD, READ, SLOTS, WRITE, READ]);
  assert.deepEqual(state.cart.timeslot, OFFERED);
});

test("setting up an existing cart sends its own settings for everything not given", async () => {
  const stub = session({});

  const { confirmed } = await open(stub).setup({ promoCode: "SPRING" });

  const write = wrote(stub, WRITE);

  assert.equal(confirmed.opened, false, "an existing cart was reported as newly opened");
  assert.equal(write?.args.promoCode, "SPRING");
  assert.equal(write?.args.deliveryType, "SelfPickup");
  assert.deepEqual(write?.args.timeslot, FUTURE);
  assert.deepEqual(write?.args.address, FULL_ADDRESS);
  assert.deepEqual(write?.args.shipments, [{ companyId: COMPANY, branchId: BRANCH }]);
});

test("setting up when the account has none opens a cart from what the caller named", async () => {
  const stub = session({ ids: [NO_CART], carts: [cart({ id: NEXT })] });

  const { confirmed, state } = await open(stub).setup({
    deliveryType: "SelfPickup",
    timeslot: OFFERED,
    address: SPARSE_ADDRESS as never,
    branchId: BRANCH,
  });

  assert.equal(confirmed.opened, true);
  assert.equal(state.cart.id, NEXT, "the opened cart was not the one that came back");
  assert.deepEqual(wrote(stub, CREATE)?.args, {
    addressType: "self-pickup",
    latitude: 50.4,
    longitude: 30.5,
    deliveryType: "SelfPickup",
    timeslot: OFFERED,
    branchId: BRANCH,
  });
});

test("an opening address travels with every part of it the caller gave", async () => {
  const stub = session({ ids: [NO_CART], carts: [cart({ id: NEXT })] });

  await open(stub).setup({
    deliveryType: "DeliveryHome",
    timeslot: OFFERED,
    address: { ...FULL_ADDRESS, district: "Паланка" } as never,
    branchId: BRANCH,
  });

  const created = wrote(stub, CREATE);

  assert.equal(created?.args.city, "Київ");
  assert.equal(created?.args.street, "просп. Володимира Івасюка");
  assert.equal(created?.args.house, "46");
  assert.equal(created?.args.district, "Паланка");
  assert.ok(!("region" in (created?.args ?? {})), "a field the call does not take was sent");
});

test("an opening address with no type is typed after the delivery type", async () => {
  for (const [deliveryType, addressType] of [
    ["SelfPickup", "self-pickup"],
    ["NovaPoshta", "nova-poshta"],
    ["DeliveryHome", "house"],
  ]) {
    const stub = session({ ids: [NO_CART], carts: [cart({ id: NEXT })] });

    await open(stub).setup({
      deliveryType,
      timeslot: OFFERED,
      address: { latitude: "50.4", longitude: "30.5" } as never,
      branchId: BRANCH,
    });

    assert.equal(wrote(stub, CREATE)?.args.addressType, addressType);
  }
});

test("opening a cart names the one thing the caller left out", async () => {
  const opening = {
    deliveryType: "SelfPickup",
    timeslot: OFFERED,
    address: SPARSE_ADDRESS as never,
    branchId: BRANCH,
  };
  const missing: [string, RegExp][] = [
    ["deliveryType", /needs a delivery type/],
    ["timeslot", /needs a time slot/],
    ["address", /needs an address/],
    ["branchId", /needs a branch/],
  ];

  for (const [field, reason] of missing) {
    const stub = session({ ids: [NO_CART] });
    const change: Record<string, unknown> = { ...opening };
    delete change[field];

    await assert.rejects(() => open(stub).setup(change), reason);
    assert.ok(!made(stub).includes(CREATE), `a cart was opened without ${field}`);
  }
});

test("an opening branch may be named through the shipments instead", async () => {
  const stub = session({ ids: [NO_CART], carts: [cart({ id: NEXT })] });

  await open(stub).setup({
    deliveryType: "SelfPickup",
    timeslot: OFFERED,
    address: SPARSE_ADDRESS as never,
    shipments: [{ companyId: COMPANY, branchId: BRANCH }],
  });

  assert.equal(wrote(stub, CREATE)?.args.branchId, BRANCH);
});

test("an address without coordinates cannot open a cart", async () => {
  const stub = session({ ids: [NO_CART] });

  await assert.rejects(
    () =>
      open(stub).setup({
        deliveryType: "SelfPickup",
        timeslot: OFFERED,
        address: { addressType: "self-pickup", city: "Київ" } as never,
        branchId: BRANCH,
      }),
    /latitude and longitude/,
  );
  assert.ok(!made(stub).includes(CREATE), "a cart was opened without a place to put it");
});

test("a destination change carrying its own slot does not repair the slot it is leaving", async () => {
  const stub = session({ carts: [cart({ timeslot: PAST }), cart({ timeslot: OFFERED })] });

  await open(stub).setup({
    deliveryType: "SelfPickup",
    timeslot: OFFERED,
    branchId: ELSEWHERE,
    shipments: [{ companyId: COMPANY, branchId: ELSEWHERE }],
  });

  assert.deepEqual(made(stub), [MINE, READ, WRITE, READ]);
  assert.equal(writes(stub).length, 1, "the branch being left had its slot repaired first");
  assert.ok(!made(stub).includes(SLOTS), "a slot was sought for a cart that brought its own");
});

test("a setting change onto a lapsed cart carries the replacement slot in its own write", async () => {
  const stub = session({ carts: [cart({ timeslot: PAST }), cart({ timeslot: OFFERED })] });

  await open(stub).setup({ promoCode: "SPRING" });

  assert.equal(writes(stub).length, 1, "the repair was spent on a write of its own");

  const write = writes(stub)[0];

  assert.deepEqual(write?.args.timeslot, OFFERED, "the write carried the slot that had lapsed");
  assert.equal(write?.args.promoCode, "SPRING", "the change the caller asked for was left behind");
});

test("the replacement slot is sought at the branch the cart is moving to", async () => {
  const stub = session({ carts: [cart({ timeslot: PAST }), cart({})] });

  await open(stub).setup({
    branchId: ELSEWHERE,
    shipments: [{ companyId: COMPANY, branchId: ELSEWHERE }],
  });

  assert.equal(
    wrote(stub, SLOTS)?.args.branchId,
    ELSEWHERE,
    "the slot was sought at the branch the cart was leaving",
  );
});

test("a healthy cart is set up without a slot listing being read", async () => {
  const stub = session({});

  await open(stub).setup({ promoCode: "SPRING" });

  assert.deepEqual(made(stub), [MINE, READ, WRITE, READ]);
  assert.deepEqual(writes(stub)[0]?.args.timeslot, FUTURE);
});

test("a repair the server refused is named by the write it blocks", async () => {
  const stub = session({
    carts: [cart({ timeslot: PAST })],
    refuseWrite: "Rate limit exceeded. Please wait and try again.",
  });

  await assert.rejects(() => open(stub).addProducts([PRODUCT]), /Rate limit exceeded/);
});

test("a repair the server refused is not reported as a branch with no slot left", async () => {
  const stub = session({
    carts: [cart({ timeslot: PAST })],
    refuseWrite: "Rate limit exceeded. Please wait and try again.",
  });

  await assert.rejects(
    () => open(stub).addProducts([PRODUCT]),
    (error: Error) =>
      !/no slot at the branch is available/.test(error.message) &&
      !/offers no available time slot/.test(error.message),
  );
});

test("a repair the server refused still serves the read", async () => {
  const stub = session({
    carts: [cart({ timeslot: PAST })],
    refuseWrite: "Rate limit exceeded. Please wait and try again.",
  });

  const held = await open(stub).current();

  assert.deepEqual(held.cart.timeslot, PAST, "a cart that could not be repaired stopped being read");
});

test("a branch with no slot to give is refused as a branch with no slot", async () => {
  const stub = session({
    carts: [cart({ timeslot: PAST })],
    slots: [{ ...OFFERED, available: false }],
  });

  await assert.rejects(() => open(stub).addProducts([PRODUCT]), /no available time slot/);
});

test("a repair that failed once is not blamed for a cart that later cannot be repaired at all", async () => {
  const stub = session({
    carts: [cart({ timeslot: PAST })],
    slotRounds: [[{ ...OFFERED, available: true }], [{ ...OFFERED, available: false }]],
    refuseWrite: "Rate limit exceeded. Please wait and try again.",
    refuseTimes: 1,
  });
  const cart_ = open(stub);

  await cart_.current();

  await assert.rejects(
    () => cart_.addProducts([PRODUCT]),
    /no available time slot/,
    "the reason of an earlier repair outlived the read that recorded it",
  );
});
