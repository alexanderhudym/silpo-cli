## 1. Layout

- [x] 1.1 Add `src/render/layout.ts` rendering an object: `key=value` pairs, two-space separator, greedy packing to 90 columns including indentation, pairs ordered by rendered length ascending, nulls and empty arrays dropped, scalar arrays joined by commas, nested objects and lists after the scalars under a bare key line, two-space indent steps, no tabs
- [x] 1.2 Extend it to lists: `#N` markers padded to the widest marker in the list, item bodies aligned past the marker, one field order per list computed from the longest rendered pair per key, one empty line between items, no trailing whitespace on any line
- [x] 1.3 Add the `common` section: strict intersection over items, recursion through nested objects present in every item, no recursion through nested lists, `common` header line, items keep only their remainder, bare markers when every field is shared
- [x] 1.4 Unit tests for 1.1–1.3 covering the width boundary, a pair wider than the line, single-item lists, a field null in one item only, a nested object missing from one item, and the all-shared case

## 2. Alias registry

- [x] 2.1 Add `src/render/aliases.ts` with one constant per entity (entity plus canonical field) for `branch`, `company`, `product`, `cart`, `shipment`, `address`, `category`, `order`, `profile`, `child`, `pet`, `npSettlement`, `npOffice`, `premiumFeature`, `premiumSubscription`, `promoCode`, `polygon`
- [x] 2.2 Add the field-name table (`branchId`, `companyId`, `productId`, `parentId`, `profileId`, `orderId`, `subscriptionId`, `polygonId`, `shoppingCartId`) and the per-node entity used to resolve a bare `id`
- [x] 2.3 Define the resolver interface `(constant, uuid) => handle`, a sqlite-backed implementation over `ensureAlias`, and an in-memory one for tests
- [x] 2.4 Wire the resolver into the layout: a uuid-shaped value under a known field prints as its handle, anything else prints unchanged
- [x] 2.5 Move the value mappers out of `src/render/mappers.ts` into `src/render/values.ts`, dropping `aliasMapper` in favour of the resolver
- [x] 2.6 Tests: same uuid under `productId` and `id` yields one handle, company ids are recorded under `company`, an unknown field leaves the uuid alone, numeric ids are untouched

## 3. Aliases on the way in

- [x] 3.1 Change `fromAlias` in `src/commands/options.ts` to take a registry constant instead of an entity and a field, and update its call sites
- [x] 3.2 Add alias expansion for JSON arguments: walk the parsed structure at any depth and replace an alias with its uuid when its key maps to a constant, leaving other strings alone
- [x] 3.3 Apply the expansion to `--products`, `--actions`, `--address`, `--shipments`, `--add`, `--remove`, and to every scalar option or positional argument that carries a uuid (`--branch-id`, `--company-id`, `--product-id`, `--parent-id`, cart ids)
- [x] 3.4 Fail with the entity named when a handle resolves to nothing
- [x] 3.5 Tests over `test/input.test.ts` and `test/options.test.ts` for a nested alias inside a JSON array, an alias-looking string under a non-id field, and an unresolvable handle

## 4. Golden test harness

- [x] 4.1 Add a fixture-driven test that renders every `test/fixtures/<command>.<sub>.json` with the in-memory resolver and compares against `test/expected/<command>.<sub>.txt`
- [x] 4.2 Fixtures for each command converted below, including at least one list that hoists shared fields and one that does not — `cart.details`, `orders.offline` and `products.batch` are live captures; `branches`, `catalog`, `delivery`, `loyalty`, `np` and `profile` were written from `src/mcp/entities` and the recorded contracts, since capturing them needs an authorized session. Re-capture with `silpo raw` when one is at hand
- [x] 4.3 Delete `test/summary.test.ts` and `test/pagination.test.ts`

## 5. Command renderers

Each task adds `src/render/commands/<name>.ts` exporting one function per subcommand, switches the command file to it, and lands the fixture and expected text.

- [x] 5.1 `branches` — exercises the registry (branch and company ids) and drops the summary and pagination blocks
- [x] 5.2 `delivery` — `address`, `types`, `slots`
- [x] 5.3 `profile` — `profile`, `addresses`, `family`, `restrictions`; keeps `--with-id`, which `user-account` still requires
- [x] 5.4 `np` — `settlements`, `offices`
- [x] 5.5 `products` — `search`, `batch`, `details`, `similar`, `replacements`, `favorites`, `favorites-update`
- [x] 5.6 `catalog` — `categories`, `tree`, `category`, `popular`, `promotions`, `sets`
- [x] 5.7 `cart` — `id`, `details`, `add`, `remove`, `clear`, `update`, `certificates`
- [x] 5.8 `orders` — `online`, `offline`
- [x] 5.9 `loyalty` — `loyalty`, `coupons`, `coupon`, `promos`, `promo-codes`, `certificates`, `premium`

## 6. Cleanup

- [x] 6.1 Delete `src/render/summary.ts` and `src/render/pagination.ts` once no command imports them
- [x] 6.2 Confirm `pairs.ts`, `table.ts`, `json.ts`, and `text.ts` are imported only by `auth`, `config`, `server`, `gain`, and `aliases`
- [x] 6.3 Document the one-time `silpo aliases clear` in the README, with why old handles are invalid
- [x] 6.4 Run the suite and record the before-and-after token counts for the three existing fixtures in the change notes
