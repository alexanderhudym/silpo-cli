## Why

A branch is the most typed identifier in the CLI: eight commands require `--branch-id`, the
slot listing takes one positionally, and every cart mutation names a branch and a company on
each item. All of them take an alias, and an alias is a value you copy — `@estado` is not
something a person retypes from memory or an agent carries in its head. A local number is.
Categories already work this way; branches and companies are the two entities left where the
same argument is passed most often.

This is not a token change. Measured against the live listing of 455 branches, replacing the
aliases with local numbers costs **8 tokens more**, because `@estado` and `1` both tokenize
to nothing next to the `id: ` that precedes them. The one saving in this change comes from
somewhere else: the store listing prints the city and the street on two lines, and folding
them into one address through the shared conversion takes the listing from 24 876 to 23 990
tokens.

## What Changes

- New `branches` and `companies` tables, each holding a local autoincrement id and the remote
  uuid, which is unique and without which a row cannot exist. Two tables rather than one keyed
  by entity, so that a further identifier for either entity is a column rather than a
  discriminated blob.
- Every payload that names a branch or a company records it as it is rendered — the store
  listing, the cart's shipments, the delivery type lookup, and the company a product listing
  or a product card names.
- Every option and JSON field that takes a branch or a company accepts the local number or the
  remote uuid: digits are looked up in the table, a uuid is passed through as typed, and
  anything else fails the command.
- A local number matching no row makes the CLI list the branches itself, paging until the
  reported total, record every branch and every company that answer names, and retry the
  lookup. A number still matching nothing fails the command. The listing is never printed, so
  filling the tables this way costs the caller nothing, where reaching the same numbers
  through `silpo branches` costs about 24 000 tokens.
- **BREAKING** `branch` and `company` are removed from the alias entities. Every command that
  prints either one prints the local number, and `@`-handles no longer resolve for a branch or
  a company argument.
- **BREAKING** The store listing prints the city and the street address as one `address` value
  through the shared address conversion, rather than as a `city` line and an `address` line.
- The store's external number is untouched: it stays an output field and does not become an
  input form, so digits on the command line mean the local number and nothing else.
- The store listing keeps printing the company, because it is the only place the pairing of a
  branch with its company is visible and the cart requires a company on input.

## Capabilities

### New Capabilities

- `store-identifiers`: how a branch and a company are named on the command line — the two id
  tables, the two accepted input forms, the listing the CLI fetches for itself when a number
  resolves to nothing, and the failure when nothing resolves.

### Modified Capabilities

- `stores-and-delivery`: the store listing records local numbers rather than handles and
  prints one address value instead of a city and a street; the delivery output and the slot
  listing name a branch by its local number.
- `shopping-cart`: a shipment prints the local numbers of its company and branch, and the JSON
  arguments that name a company and a branch take local numbers.
- `product-search`: the company printed above a product listing and on a product card is a
  local number. The branch and company options themselves are governed by `command-input` and
  `store-identifiers`, which is where the input forms are stated.
- `command-input`: branch and company leave the entities whose options accept an alias, so a
  JSON argument may now carry an alias under one field and a local number under another.
- `id-aliases`: branch and company leave the fixed set of aliased entities, which the
  requirements name directly in three of their scenarios.
- `output-rendering`: an identifier a tool consumes is printed as its entity's alias or as its
  entity's local number, depending on which the entity is named by.

## Impact

- `src/db/`: two new tables in the schema, a new module beside `categories.ts`.
- `src/utils/alias.ts`: `ALIASES.branch` and `ALIASES.company` removed.
- `src/commands/branches.ts`: the render loses its handles and merges two fields into one.
- `src/commands/cart.ts`, `delivery.ts`, `products.ts`, `orders.ts`: every branch and company
  argument and every branch and company printed.
- `src/commands/options.ts`: the JSON alias expansion learns a second kind of field, since a
  cart item now carries a product alias beside a numeric branch and company.
- Existing `branch` and `company` rows in the alias table become dead. The database is
  disposable, so they are left in place rather than migrated.
- Fixtures and golden tests covering the store listing, the cart, the delivery output and the
  product listings are rewritten.
