## Why

A product is the only entity the CLI prints in bulk that still costs three identifiers to
name. Every record of every listing carries an alias, a slug and an external product id,
because the tools behind the commands each want a different one of the three. A hundred
products render at 6 861 tokens; the same hundred with one local number in place of all three
render at 4 151. The slug alone is 2 096 of those tokens, and nothing in it is anything the
caller acts on — it is a machine handle the caller pastes back verbatim.

A local number carries all three, so the record can stop printing any of them. That is where
the saving is: the number itself is a wash against the alias it replaces, exactly as it was
for branches.

## What Changes

- A `products` table records every product the CLI prints, holding a local number, the
  server's uuid, the slug where a payload gave one, and the external product id where a
  payload gave one. The slug and the external id are nullable; the uuid is not.
- Every option and positional argument that names a product accepts the local number, the
  uuid, or the slug, and resolves it to whichever of the three the tool being called requires.
  **BREAKING**: `products details` and `products similar` take a product reference where they
  took a slug, and `products replacements` and `cart` options take a local number where they
  took an alias.
- **BREAKING**: `products favorites-update` derives `externalProductId` from the record
  instead of requiring the caller to pass it. The JSON argument keeps `productId` and
  `toDelete`.
- **BREAKING**: the product record drops its `slug` and `externalId` rows. Product listings,
  the product card, cart contents, replacements and both order histories print the local
  number where they printed an alias.
- The product leaves the alias entity set, as the branch and the company did.
- A receipt line the server returns without a catalogue entry has its article code looked up so
  that it too prints a local number. Only a line whose product no longer exists at all prints
  without an identifier, as it does today.

## Capabilities

### New Capabilities

- `product-identifiers`: what the CLI records for a product, the three forms an argument may
  name one by, the order in which a missing identifier is resolved, and when an unresolved
  product fails the command.

### Modified Capabilities

- `product-search`: the product record no longer prints a slug or an external product id; the
  card and the alternatives take a product reference rather than a slug; the favorites update
  no longer takes an external product id from the caller; groups and confirmations name a
  product by its local number.
- `id-aliases`: the product is no longer an aliased entity.
- `command-input`: an argument that takes a product is read under the forms a product is named
  by, and the alias marker carries no meaning there.
- `shopping-cart`: a cart product is named by its local number.
- `user-account`: an order line and a receipt line name their product by its local number,
  a receipt line with no catalogue entry being resolved by its article code first.

## Impact

- `src/db/database.ts` gains the `products` table; a new `src/db/products.ts` holds the upsert
  and the lookups, alongside `categories.ts` and `stores.ts`.
- A new `src/commands/product.ts` holds the resolution, mirroring `src/commands/category.ts`
  and `src/commands/store.ts`.
- `src/commands/products.ts`, `cart.ts` and `orders.ts` stop calling `toAlias` for a product.
- `src/utils/alias.ts` drops the `product` entity.
- Resolution can reach the product card tool as its last step, filling the delivery context it
  demands with values the server does not read. `design.md` states the conditions under which it
  fires and why the alternatives were rejected. Nothing leaves the MCP surface.
- Recorded fixtures and golden outputs change wherever a product is printed.
