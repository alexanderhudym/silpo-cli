## 1. Tables

- [x] 1.1 Add `carts`, `orders`, `addresses`, `np_settlements` to the schema, each `id` plus `remote_id`
- [x] 1.2 Add `np_offices` to the schema with `id`, `remote_id`, `latitude`, `longitude`, `title`, `address`, `type`, `number`, and no status column
- [x] 1.3 Split `src/db/stores.ts` into `src/db/branches.ts` and `src/db/companies.ts`, each holding its own upsert and lookups, and update every importer
- [x] 1.4 Add `src/db/carts.ts`, `src/db/orders.ts`, `src/db/addresses.ts`, `src/db/np-settlements.ts`, `src/db/np-offices.ts` following the shape of `categories.ts`

## 2. One entity at a time, printing and resolution together

Each step keeps the CLI coherent: an entity starts printing its local number in the same step
that teaches every argument to read one, so no printed value is unusable in between.

- [x] 2.1 Split `src/commands/store.ts` into `branch.ts` and `company.ts`, each owning its own unmemoized branch-listing sweep
- [x] 2.2 Rename `src/commands/cart.ts` to `carts.ts` and update the import in `cli.ts`, freeing the singular name
- [x] 2.3 Add `src/commands/cart.ts`: record carts while printing, resolve a cart from a local number or uuid, fail without looking anything up; switch every `--cart-id` and cart argument off `readAlias`
- [x] 2.4 Add `src/commands/np-settlement.ts`: record settlements while printing, resolve one for `np offices --settlement-id`
- [x] 2.5 Add `src/commands/np-office.ts`: record offices with their address-building fields while printing, resolve one from a local number or uuid
- [x] 2.6 Record online orders in `orders.ts` and print the local number in place of the alias, keeping the receipt number under its own key
- [x] 2.7 Record saved addresses in `profile.ts` and print the local number in place of the alias

## 3. Resolution moves into the commands

- [x] 3.1 Add the `officeId` the server returns to `CartAddress` in `src/mcp/entities/cart.ts`
- [x] 3.2 Rewrite `cart add --products` to parse the array and build `CartProductInput[]` field by field, resolving distinct branches and companies first and the products after them, concurrently
- [x] 3.3 Rewrite `cart remove --products` and `products favorites --actions` the same way
- [x] 3.4 Rewrite `cart update --shipments` to build `CartShipmentRef[]` explicitly
- [x] 3.5 Rewrite `cart update --address` to resolve `officeId` when present and pass every other field through untouched
- [x] 3.6 Delete `expandIds`, `branchWithin`, `IdField`, `IdFields` and the `fields` parameter of `readJsonArray`, `readJsonObject` and `readTimeslot`; drop `CART_PRODUCT_IDS`, `SHIPMENT_IDS`, `ADDRESS_IDS`, `PRODUCT_IDS`, `FAVORITE_IDS`

## 4. Failures report themselves in one place

- [x] 4.1 Change every resolver to throw instead of taking a `Command`, and delete `fail` from `options.ts`
- [x] 4.2 Add the `error: ` prefix to the handler around `parseAsync` in `cli.ts`
- [x] 4.3 Confirm an unresolvable entity prints one line and exits 1, with no usage hint

## 5. Removal

- [x] 5.1 Delete `src/db/aliases.ts`, `src/db/wordlist.ts`, `src/utils/alias.ts`, `src/commands/aliases.ts`
- [x] 5.2 Drop the `aliases` table from the schema and `registerAliasCommands` from `cli.ts`
- [x] 5.3 Delete `test/alias.test.ts` and `test/aliases.test.ts`
- [x] 5.4 Confirm nothing imports the removed modules and the build is clean

## 6. Tests

- [x] 6.1 Rewrite `test/options.test.ts`, which used aliases as its fixture for every id-bearing field
- [x] 6.2 Cover each new table: a number is issued once, stays stable, and each entity numbers from its own sequence
- [x] 6.3 Cover resolution: a local number resolves, a uuid passes through, an unissued number fails naming its entity, and text beginning with `@` carries no meaning
- [x] 6.4 Cover the rewritten JSON arguments, including an office named by local number inside a cart address

## 7. Documentation

- [x] 7.1 Replace the alias section of `README.md` with how local numbers work
- [x] 7.2 Check the remaining documentation for alias claims that no longer hold

## 8. Verification against the live server

- [x] 8.1 Set a cart to Nova Poshta naming the office by its local number and confirm the snapshot reports no `delivery.nova_poshta.office.not_found`
- [x] 8.2 Run the offline receipt listing and confirm every catalogue product still prints a product number
