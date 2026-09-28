## 1. Unblock the tool path

- [x] 1.1 Fix `src/mcp/session.ts` to read `structuredContent` instead of `structuredOutput`, and confirm against the live server that a tool call now returns a payload
- [x] 1.2 Commit the `tools/list` snapshot and record in it, or beside it, the server version and capture date it came from

## 2. Slice 1 — branches, the shape test

- [x] 2.1 Write `src/mcp/entities/meta.ts` with `PageMeta` and `TotalMeta`
- [x] 2.2 Write `src/mcp/entities/branch.ts` with `Branch`
- [x] 2.3 Write `src/mcp/tools/list-branches.ts` with `ListBranchesArgs`, `ListBranchesResult`, and `listBranches(args?)`
- [x] 2.4 Add `src/mcp/silpo.ts` re-exporting the tool modules
- [x] 2.5 Constrain `Column` in `src/render/table.ts` to `keyof` its row entity and update `renderTable` to take typed rows
- [x] 2.6 Migrate `src/commands/branches.ts` to `silpo.listBranches`, dropping its `getArrayFromJsonObject` / `getObjectFromJsonObject` / `getStringFromJsonObject` use and correcting the `summary === undefined` guard
- [x] 2.7 Run `silpo branches` against the live server and confirm output matches the pre-migration output
- [x] 2.8 Review the layout before continuing: file-per-tool, re-export facade, `Omit` of the success marker, typed columns — change the plan here if any of them fights the code

## 3. Slice 2 — products

- [x] 3.1 Write `src/mcp/entities/product.ts` with `Product`, `SpecialPrice`, `ProductDetails`, `ProductLite`
- [x] 3.2 Write `src/mcp/entities/replacement.ts` with `ReplacementGroup`, keeping its `ProductLite` distinct from the offline-order variant
- [x] 3.3 Write the seven tool files: `get-products`, `find-products-batch`, `get-product-details`, `get-similar-products`, `get-replacements`, `get-my-favorites`, `add-or-update-favorite-products`
- [x] 3.4 Add `DeliveryType` to `src/mcp/entities/delivery.ts` as the 14-value union used by these tools
- [x] 3.5 Migrate `src/commands/products.ts` to the typed calls
- [x] 3.6 Exercise each of the seven commands against the live server

## 4. Slice 3 — profile

- [x] 4.1 Write `src/mcp/entities/profile.ts` with `Profile`
- [x] 4.2 Write `src/mcp/entities/address.ts` with `SavedAddress`
- [x] 4.3 Write `src/mcp/entities/family.ts` with `Family`, `FamilyMember`, `Child`, `Pet`
- [x] 4.4 Write `src/mcp/entities/food-restriction.ts`
- [x] 4.5 Write the four tool files: `get-my-profile`, `get-my-delivery-addresses`, `get-my-family`, `get-my-food-restrictions`
- [x] 4.6 Migrate `src/commands/profile.ts` to the typed calls
- [x] 4.7 Exercise each of the four commands against the live server

## 5. Slice 4 — orders

- [x] 5.1 Write `src/mcp/entities/order.ts` with `OnlineOrder` and its delivery, time-slot, address, and product sub-shapes
- [x] 5.2 Extend `src/mcp/entities/order.ts` with `OfflineOrder` and its rewards, products, and `catalogProduct` sub-shapes, keeping `catalogProduct` separate from `ProductLite`
- [x] 5.3 Write the two tool files: `get-my-online-orders`, `get-my-offline-orders`
- [x] 5.4 Migrate `src/commands/orders.ts` to the typed calls
- [x] 5.5 Exercise both commands against the live server

## 6. Slice 5 — catalog

- [x] 6.1 Write `src/mcp/entities/category.ts` with the three projections: list item, popular item, and detail with `path`, `priceRange`, `children`
- [x] 6.2 Add `CategoryTreeNode` to `src/mcp/entities/category.ts` as a recursive type taken from the hand-written catalog contract, marked in place as documentation-sourced
- [x] 6.3 Write `src/mcp/entities/promotion.ts` and `src/mcp/entities/product-set.ts`
- [x] 6.4 Write the six tool files: `get-categories`, `get-categories-tree`, `get-category`, `get-popular-categories`, `get-promotions`, `get-product-sets`
- [x] 6.5 Migrate `src/commands/catalog.ts` to the typed calls
- [x] 6.6 Exercise each of the six commands against the live server

