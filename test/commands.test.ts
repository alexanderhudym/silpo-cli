import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import {
  clearToolCalls,
  fixture,
  run,
  setPayload,
  setPayloads,
  startDaemon,
  stopDaemon,
  toolCalls,
} from "./harness.ts";

before(startDaemon);
after(stopDaemon);

const BRANCH = "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468";
const PRODUCT = "1f18a0dd-a1ff-6b16-936b-993049b0fabd";
const SLUG = "test-product-1034354";

const OFFLINE_TOOL = "silpo_get_my_offline_orders";
const SLOTS_TOOL = "silpo_get_time_slots";
const FAVORITES_TOOL = "silpo_add_or_update_favorite_products";

function toolCall(name: string) {
  return toolCalls().find((call) => call.name === name);
}

test("converts the values a tool wants typed, and sends the identifiers as given", async () => {
  clearToolCalls();

  setPayloads({ [OFFLINE_TOOL]: fixture("orders.offline") });
  await run(["me", "orders", "--offline", "--limit", "1"]);

  setPayload({ success: true, summary: "Found 0 time slots (0 available)", slots: [] });
  await run(["slots", "--branch", BRANCH]);

  setPayload({
    success: true,
    summary: "Favorites updated",
    actions: [],
    product: { id: PRODUCT, slug: SLUG },
  });
  await run(["products", "favorite", SLUG]);

  const offline = toolCall(OFFLINE_TOOL);
  const slots = toolCall(SLOTS_TOOL);
  const favorites = toolCall(FAVORITES_TOOL);

  assert.equal(offline?.arguments.branchId, BRANCH, "the branch was not sent as given");
  assert.equal(offline?.arguments.timeslotStart, "2026-08-17T06:00:00+00:00");
  assert.equal(offline?.arguments.limit, 1);
  assert.equal(slots?.arguments.branchId, BRANCH, "the branch was not sent as given");
  assert.deepEqual(favorites?.arguments.actions, [
    { productId: PRODUCT, externalProductId: 1034354, toDelete: false },
  ]);
});
