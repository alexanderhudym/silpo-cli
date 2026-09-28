import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import {
  pagedOrdersFixture,
  render,
  renderFailing,
  renderTools,
  renderToolsFailing,
  startDaemon,
  stopDaemon,
  type FixtureNames,
} from "./harness.ts";

const expected = join(dirname(fileURLToPath(import.meta.url)), "expected");

const BRANCH = "1ee15e2a-7c41-6b83-9d52-4b7d0e93c468";

const CARD = "krevetka-varena-80-100-880804";
const CART_READ = { silpo_get_shopping_cart_by_id: "cart.details" } as const;

const SHRIMP = "1edb8c52-3b12-6e62-87a9-39a07e017bad";

const COMMANDS: Readonly<Record<string, readonly string[]>> = {
  "stores.branches": ["stores", "--limit", "3"],
  "stores.one": ["stores", "1ed43e73-051b-6842-a111-a5ad042eb496"],
  "cart.details": ["cart", "details"],
  "cart.stale": ["cart", "details"],
  "cart.set": ["cart", "set", SHRIMP, "1.7"],
  "cart.remove": ["cart", "remove", SHRIMP],
  "cart.clear": ["cart", "clear"],
  "cart.setup": ["cart", "setup", "--delivery-type", "SelfPickup", "--feedback-changes", "approvedChanges"],
  "cart.certificate-add": ["cart", "certificate", "add", "9990001234567"],
  slots: ["slots", "--branch", BRANCH],
  "np.settlements": ["np", "Ірпінь"],
  "np.offices": ["np", "Ірпінь", "--office", "Соборна"],
  "me.orders": ["me", "orders"],
  "me.orders-offline": ["me", "orders", "--offline"],
  "me.me": ["me"],
  "me.addresses": ["me", "addresses"],
  "me.family": ["me", "family"],
  "me.restrictions": ["me", "restrictions"],
  "me.coupons": ["me", "coupons"],
  "me.coupon": ["me", "coupon", "4471203"],
  "me.promos": ["me", "promos"],
  "me.certificates": ["me", "certificates"],
  "product.card": ["products", "card", CARD],
  "favorite.add": ["products", "favorite", "880804"],
  "catalog.whole": ["catalog"],
};

const FAILING = new Set(["cart.certificate-add"]);

const MANY_CALLS: Readonly<Record<string, FixtureNames>> = {
  "stores.branches": {
    silpo_list_branches: "branches.branches",
    silpo_get_my_offline_orders: pagedOrdersFixture("orders.offline"),
    silpo_get_my_delivery_addresses: "profile.addresses",
  },
  "stores.one": {
    silpo_list_branches: "branches.branches",
    silpo_get_my_offline_orders: pagedOrdersFixture("orders.offline"),
  },
  "cart.set": { silpo_add_or_update_cart_products: "cart.add", ...CART_READ },
  "cart.remove": { silpo_remove_cart_products: "cart.remove", ...CART_READ },
  "cart.clear": { silpo_clear_shopping_cart: "cart.clear", ...CART_READ },
  "cart.setup": { silpo_update_shopping_cart: "cart.setup", ...CART_READ },
  "cart.certificate-add": {
    silpo_add_or_update_certificates: "cart.certificates",
    ...CART_READ,
  },
  slots: { silpo_get_time_slots: "delivery.slots" },
  "np.offices": {
    silpo_find_nova_poshta_settlements: "np.settlements",
    silpo_find_nova_poshta_offices: "np.offices",
  },
  "me.orders": { silpo_get_my_online_orders: "orders.online" },
  "me.orders-offline": { silpo_get_my_offline_orders: "orders.offline", ...CART_READ },
  "me.me": {
    silpo_get_my_profile: "profile.profile",
    silpo_get_loyalty_info: "loyalty.loyalty",
    silpo_get_my_premium_subscription: "loyalty.premium",
  },
  "me.addresses": { silpo_get_my_delivery_addresses: "profile.addresses" },
  "me.family": { silpo_get_my_family: "profile.family" },
  "me.restrictions": { silpo_get_my_food_restrictions: "profile.restrictions" },
  "me.coupons": { silpo_get_my_coupons: "loyalty.coupons" },
  "me.coupon": { silpo_get_coupon_details: "loyalty.coupon" },
  "me.promos": { silpo_get_my_promos: "loyalty.promos", silpo_get_promo_codes: "loyalty.promo-codes" },
  "me.certificates": { silpo_get_my_certificates: "loyalty.certificates" },
  "product.card": { silpo_get_product_details: "products.details" },
  "favorite.add": {
    silpo_get_product_details: "products.details",
    silpo_add_or_update_favorite_products: "products.favorites-update",
  },
  "catalog.whole": {
    silpo_get_categories: "categories.nested-list",
    silpo_get_categories_tree: "categories.nested-tree",
    silpo_get_promotions: "promotions",
    silpo_get_product_sets: "sets",
    silpo_get_popular_categories: "categories.nested-popular",
  },
};

before(startDaemon);
after(stopDaemon);

for (const [name, args] of Object.entries(COMMANDS)) {
  test(`renders ${name} as its golden text`, async () => {
    const byTool = MANY_CALLS[name];
    const text = byTool
      ? await (FAILING.has(name) ? renderToolsFailing : renderTools)(byTool, args)
      : await (FAILING.has(name) ? renderFailing : render)(name, args);
    const golden = join(expected, `${name}.txt`);

    if (process.env.UPDATE_GOLDEN === "1") {
      mkdirSync(expected, { recursive: true });
      writeFileSync(golden, text);
    }

    assert.equal(text, readFileSync(golden, "utf8"));

    for (const line of text.split("\n")) {
      assert.equal(line, line.trimEnd(), "a line carries trailing whitespace");
      assert.ok(!line.includes("\t"), "a line carries a tab");
    }
  });
}