## 7. Slice 6 — delivery and Nova Poshta

- [x] 7.1 Extend `src/mcp/entities/delivery.ts` with `DeliveryOption` and `TimeSlotDeliveryType` as the 12-value union
- [x] 7.2 Write `src/mcp/entities/time-slot.ts`
- [x] 7.3 Extend `src/mcp/entities/address.ts` with `FoundAddress`
- [x] 7.4 Write `src/mcp/entities/nova-poshta.ts` with `NpSettlement` and `NpOffice`
- [x] 7.5 Write the five tool files: `find-address`, `get-available-delivery-types`, `get-time-slots`, `find-nova-poshta-settlements`, `find-nova-poshta-offices`
- [x] 7.6 Migrate `src/commands/delivery.ts` and `src/commands/np.ts` to the typed calls
- [x] 7.7 Exercise each of the five commands against the live server

## 8. Slice 7 — loyalty

- [x] 8.1 Write `src/mcp/entities/loyalty.ts` with `Loyalty`, `LoyaltyCard`, `LoyaltyBalance`, `LoyaltyAccount`
- [x] 8.2 Write `src/mcp/entities/coupon.ts` with `Coupon` and `CouponDetails`
- [x] 8.3 Write `src/mcp/entities/promo.ts` with `Promo` and `PromoCode`
- [x] 8.4 Write `src/mcp/entities/certificate.ts`
- [x] 8.5 Write `src/mcp/entities/premium.ts` with `PremiumSubscription` and `PremiumFeature`, keeping its flat envelope of optional top-level fields
- [x] 8.6 Write the seven tool files: `get-loyalty-info`, `get-my-coupons`, `get-coupon-details`, `get-my-promos`, `get-promo-codes`, `get-my-certificates`, `get-my-premium-subscription`
- [x] 8.7 Migrate `src/commands/loyalty.ts` to the typed calls
- [x] 8.8 Exercise each of the seven commands against the live server — six returned payloads; `loyalty coupon` reached the server but has no success path on this account, which holds zero coupons

## 9. Slice 8 — cart

- [x] 9.1 Write `src/mcp/entities/cart.ts` with `Cart` from the hand-written cart contract, marked in place as documentation-sourced because the schema declares it as an unconstrained object
- [x] 9.2 Add `CartAddress` from the recorded cart address argument, marked the same way, for the `update_shopping_cart` argument
- [x] 9.3 Add `CartLoyalty` from the schema, which does describe it
- [x] 9.4 Write the seven tool files: `get-my-shopping-cart`, `get-shopping-cart-by-id`, `add-or-update-cart-products`, `remove-cart-products`, `clear-shopping-cart`, `update-shopping-cart`, `add-or-update-certificates`
- [x] 9.5 Migrate `src/commands/cart.ts` to the typed calls
- [x] 9.6 Exercise each of the seven commands against the live server, including at least one write path — all five write paths ran and the cart was restored to its pre-run state

## 10. Close out

- [x] 10.1 Confirm all 39 tools have a typed call and `src/mcp/silpo.ts` re-exports every tool module — 39 tool files, 39 re-exports, no snapshot tool without a typed constant, no duplicate or dangling re-export
- [x] 10.2 Confirm `runTool`, `callTool`, and `silpo raw` are unchanged and still reach tools the snapshot does not describe — `src/daemon/client.ts` and `src/commands/raw.ts` are byte-identical to `HEAD`
- [x] 10.3 Audit remaining `src/json/getters.ts` callers and record which of them are still needed — no callers remain; recorded under Open Questions in `design.md`
- [x] 10.4 Run `npm test` and a full typecheck — typecheck clean (`HEAD` had two `Column` errors, now fixed); tests 87 pass / 7 fail, the same seven failures as `HEAD`, all asserting render features this repo has not implemented
- [x] 10.5 Take a fresh `tools/list` dump, diff it against the committed snapshot, and record any drift found during the migration — declaration identical (same `1.108.0`, all 39 tools unchanged); one undeclared field observed live, `silpo_get_category` → `category.path[].id`

