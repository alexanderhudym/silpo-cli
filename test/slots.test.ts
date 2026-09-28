import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  BRANCH,
  clearToolCalls,
  fails,
  fixture,
  render,
  run,
  setPayload,
  startDaemon,
  stopDaemon,
  toolCalls,
} from "./harness.ts";

const SLOTS = ["slots", "--branch", BRANCH];

before(startDaemon);
after(stopDaemon);

test("a slot shows its window as local wall clock time and only the raised constraints", async () => {
  const text = await render("delivery.slots", SLOTS);
  const slots = text.split("\n\n").slice(1);

  assert.ok(slots[0]?.startsWith("2026-08-21 09:00 - 2026-08-21 09:30\n"), slots[0]);
  assert.ok(!text.includes("2026-08-21T06:00"), "a raw instant survived");
  assert.ok(slots[0]?.includes("limited: cookedFood, ownCooking"), "the constraints were dropped");
  assert.ok(!slots[2]?.includes("limited"), "a slot with no constraint carries a constraint line");
  assert.ok(!text.includes("isLimited"), "a flag name survived");
});

test("an invalid delivery type fails naming the accepted set, and no tool is called", async () => {
  clearToolCalls();

  const message = await fails([...SLOTS, "--type", "pickup"]);

  assert.match(message, /expected one of Unknown, SelfPickup, DeliveryHome/);
  assert.equal(toolCalls().length, 0);
});

function slotCount(text: string): number {
  return text.trimEnd().split("\n\n").length - 1;
}

test("a window spanning a whole local day is applied here rather than sent", async () => {
  setPayload(fixture("delivery.slots"));
  clearToolCalls();

  const text = await run([...SLOTS, "--start", "2026-08-21 00:00", "--end", "2026-08-21 23:59"]);

  assert.equal(slotCount(text), 3, "the day the server answers for came back empty");
  assert.equal(toolCalls().length, 1, "the bounds cost a second call within the horizon");
  assert.equal(toolCalls()[0]?.arguments.start, undefined, "the window was sent to the server");
  assert.equal(toolCalls()[0]?.arguments.end, undefined, "the window was sent to the server");
});

test("--start and --end accept today and tomorrow, not only a local or zoned instant", async () => {
  setPayload(fixture("delivery.slots"));

  const text = await run([...SLOTS, "--start", "today", "--end", "tomorrow"]);

  assert.match(text, /^Found \d+ time slots/);
});

test("a --start naming none of the three accepted forms fails naming all three", async () => {
  const message = await fails([...SLOTS, "--start", "not-a-time"]);

  assert.match(message, /expected today, tomorrow, a date, or a date and a time/);
});

test("a window narrower than the day keeps only the slots inside it, and counts them", async () => {
  setPayload(fixture("delivery.slots"));

  const text = await run([...SLOTS, "--start", "2026-08-21 09:15", "--end", "2026-08-21 10:00"]);

  assert.equal(text.split("\n")[0], "Found 1 time slots (1 available)");
  assert.ok(text.includes("2026-08-21 09:30 - 2026-08-21 10:00"), text);
});

test("the cap applies to what the window kept, not to what the server sent", async () => {
  setPayload(fixture("delivery.slots"));
  clearToolCalls();

  const text = await run([...SLOTS, "--start", "2026-08-21 00:00", "--limit", "1"]);

  assert.equal(slotCount(text), 1);
  assert.equal(toolCalls()[0]?.arguments.limit, undefined, "the cap was sent before the window");
});

test("a window reaching past what the server offers unasked is forwarded", async () => {
  setPayload(fixture("delivery.slots"));
  clearToolCalls();

  const text = await run([...SLOTS, "--start", "2026-09-30 00:00"]);
  const [first, second] = toolCalls();

  assert.equal(first?.arguments.start, undefined, "the first call did not ask for the horizon");
  assert.equal(second?.arguments.start, "2026-09-29T21:00:00+00:00");
  assert.equal(text, "Found 0 time slots (0 available)\n");
});

test("a branch named positionally is not read as the branch", async () => {
  setPayload(fixture("delivery.slots"));
  clearToolCalls();

  assert.match(await fails(["slots", "--branch", BRANCH, BRANCH]), /too many arguments/);
  assert.deepEqual(toolCalls(), []);
});

test("the branch option is absent, and the cart's own branch is used instead", async () => {
  setPayload(fixture("delivery.slots"));
  clearToolCalls();

  await run(["slots"]);

  assert.equal(toolCalls()[0]?.arguments.branchId, BRANCH);
});

test("a slot names its cost tiers through the shared conversion", async () => {
  const text = await render("delivery.slots", SLOTS);

  assert.ok(text.includes("tiers: 69 from 1299, 1 from 1899"), "the tiers were dropped");
  assert.ok(!text.includes("fromOrderCost"), "the payload's field name survived");
});

test("a slot says whether it is available as a value of its own", async () => {
  setPayload({
    success: true,
    summary: "Found 1 time slots (0 available)",
    slots: [
      {
        start: "2026-08-21T06:00:00+00:00",
        end: "2026-08-21T06:30:00+00:00",
        available: false,
        deliveryType: "SelfPickup",
        deliveryCost: null,
        deliveryCostMap: [],
        minOrderCost: 199,
        maxWeight: null,
        constraints: {
          isLimitedAlcohol: false,
          isLimitedTobacco: false,
          isLimitedCookedFood: false,
          isLimitedOwnCooking: false,
        },
        fast: null,
      },
    ],
    meta: { total: 1 },
  });

  assert.equal(
    await run(SLOTS),
    "Found 1 time slots (0 available)\n\n2026-08-21 09:00 - 2026-08-21 09:30\ntype: SelfPickup\navailable: no\nminOrder: 199\n",
  );
});

test("no slots command prints whether the call succeeded", async () => {
  assert.ok(!(await render("delivery.slots", SLOTS)).includes("success"));
});