## 11. Rework — definitions with the session, whole-response results

Sections 1–10 landed a typed layer whose call helper made `src/mcp/` depend on `src/daemon/`, and whose results dropped the success marker. This section moves the definitions to the right side of that dependency and makes results carry the whole response.

- [x] 11.1 Strip the runtime import from `src/mcp/tools/*.ts` so each file declares only its tool name, argument type, and result type
- [x] 11.2 Declare the surface as a mapped type over the 39 definitions, under `src/mcp/`
- [x] 11.3 Widen `ToolCallOutcome` in `src/daemon/protocol.ts` to carry the flattened text content alongside the structured payload, keeping the discriminated union so a non-error outcome still guarantees a payload
- [x] 11.4 Make `McpSession` implement the surface, typed by tool name, returning the whole response and making no judgement about the success marker
- [x] 11.5 Implement the same surface in `src/daemon/client.ts` over the socket, and delete the `runTool` wrapper helper under `src/mcp/`
- [x] 11.6 Remove `ToolFailureError` and stop stripping `success` in `runTool`, so the untyped path returns the payload unchanged
- [x] 11.7 Drop `Omit<…, "success">` from all 39 result types
- [x] 11.8 Point the 15 command files at the surface exported from the background-process layer
- [x] 11.9 Inspect `success` in the write commands that can report it, and leave the read commands alone — `exitOnFailure` in `src/commands/exit.ts`, applied to the six write commands, restores the exit code that removing `ToolFailureError` had dropped
- [x] 11.10 Assert no file under `src/mcp/` imports from `src/daemon/`
- [x] 11.11 Confirm the text content arrives on a successful call and is the only content on an errored one
- [x] 11.12 Re-exercise one read and one write command per slice against the live server, and confirm `"success": true` now appears in the JSON-printing commands — reads across all eight slices, all six write paths, cart restored to its pre-run state
- [x] 11.13 Run `npm test` and a full typecheck, and confirm the seven pre-existing failures are still the only ones

## 12. Naming and vocabulary — `content`, and the standard library

Section 11 named the unstructured half of the response `text` and left `src/json/` in place. This section renames the field after MCP's own and retires the JSON type module, keeping the one guard that earns its place.

- [x] 12.1 Rename `text` to `content` on `ToolCallOutcome`, `ToolResponse`, and the two `createSurface` callers, so one name follows a value from the wire to a command
- [x] 12.2 Cast the SDK's `unknown` `structuredContent` to a record in `src/mcp/session.ts` and keep failing when it is absent, replacing `asJsonValue` and `asJsonObject` — the server always sends an object and the SDK already validates it against an `outputSchema` that declares one, so absence is the only case worth checking
- [x] 12.3 Replace `JsonObject` with `Record<string, unknown>` across the render layer, the surface, the daemon client, the session, and `src/db/calls.ts`
- [x] 12.4 Replace `JsonValue` with `unknown` in `ValueMapper`, `renderSummary`, and the mapper helpers, and `JsonArray` with `unknown[]`
- [x] 12.5 Re-declare the free-form cart fields without the JSON aliases, keeping them as wide as the recorded contract says
- [x] 12.6 Delete `src/json/` and assert nothing under `src/` or `test/` references it
- [x] 12.7 Confirm the guards that keep `undefined` out of rendered output — `?? null` in `renderTable` and the explicit skip in `renderRows` hold, and `renderSummary` was found to be a third, unguarded entry point, so its parameter is narrowed to `string | null` instead
- [x] 12.8 Re-exercise a table command, a JSON-printing command, and a failing write against the live server, and confirm `silpo raw` still returns the payload unchanged
- [x] 12.9 Run `npm test` and a full typecheck, and confirm the seven pre-existing failures are still the only ones
